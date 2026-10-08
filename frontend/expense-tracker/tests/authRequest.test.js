import test from "node:test"
import assert from "node:assert/strict"
import { authenticate } from "../src/utils/authRequest.js"

const url = "https://api.example.test/api/auth/login"
const credentials = { email: "test@example.test", password: "test-password" }

test("submits credentials once and returns the session token", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", async (endpoint, options) => {
    calls++
    assert.equal(endpoint, url)
    assert.deepEqual(JSON.parse(options.body), credentials)
    return new Response(JSON.stringify({ token: "test-token" }))
  })
  assert.equal(await authenticate(url, credentials), "test-token")
  assert.equal(calls, 1)
})

test("preserves actionable duplicate-account and incorrect-password messages", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ message: "Please sign in instead." }), {
        status: 409,
      }),
  )
  await assert.rejects(authenticate(url, credentials), /Please sign in instead/)
})

test("handles HTML gateway errors without exposing a JSON parser exception", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>Bad Gateway</html>", { status: 502 }),
  )
  await assert.rejects(
    authenticate(url, credentials),
    /temporarily unavailable/,
  )
})

test("does not authenticate a successful response without a token", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ message: "ok" })),
  )
  await assert.rejects(
    authenticate(url, credentials),
    /did not complete sign-in/,
  )
})

test("hung requests time out without retrying sign-up", async (t) => {
  let calls = 0
  t.mock.method(globalThis, "fetch", (_url, { signal }) => {
    calls++
    return new Promise((_, reject) =>
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      ),
    )
  })
  await assert.rejects(
    authenticate(url, credentials, { timeoutMs: 15 }),
    /taking too long/,
  )
  assert.equal(calls, 1)
})

test("the timeout also covers a stalled response body", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => ({
    ok: true,
    text: () =>
      new Promise((_, reject) =>
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      ),
  }))
  await assert.rejects(
    authenticate(url, credentials, { timeoutMs: 15 }),
    /taking too long/,
  )
})

test("cancels an obsolete request when the user leaves the form", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_, reject) =>
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      ),
  )
  const controller = new AbortController()
  const pending = authenticate(url, credentials, { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, { name: "AbortError" })
})

test("network failures explain that the sign-in service is unreachable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch")
  })
  await assert.rejects(
    authenticate(url, credentials),
    /can’t reach the sign-in service/,
  )
})
