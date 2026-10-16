"""Manual model inspection using the exact deployed prediction pipeline."""
import json
from pathlib import Path
import joblib
from categorization import categorize

ROOT = Path(__file__).resolve().parent
if __name__ == "__main__":
    artifacts = ROOT / "model_artifacts"
    descriptions = ["uber travel", "milk and vegetables", "school tuition fees", "monthly house rent", "Unknown merchant xyzzy"]
    results = categorize(joblib.load(artifacts / "vectorizer.pkl"), joblib.load(artifacts / "model.pkl"), descriptions, json.loads((artifacts / "metadata.json").read_text()))
    for text, result in zip(descriptions, results):
        print(json.dumps({"description": text, **result}))
