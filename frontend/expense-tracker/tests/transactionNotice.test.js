import test from "node:test"
import assert from "node:assert/strict"
import { transactionNotice } from "../src/utils/transactionNotice.js"

test("memory failures confirm the expense save and avoid duplicate-entry advice", () => {
  const notice = transactionNotice({ categoryRuleSaved: false, categoryStatus: "manual" })
  assert.equal(notice.kind, "warning")
  assert.match(notice.message, /Expense saved/)
  assert.match(notice.message, /Edit this expense/)
  assert.match(notice.message, /do not add it again/)
})

test("rule confirmation and remembered matches are distinct from model predictions", () => {
  assert.match(transactionNotice({ categoryRuleSaved: true }).message, /remembered for this description/)
  assert.match(transactionNotice({ categoryStatus: "remembered" }).message, /using your remembered category/)
  assert.equal(transactionNotice({ categoryStatus: "predicted" }).message, "Expense added")
  assert.equal(transactionNotice({}, "income", true).message, "Changes saved")
})

test("uncertain or unavailable predictions still confirm the expense was saved", () => {
  for (const categoryStatus of ["needs_review", "unavailable"]) {
    const notice = transactionNotice({ categoryStatus })
    assert.equal(notice.kind, "warning")
    assert.match(notice.message, /^Expense saved/)
  }
})
