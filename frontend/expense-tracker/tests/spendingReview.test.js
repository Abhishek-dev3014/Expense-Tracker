import test from "node:test";
import assert from "node:assert/strict";
import { spendingRequest, spendingLabel } from "../src/utils/spendingReview.js";
test("a spending suggestion sends description and authentication without selecting another account", async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/spending-review/suggest"));
      assert.equal(options.headers.Authorization, "Bearer personal-session");
      assert.deepEqual(JSON.parse(options.body), { description: "milk" });
      return new Response(
        JSON.stringify({ value: "good", source: "your_rule" }),
        { status: 200 },
      );
    };
    assert.equal(
      (
        await spendingRequest("/suggest", {
          token: "personal-session",
          method: "POST",
          body: { description: "milk" },
        })
      ).value,
      "good",
    );
  } finally {
    globalThis.fetch = before;
  }
});
test("an unavailable suggestion service leaves a useful explanation for saving expenses", async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Endpoint not found." }), {
        status: 404,
      });
    await assert.rejects(
      spendingRequest("/suggest"),
      /still save and edit expenses/,
    );
  } finally {
    globalThis.fetch = before;
  }
});
test("removing a preference accepts an empty acknowledgement but a malformed success is not confirmed", async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(
      await spendingRequest("/rules/id", { method: "DELETE" }),
      null,
    );
    globalThis.fetch = async () =>
      new Response("<html>Gateway</html>", { status: 200 });
    await assert.rejects(spendingRequest(), /incomplete spending review/);
  } finally {
    globalThis.fetch = before;
  }
});
test("ratings are personal labels and missing reviews remain separate", () => {
  assert.equal(spendingLabel("good"), "Good for me");
  assert.equal(spendingLabel("fine"), "Fine for me");
  assert.equal(spendingLabel("improve"), "Could improve");
  assert.equal(spendingLabel(null), "Not rated");
});
