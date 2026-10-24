// Run against the intended FinTrack Mongo database before enabling this feature at scale.
// Non-unique, additive indexes; no financial records are rewritten.
db.transactions.createIndex({user: 1, type: 1, spendingValue: 1, spendingValueReviewedAt: -1}, {name: "user_reviewed_value"});
db.spendingvaluerules.createIndex({user: 1}, {name: "spending_rule_user"});
