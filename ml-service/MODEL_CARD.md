# FinTrack expense categorization v2

The classifier predicts **expense purpose**, not income type. Uber/Ola/local fares
are **Transport**; flights, holiday accommodation and railway reservations are
**Travel**. Other labels are Food, Grocery, Shopping, Clothing, Electronics,
Utilities, Rent, Health, Education and Entertainment. Older saved category names
remain readable. Manual categories always take precedence.

## Model and data

Word (1–2 gram) and character (3–5 gram) TF-IDF features feed a balanced logistic
regression classifier. Shared Unicode-aware normalization handles transaction
prefixes, bank references, merchant VPAs and a small set of Hinglish aliases.
Unknown vocabulary, scores below 0.35, or a winning margin below 0.10 produce
General with `needs_review=true` and zero confidence. Scores are **not calibrated
probabilities of correctness**. Clear descriptions are essential.

The original 8,500 CSV rows contain only 173 distinct descriptions. Training now
deduplicates normalized descriptions, fixes inconsistent purpose labels and adds
reviewable seed examples from `data/category_examples.json`: 651 unique training
descriptions in total. Evaluation descriptions in `tests/fixtures/evaluation.json`
are excluded from training and exact overlap is rejected.

## Evaluation

- Independent curated examples: **81/82 (98.8%)**, versus **41/82 (50.0%)** for the
  previous model after equivalent label mapping. All 10 generic/unknown examples
  were sent for review. A sofa/living-room purchase was conservatively abstained.
- A separate stratified 20% holdout of unique descriptions: **95/100 accepted
  predictions correct (95.0%)**, with **100/131 (76.3%)** coverage. Counting every
  abstention as an error, accuracy is **95/131 (72.5%)**.
- HTTP regressions cover the user-reported `uber travel`, bank-formatted Uber,
  every category, unknown descriptions, authentication and batch validation.

These are small synthetic/curated datasets, not representative customer traffic.
No claim of perfect accuracy or production-wide 98.8% accuracy is justified.
Merchant-only purchases can be ambiguous, and uncommon languages/categories
require more labeled examples. User edits do not automatically retrain the model.

## Reproduce and extend

Use Python 3.11 and the pinned `requirements-catalyst.txt` runtime. Run `python
train.py` from any working directory; paths resolve relative to the script.
Review new labels in `data/category_examples.json`, keep evaluation examples out
of training, retrain and inspect `model_artifacts/metadata.json`. It records data
fingerprint, model/library versions, thresholds, full holdout metrics and failures.
The old random CSV augmentation script has been retired to prevent duplicated
examples from leaking into evaluation.

For the exact deployed model, build the image and run:

```sh
docker build --platform linux/amd64 -t fintrack-ai:test ml-service
docker run --rm --platform linux/amd64 --network none \
  -v "$PWD/ml-service/tests:/tests:ro" -e FINTRACK_BUNDLE=/app \
  fintrack-ai:test python3 -m unittest discover -s /tests -v
```

`POST /predict` accepts `{"text":"uber travel"}`. `POST /predict/batch` accepts up
to 1,000 `texts` and preserves order. Both require `X-API-Key` when configured.
Responses include category, model score, `needs_review`, and `model_version`.
The backend batches unique import descriptions in one request and stores
`categoryStatus` as predicted, needs_review, unavailable or manual. An outage
never prevents saving an expense, and logs disclose HTTP failure status without
credentials or descriptions.

Existing General records are not silently rewritten. Edit a record and select
**Auto-detect** to reclassify it, or choose the intended category manually.
