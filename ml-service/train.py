"""Reproducible training with unique descriptions and a separate evaluation corpus.

Run in the pinned ML runtime: python train.py
The repeated 8,500-row dataset is deduplicated BEFORE splitting. Independent
curated evaluation descriptions are never fitted; metrics are not a claim of
accuracy on unseen customer transactions.
"""
import csv
import hashlib
import json
from pathlib import Path

import joblib
import sklearn
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion

from text_processing import clean_text
from categorization import categorize

ROOT = Path(__file__).resolve().parent
THRESHOLD = 0.35
MARGIN = 0.10
LABELS = {"Bills": "Utilities", "Healthcare": "Health", "Online Shopping": "Shopping"}
CORRECTIONS = {
    "Amazon order for shoes": "Clothing", "Ajio clothing order": "Clothing",
    "Bought headphones from Myntra": "Electronics", "Diesel for generator": "Utilities",
    "Bus booking RedBus": "Transport", "Transaction at Myntra": "Clothing",
    "Transaction at Ajio": "Clothing",
}
# Generic transaction words should not masquerade as evidence of a category.
STOP_WORDS = sorted(set(ENGLISH_STOP_WORDS) | {
    "bought", "new", "monthly", "purchase", "purchased", "paid", "payment",
    "order", "booking", "fee", "fees", "charges", "bill", "subscription",
    "membership", "week", "weekly", "weekend", "annual", "online", "store",
    "shop", "friends", "family", "home", "renewal", "renewed", "delivered",
    "transaction", "sent", "money", "transfer", "reference", "yesterday", "bank",
})


def load_training():
    examples = {}
    with (ROOT / "personal_finance_dataset_8000_extended.csv").open() as file:
        rows = list(csv.DictReader(file))
    for row in rows:
        label = CORRECTIONS.get(row["Description"], LABELS.get(row["Category"], row["Category"]))
        examples[clean_text(row["Description"])] = label
    curated = json.loads((ROOT / "data/category_examples.json").read_text())
    for label, texts in curated.items():
        for text in texts:
            normalized = clean_text(text)
            if normalized in examples and examples[normalized] != label:
                raise ValueError(f"Conflicting labels for {text!r}")
            examples[normalized] = label
    return examples, len(rows)


def features():
    return FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), stop_words=STOP_WORDS, sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=2, sublinear_tf=True)),
    ], transformer_weights={"word": 1.5, "char": 0.6})


def fit(texts, labels):
    vectorizer = features()
    matrix = vectorizer.fit_transform(texts)
    model = LogisticRegression(C=12, max_iter=2000, class_weight="balanced", random_state=42)
    model.fit(matrix, labels)
    return vectorizer, model


def predict(vectorizer, model, texts):
    metadata = {"min_confidence": THRESHOLD, "min_margin": MARGIN, "model_version": "2026-10-17-v2"}
    return [result["predicted_category"] for result in categorize(vectorizer, model, texts, metadata)]


def main():
    examples, source_rows = load_training()
    texts = list(examples)
    labels = [examples[text] for text in texts]
    train_x, test_x, train_y, test_y = train_test_split(texts, labels, test_size=0.2, stratify=labels, random_state=42)
    assert not set(train_x) & set(test_x)
    heldout_vectorizer, heldout_model = fit(train_x, train_y)
    heldout_predictions = predict(heldout_vectorizer, heldout_model, test_x)

    vectorizer, model = fit(texts, labels)
    evaluation = json.loads((ROOT / "tests/fixtures/evaluation.json").read_text())
    eval_x = [clean_text(text) for samples in evaluation.values() for text in samples]
    eval_y = [label for label, samples in evaluation.items() for _ in samples]
    overlap = set(eval_x) & set(texts)
    if overlap:
        raise ValueError(f"Evaluation descriptions overlap training: {sorted(overlap)}")
    predicted = predict(vectorizer, model, eval_x)
    failures = [{"description": text, "expected": expected, "actual": actual}
                for text, expected, actual in zip(eval_x, eval_y, predicted) if expected != actual]
    report = {
        "model_version": "2026-10-17-v2",
        "sklearn_version": sklearn.__version__,
        "training_sha256": hashlib.sha256(json.dumps(examples, sort_keys=True).encode()).hexdigest(),
        "source_rows": source_rows, "unique_training_descriptions": len(texts),
        "categories": list(model.classes_), "min_confidence": THRESHOLD, "min_margin": MARGIN,
        "unique_description_holdout": {"count": len(test_x), "accuracy": accuracy_score(test_y, heldout_predictions),
                                       "coverage": sum(p != "General" for p in heldout_predictions) / len(test_x),
                                       "accepted_accuracy": accuracy_score([y for y, p in zip(test_y, heldout_predictions) if p != "General"], [p for p in heldout_predictions if p != "General"]),
                                       "report": classification_report(test_y, heldout_predictions, output_dict=True, zero_division=0)},
        "independent_curated_evaluation": {"count": len(eval_x), "accuracy": accuracy_score(eval_y, predicted),
                                           "failures": failures},
        "limitations": "Small English and Hinglish seed corpus, not representative customer data. Confidence is a model score, not a calibrated probability of correctness. Unknown or ambiguous descriptions require review."
    }
    artifacts = ROOT / "model_artifacts"
    artifacts.mkdir(exist_ok=True)
    joblib.dump(model, artifacts / "model.pkl")
    joblib.dump(vectorizer, artifacts / "vectorizer.pkl")
    (artifacts / "metadata.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ["model_version", "unique_training_descriptions", "independent_curated_evaluation"]}, indent=2))
    print("Unique-description holdout accuracy:", report["unique_description_holdout"]["accuracy"])


if __name__ == "__main__":
    main()
