# FinTrack ML implementation and training guide

Audience: students and salaried individuals. Prepared 17 October 2026.

This is an implementation guide, not a report that these features have already
been built. Current functionality includes the v2 text classifier, batch expense
prediction, custom categories, and prediction/review/unavailable status. Personal
rules, correction learning, suggestion endpoints and challenger trainers below
are proposed work.

## 1. Establish a reproducible baseline

From the repository root:

```sh
cd "/Users/admin36/Desktop/Expense Tracker"
git status --short
git switch -c codex/ml-personalization
```

Keep existing uncommitted research documents; do not reset the checkout. Use a
separate test database for application experiments. The backend verification
suite already uses an isolated in-memory MongoDB server.

Run the existing checks:

```sh
(cd backend && ./mvnw -B -ntp verify)
(cd frontend/expense-tracker && npm test && npm run build)
docker build --platform linux/amd64 -t fintrack-ai:baseline ml-service
docker run --rm --platform linux/amd64 --network none \
  -v "$PWD/ml-service/tests:/tests:ro" -e FINTRACK_BUNDLE=/app \
  fintrack-ai:baseline python3 -m unittest discover -s /tests -v
```

Save baseline results: model version, dataset fingerprint, per-category scores,
accepted-prediction precision, coverage, startup time, warm latency and memory.
The current holdout is 95 correct out of 100 accepted predictions, with 100 of
131 descriptions accepted. The separate curated regression score is 81/82.
These are small-data measurements, not an estimate for all future customers.

**Gate:** all existing checks pass before behavior changes. The baseline Docker
image preserves the deployed model for comparisons while source artifacts change.

## 2. Define category identity and labeling rules

Use a stable canonical category for global training and an account-owned category
ID for a customer's display label. For example:

| Description | Canonical label | Customer's chosen label |
| --- | --- | --- |
| Uber ride | Transport | Office commute |
| Restaurant lunch | Food | Outside food |
| Vegetables | Grocery | Home food |

Train the global model on canonical labels. Store personal labels as preferences;
do not mix every customer's label names into the global class list. A correct
Food prediction mapped to the wrong personal label is a personalization error,
not necessarily a global classifier error.

Keep the existing 12 canonical categories as the first version. Write annotation
rules for Food vs Grocery, Transport vs Travel, and item purpose vs marketplace.
Amazon alone does not establish what was purchased. Preserve legacy category
strings while introducing optional IDs and canonical fields. Backfill gradually;
never silently reclassify historical transactions as a side effect of migration.

Treat income/expense/transfer/refund as a separate transaction-kind concept.
Until transfer/refund handling exists, unsupported examples should request
review rather than inflate spending totals.

**Files:** category domain/service, transaction domain/DTOs, CategorySelect, and
category filtering/report queries. Test renames, ownership and legacy records.

## 3. Persist prediction provenance and correction history

Extend saved prediction metadata with model version, decision source, original
canonical prediction, selected category ID and review outcome. Keep existing
`category`, `aiConfidence`, and `categoryStatus` compatible with current clients.
Scores from a model should not be fabricated for manual choices or explicit rules.

Add a backend feature such as:

```text
features/categorization/
  api/
  application/
  domain/
  infrastructure/
```

Store a correction event with an opaque event ID, account owner, transaction ID,
normalized description, original prediction, final canonical label if verified,
final personal category ID, source/model version, timestamp and consent scope.
The final canonical label may be unknown; such feedback is still useful for
personal preferences but must not become an unverified global training label.

In `TransactionService.update`, capture the previous decision BEFORE updating
it. Record explicit confirmations as well as corrections. An untouched prediction
is not a verified correct label. Deduplicate retried events. Keep financial saves
reliable if feedback delivery fails; use a supported database transaction or a
durable outbox/retry design rather than losing the expense.

**Gate:** edit a model-labeled expense and verify both the saved category and the
correct original/final feedback values. Repeating the request must not duplicate
learning events. Another account must not read that feedback.

## 4. Implement explicit personal rules

Offer two actions after a category change:

- This transaction only.
- Use for future matching expenses.

The second creates an account-owned rule with a normalized match, destination
category ID, enabled flag, priority/version and timestamps. Start with exact
merchant or normalized-description matching. Avoid arbitrary user regexes and
broad substring matching. Uber rides and Uber Eats need distinct patterns.

Suggested NEW routes, to implement before attempting to call them:

```text
GET    /api/category-rules
POST   /api/category-rules
PATCH  /api/category-rules/{id}
DELETE /api/category-rules/{id}
```

Derive the owner from the authenticated session. Validate that the destination
category belongs to the account or is a valid built-in. Define conflict precedence
and invalidate matching caches after rule edits.

Decision order:

```text
Explicit category for this transaction
→ approved personal rule
→ sufficiently consistent confirmed personal history
→ global classifier
→ needs-review suggestions
```

**Gate:** approve a rule for `uber travel`; the next matching expense uses its
category without requiring a model request. A one-off edit does not create a
rule. A different customer receives no benefit or leakage from that rule.

## 5. Add a review queue and suggestions

Implement an authenticated backend endpoint, for example
`POST /api/category-suggestions`, that mediates calls to the private ML service.
The browser must never receive the ML service API key.

Add a separate score-qualified suggestions list without removing the existing
prediction response fields. At most three candidates should be displayed, plus
manual/custom selection. Confidence determines whether to auto-assign or ask;
raw top-three scores must not be presented as calibrated probabilities until
validated.

Extend transaction search with owner-scoped review filters. The frontend queue
should distinguish model uncertainty from service outages. Provide one-tap
confirmation, correction, optional future-rule creation, and explicit bulk
review with a preview of affected rows.

**Gate:** a clear expense auto-categorizes; an ambiguous expense appears once in
the review queue; confirming it clears the review state and records feedback.
Outages preserve the expense and explain that prediction was unavailable.

## 6. Measure real customer effort

Track workflow events such as entry started/saved, suggestion shown, category
corrected, rule approved, review completed, import started/completed/failed.
Use opaque account/session identifiers, duration, input source, outcome and
model version. General product analytics should not contain raw bank narrations,
credentials or full financial records.

Run an initial qualitative study with five students and five salaried users.
Ask them to enter everyday expenses, correct one category, enter a matching
expense again, and import a sample statement. Measure task completion, entry
and review time, repeated corrections, and failure recovery. A small usability
study finds workflow problems; it does not prove population-level model accuracy.

Also fix `AnalyticsService.insights`: recorded income of zero currently produces
a below-20% savings warning. Show an unknown/not-recorded income state instead
of treating missing income as evidence of poor savings.

**Gate:** demonstrate an actual reduction in effort against step 1's baseline.

## 7. Build a private, verified training corpus

Create a directory such as `ml-service/data/private/` and add that directory to
`.gitignore` BEFORE exporting customer examples. Never commit real bank exports.
Keep a consented, sanitized training export separate from general analytics.
Use a layout such as:

```csv
example_id,description,canonical_category,user_group,merchant_group,paraphrase_group,event_time,label_source
sample-001,uber travel,Transport,synthetic-user-1,uber-rides,uber-trip-1,2026-10-01T12:00:00Z,human_verified
sample-002,paneer tikka lunch,Food,synthetic-user-2,local-restaurant,restaurant-meal-1,2026-10-02T12:00:00Z,human_verified
```

The sample rows above are invented. Use opaque grouping IDs for real data.
Include local foods, spelling variants, mixed-language text, UPI-style merchant
narrations, rent/PG, fees, subscriptions, work meals, and genuinely ambiguous or
unsupported descriptions. Synthetic augmentation supplements the corpus; it
does not replace real distribution coverage.

Prepare an annotation guide with tie-breaking rules. Review disputed labels.
Balance diversity across important categories, merchants and user groups rather
than repeatedly copying examples to inflate row count. Use learning curves to
choose the next labeling effort; no fixed row count guarantees quality.

**Gate:** examples are consented, deduplicated, traceable to a label source and
consistently labeled. Personal categories have not contaminated canonical labels.

## 8. Add the real-data loader and safe evaluation splits

The CURRENT `ml-service/train.py` reads only the checked-in legacy CSV and
`data/category_examples.json`. Running it does not automatically incorporate the
private export from step 7. Implement a loader before claiming real-data training.

Add configurable input/output paths and training configuration. Validate columns,
labels, text limits, consent eligibility, duplicates and label conflicts. Reject
bad data with a report rather than silently overwriting a conflicting label.

Create separate evaluation scenarios:

1. New-customer performance: test account groups absent from training.
2. New-merchant performance: test merchant groups absent from training.
3. Future transactions: train on older data and test on later data.

Keep duplicate/paraphrase families together. These scenarios may require separate
partitions, rather than an impossible promise that one split covers everything.
For personalized retrieval, only history preceding the test transaction may be
used. Fit text features on training folds only. Tune parameters on validation
folds, calibrate on independent data, and freeze a final test set for release.

**Gate:** an automated leakage check reports no forbidden group or time overlap.
The existing 82 curated examples remain regression cases, not a substitute for
this independent test design.

## 9. Retrain the baseline before adding a challenger

For a reproducibility check of the CURRENT seed-data trainer, run from the
repository root after building the baseline image in step 1:

```sh
docker run --rm --platform linux/amd64 --network none \
  --user "$(id -u):$(id -g)" \
  -v "$PWD/ml-service:/training" -w /training \
  fintrack-ai:baseline python3 train.py
```

This uses the pinned inference dependencies and writes the model artifacts in
your working checkout. It currently trains only seed data. After step 8, pass
the loader's implemented configuration to train on the private corpus; do not
invent command flags that the script does not support yet.

Compare improvements caused by verified data while holding the model family
fixed. Save data/split fingerprints, thresholds, taxonomy/preprocessing versions,
library versions, per-class metrics and failures in a run report.

**Gate:** the run is reproducible and beats the frozen baseline on relevant
independent tests, not just on its own training rows.

## 10. Benchmark a semantic challenger

Implement a separate trainer, such as `train_semantic.py`, with either:

- A multilingual sentence encoder and a small classifier on its embeddings.
- SetFit fine-tuning with a suitable multilingual encoder.

These trainers do not exist in the repository yet. Add their training dependencies
in a separate, pinned environment. Keep heavy training libraries out of the
serving image unless inference needs them. A candidate encoder is
`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`; multilingual support
must still be tested specifically on your English/Hinglish/native-language data.

Use the SAME evaluation partitions as the baseline. Compare per-class
precision/recall, macro-F1, top-three accuracy, unknown detection, accepted
precision, coverage, memory, startup time and warm p50/p95 latency. Test short
inputs and misspellings explicitly. The current 512 MB ML service budget makes
real memory and cold-start measurements necessary.

**Gate:** select the model based on customer error/effort reductions within the
serving budget. Retain the baseline if the challenger is not an improvement.

## 11. Calibrate and select an automatic-assignment policy

Calibrate using data independent of the classifier's training rows. Tune
category-specific acceptance thresholds and ambiguity margins on validation data.
Report precision versus coverage; raising coverage may increase mistakes.
Keep unknown/unsupported inputs in evaluation. Customer silence is not proof
that an automatic prediction was correct: audit a sample of accepted decisions.

Candidate goals include at least 98% audited automatic-assignment precision,
coverage progressing toward 80%, and warm end-to-end p95 below 300 ms. These are
targets, not promised results. Report sample sizes, uncertainty and cold starts
separately. Preserve accounting correctness for transfers/refunds.

**Gate:** a release report includes errors by category, customer group, language,
merchant novelty and input length, with justified thresholds.

## 12. Integrate without slowing down expense saves

Keep single and batch prediction contracts backward compatible. Add user-history
retrieval in the backend, where account isolation is enforced. Evaluate explicit
rules locally before making an ML call. Cache only with the necessary account,
normalized-input, model and preference/rule versions. Never share personal
history results between accounts.

Preserve batch inference for imports. Set bounded request timeouts and maintain
separate needs-review and unavailable states. A background categorization design
can save an expense first and update its pending status later, but requires
idempotent jobs and visible processing/retry states; implement that deliberately,
not by silently changing categories after a customer manually overrides one.

**Gate:** create, edit, batch, retry, outage and simultaneous manual-edit tests
pass against a real ML process and an isolated database.

## 13. Improve capture and imports

Add quick entry, remembered CSV column mappings and duplicate-review previews.
Suggested duplicate detection is not permission to delete or merge records:
same merchant/date/amount can describe legitimate separate purchases. Use source
transaction IDs where available and let customers resolve uncertain matches.

Add repeat-payment suggestions for confirmation before creating schedules. Add
receipt OCR or voice entry only after observing that they solve a meaningful
capture problem. Handle split purchases explicitly rather than forcing one
category on every basket.

**Gate:** customers complete the same entry/import tasks faster with no increase
in accounting mistakes.

## 14. Test and package the selected version

From the root, run the same backend/frontend checks from step 1, plus new tests
for rules, feedback ownership, suggestion ordering, idempotency and isolation.
Build and test the candidate serving image:

```sh
docker build --platform linux/amd64 -t fintrack-ai:candidate ml-service
docker run --rm --platform linux/amd64 --network none \
  -v "$PWD/ml-service/tests:/tests:ro" -e FINTRACK_BUNDLE=/app \
  fintrack-ai:candidate python3 -m unittest discover -s /tests -v
```

When adding artifacts/modules, update `Dockerfile`, `.dockerignore` and
`scripts/build_catalyst.py`. Keep model, preprocessing, class order and metadata
versioned together. Update tests legitimately when a version changes the model
contract; do not rewrite expected labels to hide regression failures.

The current workflow runs push builds only for `main` and
`feat/fintrack-modern-ui`. A new `codex/ml-personalization` branch needs a pull
request or an intentional workflow change for CI; pushing it alone does not
establish that checks ran.

**Gate:** CI passes and the packaged model reproduces the measured decisions.

## 15. Release and monitor gradually

Use a separate staging AppSail app and test database for the first integrated
release. Configure secrets through hosting settings, never in model files.
Preserve the working API-managed Java deployment and existing URLs/configuration.

Run the challenger in shadow mode first: log its suggested decisions without
changing customer records. Then offer an opt-in rollout to a small cohort.
Monitor corrected predictions, audited mistakes, review burden, response times,
service errors, memory and segment-specific coverage. Keep the prior model image
and a rollback procedure. Promote only when gates are met; publishing a new
frontend and deploying the ML/backend are separate release steps.

Retrain when enough reviewed, representative new data accumulates. Apply explicit
personal rules immediately, while keeping global model releases versioned and
evaluated. Do not retrain and deploy automatically after each correction.

**First working milestone:** correct `uber travel` once, approve a future rule,
and have the next matching expense use the customer's preferred category with
no repeated correction and no cross-account leakage.

## Technical references

- [Existing FinTrack research plan](ml-customer-experience-plan.md)
- [Existing model card](../ml-service/MODEL_CARD.md)
- [scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html)
- [scikit-learn grouped/time evaluation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [Sentence Transformers models](https://sbert.net/docs/sentence_transformer/pretrained_models.html)
- [SetFit documentation](https://huggingface.co/docs/setfit/index)
- [YNAB category defaults and user control](https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks)
