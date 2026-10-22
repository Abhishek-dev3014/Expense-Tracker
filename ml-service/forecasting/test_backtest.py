import unittest
from datetime import date, timedelta
from decimal import Decimal
from forecasting.backtest import Day, evaluate, prediction


class ForecastBacktestTests(unittest.TestCase):
    def history(self, user="synthetic", amount="100"):
        start = date(2026, 1, 1)
        return [Day(user, start + timedelta(days=i), Decimal(amount), 1, True) for i in range(65)]

    def test_no_future_target_leakage(self):
        rows = self.history()
        target = date(2026, 2, 10)
        modified = [Day(row.user, row.date, Decimal("99999"), 1, True) if row.date >= target else row for row in rows]
        self.assertEqual(prediction(rows, target), Decimal("700"))
        self.assertEqual(prediction(rows, target), prediction(modified, target))

    def test_missing_or_unconfirmed_days_are_not_zero(self):
        target = date(2026, 2, 10)
        rows = self.history()
        rows = [r for r in rows if r.date != target - timedelta(days=10)]
        self.assertIsNone(prediction(rows, target))
        rows = [Day(r.user, r.date, r.amount, r.count, False) if r.date == target-timedelta(days=2) else r for r in self.history()]
        self.assertIsNone(prediction(rows, target))

    def test_accounts_are_evaluated_independently(self):
        result = evaluate(self.history("a")+self.history("b", "1000"), date(2026, 2, 1))
        self.assertEqual(result["rupee_mae"], 0)
        self.assertEqual(result["users_with_eligible_windows"], 2)
        self.assertFalse(result["trained_model"])
        self.assertIsNone(result["interval_coverage"])

    def test_insufficient_history_cannot_create_performance_claim(self):
        with self.assertRaisesRegex(ValueError, "No eligible"):
            evaluate(self.history()[:20], date(2026, 1, 1))


if __name__ == "__main__":
    unittest.main()
