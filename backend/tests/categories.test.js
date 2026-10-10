import test from "node:test"
import assert from "node:assert/strict"
import { createCategoryHandlers } from "../controllers/categoryController.js"
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } })
const request = (name, type = "expense") => ({ user: { _id: "owner" }, body: { name, type, user: "another-user" } })
test("normalizes names and scopes atomic upserts to authenticated account and type", async () => {
  let filter, update, options
  const handlers = createCategoryHandlers({ Category: { findOneAndUpdate: async (...args) => { [filter, update, options] = args; return { name: update.$setOnInsert.name } } } })
  const res = response(); await handlers.create(request("  Pet   care  "), res)
  assert.deepEqual(filter, { user: "owner", type: "expense", normalizedName: "pet care" })
  assert.equal(update.$setOnInsert.name, "Pet care"); assert.equal(options.upsert, true); assert.equal(res.body.name, "Pet care")
})
test("reuses built-in category without a database write", async () => {
  const res = response(); await createCategoryHandlers({ Category: {} }).create(request(" fOoD "), res)
  assert.deepEqual(res.body, { name: "Food" })
})
test("invalid names and transaction types never reach database", async () => {
  const handlers = createCategoryHandlers({ Category: {} })
  for (const [name, type] of [[" ", "expense"], ["x".repeat(41), "income"], ["Pet", "bad"], [{ name: "Pet" }, "expense"], ["a\u200bb", "expense"]]) {
    const res = response(); await handlers.create(request(name, type), res); assert.equal(res.statusCode, 400)
  }
})
test("list requests only the authenticated account and requested type", async () => {
  let filter
  const Category = { find(query) { filter = query; return { sort() { return { lean: async () => [{ name: "Pets" }] } } } } }
  const res = response()
  await createCategoryHandlers({ Category }).list({ user: { _id: "owner" }, query: { type: "expense", user: "attacker" } }, res)
  assert.deepEqual(filter, { user: "owner", type: "expense" }); assert.deepEqual(res.body, { categories: ["Pets"] })
})
test("concurrent duplicate creation returns existing canonical name", async () => {
  const Category = { findOneAndUpdate: async () => { throw { code: 11000 } }, findOne: async () => ({ name: "Pet care" }) }
  const res = response(); await createCategoryHandlers({ Category }).create(request("PET CARE"), res)
  assert.equal(res.body.name, "Pet care")
})
test("database errors do not leak internal details", async () => {
  const Category = { findOneAndUpdate: async () => { throw new Error("private connection string") } }
  const res = response(); await createCategoryHandlers({ Category }).create(request("Pets"), res)
  assert.equal(res.statusCode, 503); assert.equal(res.body.message.includes("private"), false)
})
