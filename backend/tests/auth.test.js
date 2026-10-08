import test from "node:test"
import assert from "node:assert/strict"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { createAuthHandlers } from "../controllers/authController.js"

const secret = "local-test-secret-not-for-production"
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
})
const handlers = (User) =>
  createAuthHandlers({ User, bcrypt, jwt, getSecret: () => secret })

test("signup normalizes email, accepts only account fields, and issues a valid token", async () => {
  let saved
  const { signup } = handlers({
    create: async (data) => {
      saved = data
      return { _id: "test-user" }
    },
  })
  const res = response()
  await signup(
    {
      body: {
        name: "  Test User  ",
        email: "  TEST@Example.test  ",
        password: "pass1234",
        badges: ["fake"],
        hasSeenTutorial: true,
      },
    },
    res,
  )
  assert.equal(res.statusCode, 201)
  assert.deepEqual(saved, {
    name: "Test User",
    email: "test@example.test",
    password: "pass1234",
  })
  assert.equal(jwt.verify(res.body.token, secret).id, "test-user")
})

test("login normalizes email and verifies the hashed password", async () => {
  const hash = await bcrypt.hash("pass1234", 4)
  const { login } = handlers({
    findOne: async (query) => {
      assert.deepEqual(query, { email: "test@example.test" })
      return { _id: "test-user", password: hash }
    },
  })
  const res = response()
  await login(
    { body: { email: " Test@Example.test ", password: "pass1234" } },
    res,
  )
  assert.equal(res.statusCode, 200)
  assert.equal(jwt.verify(res.body.token, secret).id, "test-user")
})

test("incorrect passwords receive a completed 401 response", async () => {
  const hash = await bcrypt.hash("pass1234", 4)
  const { login } = handlers({
    findOne: async () => ({ _id: "test-user", password: hash }),
  })
  const res = response()
  await login(
    { body: { email: "test@example.test", password: "wrong-password" } },
    res,
  )
  assert.equal(res.statusCode, 401)
  assert.match(res.body.message, /Incorrect email or password/)
})

test("duplicate registration returns 409 instead of an unhandled rejection", async () => {
  const { signup } = handlers({
    create: async () => {
      throw Object.assign(new Error("database internals"), { code: 11000 })
    },
  })
  const res = response()
  await signup(
    {
      body: { name: "Test", email: "test@example.test", password: "pass1234" },
    },
    res,
  )
  assert.equal(res.statusCode, 409)
  assert.match(res.body.message, /sign in instead/)
})

test("database outages return a recoverable response for both auth routes", async () => {
  const fail = async () => {
    throw Object.assign(new Error("private connection string"), {
      name: "MongoServerSelectionError",
    })
  }
  const auth = handlers({ create: fail, findOne: fail })
  for (const handler of [auth.signup, auth.login]) {
    const res = response()
    await handler(
      {
        body: {
          name: "Test",
          email: "test@example.test",
          password: "pass1234",
        },
      },
      res,
    )
    assert.equal(res.statusCode, 503)
    assert.match(res.body.message, /reconnecting/)
    assert.doesNotMatch(res.body.message, /private/)
  }
})

test("invalid payloads never reach the database", async () => {
  const fail = async () => {
    assert.fail("Database should not be called")
  }
  const auth = handlers({ create: fail, findOne: fail })
  for (const body of [
    undefined,
    {},
    { email: { $ne: null }, password: "pass1234" },
    { email: "not-an-email", password: "x" },
  ]) {
    for (const handler of [auth.signup, auth.login]) {
      const res = response()
      await handler({ body }, res)
      assert.equal(res.statusCode, 400)
    }
  }
})

test("missing signing configuration fails before creating an account", async () => {
  const auth = createAuthHandlers({
    User: { create: async () => assert.fail("Account must not be created") },
    bcrypt,
    jwt,
    getSecret: () => undefined,
  })
  const res = response()
  await auth.signup(
    {
      body: { name: "Test", email: "test@example.test", password: "pass1234" },
    },
    res,
  )
  assert.equal(res.statusCode, 503)
})
