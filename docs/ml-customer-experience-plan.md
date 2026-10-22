# FinTrack: customer-centered ML improvement plan

Research date: 17 October 2026. Primary audience confirmed by the owner: students
and salaried individuals managing personal expenses.

This document proposes product and ML work. It does not implement changes or
claim to have interviewed customers or analyzed production behavior logs.

## Recommendation

Optimize correctly categorized transactions per minute, with fewer repeated
corrections. Build a personalized categorization system combining explicit user
preferences, confirmed transaction history, a fast global model, and a short
review workflow. Evaluate the whole experience, including latency and mistakes.

## What the current code establishes

- Training uses 651 unique curated/normalized descriptions and 12 fixed labels.
  The 8,500-row original dataset contains only 173 distinct descriptions.
- The unique-description holdout accepted 100/131 predictions, of which 95 were
  correct. Coverage was 76.3%; accuracy counting abstentions as errors was 72.5%.
  The 81/82 curated examples are a regression check, not customer-wide accuracy.
- The classifier sees description text only. It does not receive user identity,
  preferred categories, merchant history or transaction context.
- Customers can create custom categories, but the model cannot directly predict
  those account-specific labels. Category edits overwrite the saved value without
  recording a structured prediction/correction training example.
- Word and character features are present, but inference requires known word
  evidence. Entirely unfamiliar or misspelled short descriptions can therefore
  be rejected even if their character features are similar to known examples.
- CSV expense predictions are batched. The import flow still requires manual
  column mapping and has no duplicate-review step.
- I did not find a dedicated product event pipeline in the inspected application
  source. Transaction data alone cannot reveal abandoned forms, correction time,
  or the reason someone stops using the product.
- The insights code currently assigns a zero savings rate when recorded income
  is zero, then emits a below-20% savings warning. For expense-only users, missing
  income must be represented as unknown, not interpreted as poor savings.

## Customer behavior: hypotheses to validate

| Hypothesis | Product response to test | Evidence to collect |
| --- | --- | --- |
| People enter short descriptions, local food names and typos | Quick entry and useful suggestions while typing | Save time, abandonment, errors by description length/language |
| The same merchants and expenses recur | Remember confirmed choices, with an explicit future-use rule | Repeat-merchant correction rate |
| People prefer personal category names | Per-user category IDs and mappings | Custom-category usage and repeated remapping |
| Some users record expenses in batches | Remember CSV mappings and review possible duplicates | Import success and time per accepted row |
| Reviewing every item is tedious | A queue containing uncertain predictions, with one-tap choices | Review completion time and audited error rate |
| Students may omit allowance/income; employees may track salary cycles | Optional income, relevant budget periods, explain missing data | Segment-specific usefulness interviews |

These are design hypotheses, not findings about FinTrack customers.

## Proposed decision pipeline

1. Preserve a manual category supplied for the current transaction.
2. Apply explicit, account-scoped rules the customer has approved.
3. Retrieve similar, previously confirmed transactions from that same account.
   Auto-assign only when evidence is consistent and sufficiently specific.
4. Use the global model for new descriptions and merchants. Predict a stable
   canonical category, then map to the customer's selected category where a
   mapping exists. A mapping may need merchant or purpose conditions.
5. Auto-assign only if validation supports the required precision. Otherwise
   show up to three suggestions, including a manual/custom-category option.
6. Record the decision source, model version and subsequent correction.

A single correction should not silently rewrite every purchase from a merchant.
Offer **This transaction only** and **Use for future matching transactions**.
For merchants such as Amazon, a merchant-only rule often lacks enough context;
keep explicit rules narrow and support disabling automatic categorization.

YNAB's current documentation describes payee defaults, recent-history evidence,
and the ability to disable automatic categorization for mixed-purpose merchants:
[Categorizing transactions](https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks).
Monarch documents configurable review criteria and original-statement rules:
[Transactions and rules tips](https://help.monarch.com/hc/en-us/articles/28953573066260-Transactions-and-Rules-Tips-Tricks).
These are product precedents, not evidence that their exact thresholds fit FinTrack.

## Training and model selection

Keep the deployed TF-IDF + logistic regression model as the comparison baseline.
Benchmark two challengers using identical data partitions:

- A multilingual sentence encoder with a small classification head and retrieval
  of confirmed examples. A candidate is
  `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. The official
  documentation describes multilingual training; expense-domain performance,
  Hinglish handling, latency and memory must be measured on FinTrack data.
- SetFit with a suitable multilingual encoder, if limited labeled data makes
  encoder fine-tuning useful. SetFit is a few-shot Sentence Transformer training
  approach, not a guarantee of better accuracy on this application.

Use learning curves to decide whether more labels or a different model helps.
Choose a challenger only if it improves correction effort and audited accuracy
within the serving budget. The current ML allocation is 512 MB: measure peak
memory, startup time and concurrent requests before changing runtime models.
Preserve a fast fallback, batch inference and account-scoped caches keyed by
normalized input, model version and preference/rule version.

References: [Sentence Transformers models](https://sbert.net/docs/sentence_transformer/pretrained_models.html),
[SetFit documentation](https://huggingface.co/docs/setfit/index).

### Collect useful labels

Start with a consented pilot corpus of real entry styles and sanitized statement
narrations. Seek diverse examples across categories, merchants, languages and
both customer groups. An initial planning range is 200–500 varied verified
examples per important category; it is not a minimum sufficient sample or an
accuracy promise. Repeated templates and synthetic paraphrases do not establish
real-world coverage. Use them only to supplement real examples.

Examples should cover Indian food names, spelling variations, transport, rent/PG,
college fees, groceries, mobile recharge, subscriptions, work meals, refunds,
reimbursements, ambiguous purchases and unsupported descriptions. Distinguish
transfers and credit-card repayments from new spending when importing statements.
A grocery purchase and the later card repayment must not count as two expenses.

Represent canonical categories separately from personal display labels and tags.
Use stable category IDs so renaming a category does not break learned preferences.
Include transaction kind (expense, income, transfer, refund/reimbursement) as a
separate concept; mixed baskets may need split categorization rather than one
confident label.

Store feedback such as normalized description, predicted canonical category,
predicted user category ID, final user category ID, decision source, score,
review outcome, model version, timestamp and consent scope. Keep preferences and
history account-scoped. Use de-identified, opt-in examples for any shared training
corpus; do not send raw bank details to external analytics or model providers.
Do not treat an unedited prediction as a verified correct label.

### Evaluation and release gates

- Maintain untouched test sets. Partition data by customer, normalized merchant
  family and time to measure cold-start and repeat-use performance separately.
  Keep duplicate/paraphrase families together; fit preprocessing only on training
  folds. For time tests, personalized retrieval must use only prior history.
- Compare all models on per-category precision/recall, macro-F1, top-three
  suggestion accuracy, coverage, audited automatic-assignment precision, and
  results for short text, typos, language, new merchants and custom categories.
- Calibrate scores on held-out data. A score of 0.93 is not proof of 93% accuracy.
  Tune class-specific acceptance thresholds to a chosen precision target; the
  current 0.35 score cutoff is not an assurance of production reliability.
- Sample automatically accepted predictions for review. Customer correction
  rate alone undercounts unnoticed errors. Include confidence intervals when
  reporting small-sample results.
- Evaluate new versions in shadow mode first, then a small opt-in rollout with
  monitoring and rollback. Retrain on reviewed data at a cadence justified by
  new labels, not after every individual edit. An explicit user rule can take
  effect immediately without retraining the global model.

References: [Grouped and time-based evaluation](https://scikit-learn.org/stable/modules/cross_validation.html),
[Probability calibration](https://scikit-learn.org/stable/modules/calibration.html).

## Customer research and measurement

Recruit an initial five students and five salaried individuals for small,
iterative usability rounds. This sample is for finding workflow problems, not
estimating population accuracy or proving retention improvements. Use synthetic
or volunteered/redacted tasks and explain any recording.

Ask each participant to record five everyday expenses, correct one unfamiliar
category, enter the same expense again, import a statement sample, and identify
spending that needs attention. Observe actions and ask why after the task.
Measure successful completion, time, error recovery and perceived effort.
[NN/g's usability testing guidance](https://www.nngroup.com/articles/usability-testing-101/)
explains task-based observation and measures such as success and time on task.

Instrument event names such as `expense_entry_started`,
`expense_save_completed`, `category_suggestion_shown`, `category_corrected`,
`future_rule_created`, `review_completed`, `import_started`,
`import_completed`, and `import_failed`. Include source, duration, outcome,
model version and coarse category; exclude raw descriptions and financial
credentials from general product analytics. Separate transient latency from
model uncertainty and service errors.

Candidate product targets, to validate against the measured baseline:

| Metric | Proposed initial target |
| --- | --- |
| Median successful manual expense entry | Under 8 seconds or a material reduction from baseline |
| Audited automatic-assignment precision | At least 98%, with adequate sample size |
| Automatic-assignment coverage | Grow toward 80% while preserving precision |
| Repeated correction of the same approved pattern | Near zero |
| Warm end-to-end categorization p95 | Under 300 ms; report cold starts separately |
| Monthly reconciliation effort | At least 50% lower in a controlled pilot |

These are goals, not measured FinTrack performance. Daily engagement alone is a
poor success criterion for an app intended to save customers time.

## Delivery order

1. Add correction history, explicit remembered rules and custom-category mapping.
   Fix missing-income messaging and distinguish uncertainty from outages.
2. Add a review queue, top suggestions, quick entry and saved CSV mappings with
   duplicate review. Instrument the key workflows and run the first pilot.
3. Build the verified corpus, evaluate baseline and challengers, calibrate and
   shadow-test the selected candidate. Publish a new model card with segment
   results and operating limits.
4. Add recurring-expense suggestions and useful weekly summaries once labels are
   dependable. Treat detected subscriptions and forecasts as suggestions with
   user control. Receipt OCR and voice capture can follow demonstrated demand.

The first milestone should be: **correct an expense once, have future matching
expenses handled correctly, and review only exceptions.**
