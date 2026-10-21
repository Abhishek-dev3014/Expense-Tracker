import test from "node:test"
import assert from "node:assert/strict"
import { parseStatementCsv, importTransactions } from "../src/utils/importTransactions.js"

const mapping = { title: "Description", amount: "Amount", date: "Date", type: "expense" }
test("quoted bank descriptions survive CSV parsing and expenses request prediction", () => {
  const { headers, data } = parseStatementCsv('\uFEFFDate,Description,Amount\r\n2026-10-17,"Uber travel, airport","1,200"\r\n2026-10-17,"Milk and ""bread""",50')
  const transactions = importTransactions(headers, data, mapping)
  assert.deepEqual(transactions[0], { title: "Uber travel, airport", amount: 1200, type: "expense", date: "2026-10-17T00:00:00.000Z" })
  assert.equal(transactions[1].title, 'Milk and "bread"')
  assert.equal(Object.hasOwn(transactions[0], "category"), false)
})
test("positive expense amounts stay expenses; signed statements require explicit selection", () => {
  const headers = ["Date", "Description", "Amount"]
  const rows = [["2026-10-17", "Uber", "120"], ["2026-10-17", "Lunch", "-90"]]
  assert.deepEqual(importTransactions(headers, rows, mapping).map(t => t.type), ["expense", "expense"])
  assert.deepEqual(importTransactions(headers, rows, { ...mapping, type: "signed" }).map(t => t.type), ["income", "expense"])
})
test("malformed CSV and invalid values fail before anything is imported", () => {
  assert.throws(() => parseStatementCsv('Date,Description\n"incomplete'), /incomplete/)
  assert.throws(() => parseStatementCsv('Date,Description\n2026-10-17,Uber,100'), /same columns/)
  for (const amount of ["", "oops", "0", "100oops"]) {
    assert.throws(() => importTransactions(["Date", "Description", "Amount"], [["2026-10-17", "Uber", amount]], mapping), /CSV row 2/)
  }
})
