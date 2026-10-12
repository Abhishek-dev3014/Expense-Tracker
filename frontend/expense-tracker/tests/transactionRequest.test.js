import test from "node:test"
import assert from "node:assert/strict"
import { updateTransaction } from "../src/utils/transactionRequest.js"

const url = "https://api.example.test/api/transactions/0123456789abcdef01234567"
const values = { title: "Haircut", amount: 200, category: "Personal care", date: "2026-10-11" }

test("saves one update with authentication and returns the saved transaction", async (t) => {
  const saved = { ...values, _id: "0123456789abcdef01234567", amount: -200 }
  let calls = 0
  t.mock.method(globalThis, "fetch", async (endpoint, options) => {
    calls++
    assert.equal(endpoint, url)
    assert.equal(options.method, "PUT")
    assert.equal(options.headers.Authorization, "Bearer test-token")
    assert.deepEqual(JSON.parse(options.body), values)
    return Response.json(saved)
  })
  assert.deepEqual(await updateTransaction(url, values, "test-token"), saved)
  assert.equal(calls, 1)
})

test("explains the deployed Express HTML 404 instead of asking users to retry", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response("<!DOCTYPE html><pre>Cannot PUT /api/transactions/0123456789abcdef01234567</pre>", { status: 404 }),
  )
  await assert.rejects(updateTransaction(url, values, "test-token"), /service needs to be updated/)
})

test("distinguishes an unavailable route from a deleted or inaccessible transaction", async (t) => {
  for (const [status, message, expected] of [
    [404, "Endpoint not found.", /service needs to be updated/],
    [405, "HTTP method not allowed.", /service needs to be updated/],
    [404, "Transaction not found.", /Transaction not found/],
    [400, "The amount cannot be less than existing splits.", /existing splits/],
    [401, "Unauthorized", /sign in again/],
  ]) {
    t.mock.method(globalThis, "fetch", async () => Response.json({ message }, { status }))
    await assert.rejects(updateTransaction(url, values, "test-token"), expected)
  }
})

test("never reports success for HTML or an unconfirmed response", async (t) => {
  for (const body of ["<html>Proxy page</html>", JSON.stringify({ message: "ok" }), "null"]) {
    t.mock.method(globalThis, "fetch", async () => new Response(body))
    await assert.rejects(updateTransaction(url, values, "test-token"), /did not confirm/)
  }
})

test("network failures retain an actionable connection error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch") })
  await assert.rejects(updateTransaction(url, values, "test-token"), /Check your connection/)
})
