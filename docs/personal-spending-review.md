# Personal spending review

Implemented 24 October 2026 for personal expense tracking. This is a customer-owned reflection layer, separate from expense categorization, financial balances, spending forecasts and medical judgments.

## Product research

Related features exist, but the inspected sources do not establish an objective universal good/bad expense model:

- [Copilot's category tips](https://help.copilot.money/en/articles/10684301-category-tips-tricks) describe customer-defined Needs and Wants groups. Its [quick start guide](https://help.copilot.money/en/articles/11157550-quick-start-guide) describes learning transaction classification after customer reviews.
- [Monarch transaction rules](https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-rules) support personal criteria, category changes and tags. Its [transaction tips](https://help.monarch.com/hc/en-us/articles/28953573066260-Transactions-and-Rules-Tips-Tricks) describe tags as another dimension of expense review.
- [YNAB's priorities method](https://support.ynab.com/en_us/the-ynab-method-an-overview-SJmiqpi6j) emphasizes customer priorities, including optional personal spending. This supports describing purchases in relation to someone's own choices rather than treating all dining out as inherently bad.

These are product precedents, not FinTrack customer interviews, clinical evidence or evidence of savings achieved. The owner supplied milk/fruits/home foods versus ice cream/outside food as a desired personal preference.

## What customers can do

1. In Add/Edit expense, optionally choose **Good for me**, **Fine for me**, or **Could improve**. Tap the selected rating again to clear it. Save the expense normally. A rating remains separate from its category.
2. In Analytics → Overview, use **Spending that feels right for you** to see recorded amounts/counts for each confirmed rating and a separate Not rated total. Review up to 15 recent expenses; edit transactions to review older ones.
3. Expand **Personal suggestions and preferences**. Enable learning explicitly to use only that account's confirmed ratings. Disable it to stop consulting review history for suggestions. Financial records remain intact.
4. Optionally enable the everyday-food guide. It suggests Good for me for descriptions containing milk, fruits, vegetables, groceries or home foods, and Could improve for ice cream, takeaway/outside food and listed treat descriptions. Both matching groups, negated descriptions and unfamiliar items abstain. This opt-in guide is a simple editable starting preference, not a trained model or nutritional advice.
5. Save an exact-description preference with any of the three ratings. It takes priority over learning and the starter guide. Preferences ignore case, Unicode compatibility, punctuation and spacing. Remove a preference from the list to stop using it; existing expense ratings remain unchanged.
6. For a suggestion in the modal, choose **Use this rating** to accept it. Suggestions never silently rewrite ratings or enter the reviewed totals.

Editing description, amount or category clears an existing review when no explicit replacement rating is supplied. The form asks for a fresh decision after description/amount/category changes. An income transaction cannot receive a spending rating. Imports without explicit ratings remain unrated.

## Architecture and model

`spendingreview` owns preferences, exact rules and the suggestion engine. It calls transaction application services rather than transaction persistence. Transaction owns rating fields and atomic rating updates. Feature dependency direction remains acyclic under ArchUnit.

The order is explicit preference → consistent exact reviewed history → similar reviewed purchases → optional food guide → no suggestion. Conflicting exact history abstains even when the food guide is enabled. Manual customer confirmation is authoritative.

`personal-value-knn-v1` is an account-local, instance-based nearest-neighbour classifier. It reads at most 300 confirmed expense examples, excludes the transaction currently being edited, groups by normalized description, discards ambiguous groups, and combines word-set cosine similarity (70%) with character-trigram set cosine similarity (30%). An unrelated description with no word overlap cannot receive a model suggestion. Repeated identical expenses cannot create extra distinct training examples.

Similar-description predictions require at least six distinct consistent descriptions across at least two labels, two agreeing neighbours, a minimum similarity and a margin over competing labels. Those initial thresholds are engineering guards, not measured customer-wide accuracy or calibrated probabilities. Exact history can support a suggestion earlier, with its distinct source disclosed. The method version and supporting/training counts are returned by the API; no numeric accuracy claim is shown.

This release does not train on other accounts, export private data to an LLM, infer health, inspect diet, determine necessities or include bank balance/affordability in the model. A costly milk purchase and a cheap one may receive the same suggestion; the customer reviews context. Arbitrary code, executable artifacts or external embeddings are not loaded. No global model can override a personal exact rule.

## API and storage

Every route requires the existing authenticated principal; no request accepts another account ID.

| Route | Contract |
| --- | --- |
| GET `/api/spending-review?month=YYYY-MM` | Owned recorded expense totals, up to 15 recent purchases, preferences, exact rules. Full year/month with app timezone; excludes future entries. |
| POST `/api/spending-review/suggest` | `{description, excludeTransactionId?}` → proposed rating, source, explanation, method version, example counts. Read only. |
| PUT `/api/spending-review/preferences` | `{learningEnabled, foodGuideEnabled}`. Both default false. |
| POST `/api/spending-review/rules` | `{description, value}` with value good/fine/improve. Deterministic per-account ID makes same-description saves an upsert. Initial limit 100 rules per account. |
| DELETE `/api/spending-review/rules/{id}` | Owned rule deletion, 204 acknowledgment. |
| PUT `/api/spending-review/transactions/{id}` | `{value: good|fine|improve|unreviewed}` → owned expense; atomic field update without changing financial amounts, splits or category. |

Existing create/update expense endpoints accept optional `spendingValue`. Missing values remain compatible with older clients. Records use nullable `spendingValue` and `spendingValueReviewedAt`; suggestions are never persisted as confirmed examples by the suggestion endpoint.

New collections are `spendingpreferences` (one `_id` per account) and `spendingvaluerules` (deterministic account/normalized-description `_id`). Model input is bounded and includes explicit ratings only. No new training dataset is committed to Git.

The existing user/date index supports period reads. Definitions for rating-history and rule-list indexes are in `ops/mongodb/spending-review-indexes.js`. Production deliberately disables automatic indexes: apply those additive indexes against the intended database before enabling at larger scale. They are not backfills and rewrite no financial records.

## Validation and release

Regression tests cover authentication, owner isolation, amount preservation, clearing ratings, income rejection, explicit opt-in, starter-guide conflicts/negation/word boundaries, rule precedence/removal, same-description feedback, self-exclusion, Unicode normalization, duplicate training examples and unrelated descriptions. These are correctness tests, not real-world model evaluation.

Before claiming broader predictive accuracy, evaluate consented real reviews with held-out descriptions and users, chronological validation, conflict/sparse-history strata, label coverage, error rate among suggested ratings and abstention rate. Never use the currently edited transaction as its own evaluation example. Review thresholds and model versions before promotion. Inferred spending value must remain distinguishable from customer confirmation.

Deploy the verified Java backend first to the existing Catalyst-managed Java 21 app, then release the frontend. GitHub image publication alone does not deploy that backend. Smoke-test an authenticated suggestion and a disposable-account review; do not change a real customer's preferences or ratings to prove the feature.

### Local acceptance check (24 October 2026)

The Java service and the production frontend build were exercised together against an isolated, in-memory database with a synthetic account. The Add expense dialog offered a nearest-neighbour suggestion for “fresh milk”; no rating was selected until explicitly accepted. Saving produced a transaction badge and the expected review totals. Rating a previously unreviewed ₹150 fruit purchase moved only its review bucket, leaving recorded total spending at ₹1,635. An exact “ice cream → Fine for me” exception was saved through the preferences UI. No real account ratings or preferences were changed. Backend: 64 tests passed. Frontend: 46 tests, lint and production build passed. These checks establish functionality, not predictive accuracy on customer data.
