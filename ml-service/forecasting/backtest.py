"""Chronological backtest for the weekday-mean-v1 variable-spending baseline.

Input: consented, reconciled daily aggregates (not the description training CSV).
Required columns: user_id,date,variable_expense,expense_count,complete.
Include explicitly confirmed zero-spend days. A missing day never becomes zero.
Usage: python -m forecasting.backtest private.csv --from-date 2026-09-01 --output report.json
This evaluates a baseline; it never trains or promotes a customer ML model.
"""
import argparse
import csv
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path

VERSION = "weekday-mean-v1"


@dataclass(frozen=True)
class Day:
    user: str
    date: date
    amount: Decimal
    count: int
    complete: bool


def load(path):
    records = []
    seen = set()
    with Path(path).open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        if not {"user_id", "date", "variable_expense", "expense_count", "complete"}.issubset(reader.fieldnames or []):
            raise ValueError("Missing daily-aggregate columns; see the forecasting README.")
        for line, row in enumerate(reader, 2):
            try:
                user = row["user_id"].strip()
                day = date.fromisoformat(row["date"])
                amount = Decimal(row["variable_expense"])
                count = int(row["expense_count"])
                flag = row["complete"].strip().lower()
                if not user or not amount.is_finite() or amount < 0 or count < 0 or flag not in {"true", "false"}:
                    raise ValueError()
                if amount > 0 and count == 0:
                    raise ValueError()
                if (user, day) in seen:
                    raise ValueError()
            except (ValueError, InvalidOperation, KeyError) as error:
                raise ValueError(f"Invalid or duplicate daily aggregate at line {line}.") from error
            seen.add((user, day))
            records.append(Day(user, day, amount, count, flag == "true"))
    return records


def prediction(history, first_target, horizon=7):
    """Reads strictly earlier dates only, using 28–56 consecutive confirmed days."""
    by_date = {row.date: row for row in history if row.date < first_target}
    days = []
    cursor = first_target - timedelta(days=1)
    while len(days) < 56 and cursor in by_date and by_date[cursor].complete:
        days.append(by_date[cursor])
        cursor -= timedelta(days=1)
    if len(days) < 28 or sum(row.count for row in days) < 12:
        return None
    totals = [Decimal(0)] * 7
    counts = [0] * 7
    for row in days:
        totals[row.date.weekday()] += row.amount
        counts[row.date.weekday()] += 1
    return sum((totals[(first_target + timedelta(days=i)).weekday()] /
                counts[(first_target + timedelta(days=i)).weekday()] for i in range(horizon)), Decimal(0))


def evaluate(records, from_date, horizon=7):
    if not 1 <= horizon <= 31:
        raise ValueError("Choose a horizon between 1 and 31 days.")
    groups = {}
    for row in records:
        group = groups.setdefault(row.user, {})
        if row.date in group:
            raise ValueError("Duplicate user/date aggregate.")
        group[row.date] = row
    errors, actuals = [], []
    eligible_users = 0
    for rows in groups.values():
        evaluated = False
        for origin in sorted(day for day in rows if day >= from_date):
            future = [rows.get(origin + timedelta(days=i)) for i in range(horizon)]
            if any(row is None or not row.complete for row in future):
                continue
            predicted = prediction(rows.values(), origin, horizon)
            if predicted is None:
                continue
            actual = sum((row.amount for row in future), Decimal(0))
            errors.append(abs(predicted - actual))
            actuals.append(actual)
            evaluated = True
        eligible_users += int(evaluated)
    if not errors:
        raise ValueError("No eligible chronological windows: supply complete history and future evaluation dates.")
    total_actual = sum(actuals)
    return {
        "method_version": VERSION,
        "method_type": "statistical_baseline",
        "trained_model": False,
        "forecast_horizon_days": horizon,
        "evaluation_from": from_date.isoformat(),
        "windows": len(errors),
        "users_with_eligible_windows": eligible_users,
        "rupee_mae": float(sum(errors) / len(errors)),
        "wape": float(sum(errors) / total_actual) if total_actual else None,
        "interval_coverage": None,
        "promotion_status": "manual_review_required",
        "limitations": ["Overlapping windows are correlated, not independent experiments.",
                        "Reconciled variable INR spending only; evaluate bill matching separately.",
                        "No calibrated interval or causal savings claim.",
                        "No trained challenger, held-out-user validation, or automatic promotion in this runner."],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv")
    parser.add_argument("--from-date", required=True, type=date.fromisoformat)
    parser.add_argument("--horizon", type=int, default=7)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = evaluate(load(args.csv), args.from_date, args.horizon)
    result["data_sha256"] = hashlib.sha256(Path(args.csv).read_bytes()).hexdigest()
    # Reports deliberately exclude account identifiers and financial descriptions.
    Path(args.output).write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(f"Evaluated {result['windows']} chronological windows; report written.")


if __name__ == "__main__":
    main()
