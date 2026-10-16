"""Batch inference shared by the API and offline evaluation."""
import numpy as np
from text_processing import clean_text


def categorize(vectorizer, model, descriptions, metadata):
    texts = [clean_text(text) for text in descriptions]
    scores = model.predict_proba(vectorizer.transform(texts))
    evidence = dict(vectorizer.transformer_list)["word"].transform(texts)
    results = []
    for index, probabilities in enumerate(scores):
        ranked = np.argsort(probabilities)[::-1]
        best, second = ranked[:2]
        accepted = bool(
            evidence[index].nnz
            and probabilities[best] >= metadata["min_confidence"]
            and probabilities[best] - probabilities[second] >= metadata["min_margin"]
        )
        results.append({
            "predicted_category": str(model.classes_[best]) if accepted else "General",
            "confidence": float(probabilities[best]) if accepted else 0.0,
            "needs_review": not accepted,
            "model_version": metadata["model_version"],
        })
    return results
