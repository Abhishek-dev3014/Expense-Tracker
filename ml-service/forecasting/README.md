# Spending forecast evaluation

The customer-facing spending outlook currently runs **weekday-mean-v1**, a statistical baseline in the Java `SpendingForecaster` adapter. The existing Python TF-IDF category model remains a separate task. No trained spending model or calibrated forecast interval has been shipped.

`backtest.py` evaluates the variable-spending part of that baseline against chronological, consented daily histories. It has no third-party dependencies, reads strictly past observations, separates accounts, rejects missing/unconfirmed history, and requires complete future targets for evaluation. It does not infer complete coverage from an absence of transactions.

Prepare a private CSV with `user_id,date,variable_expense,expense_count,complete`. The identifier must be pseudonymous; no names, descriptions or account numbers are needed. Aggregate only reconciled variable INR spending. Exclude generated fixed bills, own-account transfers and duplicate card payments; link refunds/reimbursements according to the intended accounting policy before aggregation. Include explicit complete zero-spend days. Keep incomplete days flagged false and missing dates missing.

From `ml-service/`:

```sh
python -m unittest forecasting.test_backtest -v
python -m forecasting.backtest forecasting/private-data/daily.csv \
  --from-date 2026-09-01 --horizon 7 \
  --output forecasting/reports/baseline.json
```

Private-data and reports directories are ignored by Git; create them locally as needed. Reports contain aggregate rupee MAE, aggregate WAPE (null for an all-zero target total), number of eligible windows/users, method version and data fingerprint. Overlapping windows are correlated. Do not treat this report as a customer-wide accuracy claim or proof that customers saved money.

A trained challenger needs an explicit target/horizon contract, consented training and separate evaluation cohorts, rolling time validation and held-out-user checks, missing-data and sparse-history policies, subgroup error analysis, and calibrated intervals if exposed. Its manifest must include task, method/model version, feature schema, data fingerprint, training cutoff, eligible population, evaluation results, limitations and rollback target. Promotion requires human review and shadow evaluation against the baseline. Classification confidence must never be reused as forecast confidence. Secrets and financial rows must not enter logs, Git, or product telemetry.

The production endpoint should continue serving recorded facts and readiness states if any future Python forecast provider is unavailable. Do not promote an artifact solely because a training script completed or because it fits the category dataset: that dataset has no suitable spending-history target.
