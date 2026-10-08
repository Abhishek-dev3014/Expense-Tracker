import test from "node:test"
import assert from "node:assert/strict"
import { buildOverview } from "../src/utils/finance.js"

const now = new Date(2026, 0, 15)
const tx = (date, amount, type, category = "Food") => ({
  date: new Date(...date).toISOString(),
  amount,
  type,
  category,
})

test("monthly figures exclude other months and the same month in previous years", () => {
  const data = buildOverview(
    {
      totalBalance: 100000,
      allTransactions: [
        tx([2026, 0, 1], 75000, "income"),
        tx([2026, 0, 4], -10000, "expense"),
        tx([2025, 0, 1], 50000, "income"),
        tx([2025, 11, 3], -15000, "expense"),
      ],
    },
    now,
  )
  assert.equal(data.totalBalance, 100000)
  assert.equal(data.monthlyIncome, 75000)
  assert.equal(data.monthlyExpense, 10000)
  assert.equal(data.averageDailyExpense, 10000 / 15)
})

test("the six-month series crosses the year boundary and keeps missing months at zero", () => {
  const data = buildOverview(
    {
      allTransactions: [
        tx([2025, 11, 2], -300, "expense"),
        tx([2026, 0, 1], 1000, "income"),
      ],
    },
    now,
  )
  assert.deepEqual(
    data.months.map((m) => [m.year, m.monthIndex]),
    [
      [2025, 7],
      [2025, 8],
      [2025, 9],
      [2025, 10],
      [2025, 11],
      [2026, 0],
    ],
  )
  assert.equal(data.months[0].expense, 0)
  assert.equal(data.months[4].expense, 300)
  assert.equal(data.months[5].income, 1000)
})

test("explicit transaction type takes precedence over the stored amount sign", () => {
  const data = buildOverview(
    {
      allTransactions: [
        tx([2026, 0, 2], 200, "expense"),
        tx([2026, 0, 3], 1000, "income"),
      ],
    },
    now,
  )
  assert.equal(data.monthlyExpense, 200)
  assert.equal(data.monthlyIncome, 1000)
})

test("category summary preserves every rupee when small categories are grouped", () => {
  const allTransactions = [
    "Rent",
    "Food",
    "Transport",
    "Shopping",
    "Utilities",
    "Health",
  ].map((category, index) =>
    tx([2026, 0, 3], -(index + 1) * 100, "expense", category),
  )
  const data = buildOverview({ allTransactions }, now)
  assert.equal(data.categories.length, 5)
  assert.equal(data.categories[4].name, "Other categories")
  assert.equal(data.categories[4].value, 300)
  assert.equal(
    data.categories.reduce((sum, category) => sum + category.value, 0),
    data.monthlyExpense,
  )
})

test("a new account has zero values, six empty months, and no fabricated categories", () => {
  const data = buildOverview({}, now)
  assert.equal(data.monthlyExpense, 0)
  assert.equal(data.monthlyIncome, 0)
  assert.equal(data.averageDailyExpense, 0)
  assert.equal(data.months.length, 6)
  assert.deepEqual(data.categories, [])
})
