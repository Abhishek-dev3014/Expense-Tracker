// Dependencies are supplied by the router so error paths can be tested without a live database.
export function createAuthHandlers({
  User,
  bcrypt,
  jwt,
  getSecret = () => process.env.JWT_SECRET,
}) {
  const normalizeEmail = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : ""
  const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const databaseErrors = new Set([
    "MongoServerSelectionError",
    "MongooseServerSelectionError",
    "MongoNetworkError",
    "MongoNetworkTimeoutError",
  ])
  const fail = (error, res) => {
    if (error.code === 11000)
      return res
        .status(409)
        .json({
          message:
            "An account with this email already exists. Please sign in instead.",
        })
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: "Please check your name, email, and password." })
    if (
      databaseErrors.has(error.name) ||
      /buffering timed out/i.test(error.message || "")
    ) {
      return res
        .status(503)
        .json({
          message:
            "The sign-in service is reconnecting. Please try again shortly.",
        })
    }
    // Never send database details or credentials to the client.
    console.error("Authentication request failed:", error.name || "Error")
    return res
      .status(500)
      .json({
        message: "We couldn’t complete your request. Please try again shortly.",
      })
  }
  return {
    signup: async (req, res) => {
      const { name, password } = req.body || {}
      const email = normalizeEmail(req.body?.email)
      if (
        typeof name !== "string" ||
        !name.trim() ||
        !validEmail(email) ||
        typeof password !== "string" ||
        password.length < 6
      ) {
        return res
          .status(400)
          .json({
            message:
              "Enter your name, a valid email, and a password with at least 6 characters.",
          })
      }
      const secret = getSecret()
      if (!secret)
        return res
          .status(503)
          .json({
            message:
              "The sign-in service is temporarily unavailable. Please try again shortly.",
          })
      try {
        // Only accept the fields needed to create an account.
        const user = await User.create({ name: name.trim(), email, password })
        const token = jwt.sign({ id: user._id }, secret)
        return res.status(201).json({ token })
      } catch (error) {
        return fail(error, res)
      }
    },
    login: async (req, res) => {
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (!validEmail(email) || typeof password !== "string" || !password) {
        return res
          .status(400)
          .json({ message: "Enter your email address and password." })
      }
      const secret = getSecret()
      if (!secret)
        return res
          .status(503)
          .json({
            message:
              "The sign-in service is temporarily unavailable. Please try again shortly.",
          })
      try {
        const user = await User.findOne({ email })
        if (
          !user ||
          typeof user.password !== "string" ||
          !(await bcrypt.compare(password, user.password))
        ) {
          return res
            .status(401)
            .json({ message: "Incorrect email or password. Please try again." })
        }
        return res.json({ token: jwt.sign({ id: user._id }, secret) })
      } catch (error) {
        return fail(error, res)
      }
    },
  }
}
