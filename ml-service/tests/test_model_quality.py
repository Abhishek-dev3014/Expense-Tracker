"""Independent quality gate run against the exact artifacts shipped in Docker."""
import json
import os
from pathlib import Path
import sys
import unittest

ROOT = Path(os.environ.get("FINTRACK_BUNDLE", Path(__file__).resolve().parents[1]))
sys.path[:0] = [str(ROOT), str(ROOT / "vendor")]
import joblib
from categorization import categorize
from text_processing import clean_text


class ModelQualityTests(unittest.TestCase):
    def test_independent_quality_and_abstention(self):
        artifacts = ROOT / "model_artifacts"
        metadata = json.loads((artifacts / "metadata.json").read_text())
        examples = json.loads((Path(__file__).parent / "fixtures/evaluation.json").read_text())
        texts = [text for samples in examples.values() for text in samples]
        expected = [label for label, samples in examples.items() for _ in samples]
        results = categorize(joblib.load(artifacts / "vectorizer.pkl"), joblib.load(artifacts / "model.pkl"), texts, metadata)
        correct = sum(result["predicted_category"] == label for result, label in zip(results, expected))
        self.assertGreaterEqual(correct / len(texts), 0.90)
        self.assertAlmostEqual(correct / len(texts), metadata["independent_curated_evaluation"]["accuracy"])
        for label, result in zip(expected, results):
            if label == "General":
                self.assertTrue(result["needs_review"])
                self.assertEqual(result["confidence"], 0)

    def test_normalization_keeps_merchant_words_and_handles_bank_noise(self):
        self.assertEqual(clean_text("UPI/UBER@paytm/123456789"), "uber")
        self.assertEqual(clean_text("POS refuel at terminal"), "refuel at terminal")
        self.assertEqual(clean_text("1mg and Zee5"), "1mg and zee5")
        for text in ("chai at canteen", "SwiggyInstamart", "doodh and sabzi"):
            self.assertEqual(clean_text(clean_text(text)), clean_text(text))


if __name__ == "__main__":
    unittest.main()
