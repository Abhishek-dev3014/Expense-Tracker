import test from "node:test"
import assert from "node:assert/strict"
import { transactionParams, transactionDay } from "../src/utils/transactionFilters.js"

const bounds = (period, now) => {
  const params = transactionParams({ period }, now)
  return [new Date(params.get("startDate")), new Date(params.get("endDate"))]
}

test("all-time filtering sends all selected constraints and omits date bounds", () => {
  const params = transactionParams({ page: 3, search: "tea & coffee", type: "expense", category: "Outside food" })
  assert.deepEqual(Object.fromEntries(params), { page: "3", search: "tea & coffee", type: "expense", category: "Outside food" })
  assert.equal(transactionParams({ type: "all" }).has("type"), false)
})

test("today includes the full local calendar day", () => {
  const [start, end] = bounds("today", new Date(2026, 9, 14, 1, 30))
  assert.equal(+start, +new Date(2026, 9, 14))
  assert.equal(+end, +new Date(2026, 9, 14, 23, 59, 59, 999))
})

test("month boundaries remain correct on the last day of the month", () => {
  const [start, end] = bounds("month", new Date(2026, 11, 31))
  assert.equal(+start, +new Date(2026, 11, 1))
  assert.equal(+end, +new Date(2026, 11, 31, 23, 59, 59, 999))
})

test("last month handles year rollover and leap February", () => {
  for (const [now, expectedStart, expectedEnd] of [
    [new Date(2026, 0, 31), new Date(2025, 11, 1), new Date(2025, 11, 31, 23, 59, 59, 999)],
    [new Date(2024, 2, 31), new Date(2024, 1, 1), new Date(2024, 1, 29, 23, 59, 59, 999)],
  ]) {
    const [start, end] = bounds("lastMonth", now)
    assert.equal(+start, +expectedStart)
    assert.equal(+end, +expectedEnd)
  }
})

test("last seven days includes today and six previous calendar days", () => {
  const [start, end] = bounds("week", new Date(2026, 0, 3))
  assert.equal(+start, +new Date(2025, 11, 28))
  assert.equal(+end, +new Date(2026, 0, 3, 23, 59, 59, 999))
})

test("date groups distinguish today, yesterday, and older dates across years", () => {
  const now = new Date(2026, 0, 1, 12)
  assert.equal(transactionDay(new Date(2026, 0, 1), now), "Today")
  assert.equal(transactionDay(new Date(2025, 11, 31), now), "Yesterday")
  assert.match(transactionDay(new Date(2024, 0, 1), now), /2024/)
})
