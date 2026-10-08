import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/authRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import transactionRoutes from "./routes/transactionRoutes.js"
import budgetRoutes from "./routes/budgetRoutes.js"
import insightsRoutes from "./routes/insightsRoutes.js"
import reportsRoutes from "./routes/reportsRoutes.js"
import recurringRoutes from "./routes/recurringRoutes.js"
import goalRoutes from "./routes/goalRoutes.js"
import gamificationRoutes from "./routes/gamificationRoutes.js"
import splitRoutes from "./routes/splitRoutes.js"

dotenv.config()

const app = express()

/* =====================
   Middleware
===================== */

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        process.env.FRONTEND_URL,
      ].filter(Boolean)

      const isVercel = origin && origin.endsWith(".vercel.app")

      if (
        !origin ||
        allowedOrigins.some((o) => origin.startsWith(o)) ||
        isVercel
      ) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
  }),
)

app.use(express.json())

/* =====================
   Routes
===================== */

// Render can check readiness without querying private account data.
app.get("/api/health", (_req, res) => {
  const ready = mongoose.connection.readyState === 1
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "starting" })
})

// Fail promptly while MongoDB is unavailable instead of buffering authentication queries.
app.use("/api", (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({
        message:
          "The sign-in service is reconnecting. Please try again shortly.",
      })
  }
  next()
})

app.use("/api/auth", authRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api", transactionRoutes)
app.use("/api/budget", budgetRoutes)
app.use("/api/insights", insightsRoutes)
app.use("/api/reports", reportsRoutes)
app.use("/api/recurring", recurringRoutes)
app.use("/api/goals", goalRoutes)
app.use("/api/gamification", gamificationRoutes)
app.use("/api/splits", splitRoutes)

/* =====================
   Mongo + Server
===================== */

const PORT = process.env.PORT || 5001

const startServer = async () => {
  let server
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in .env")
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing in environment")
    }

    // Bind before connecting so readiness checks receive a response during startup.
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`)
    })

    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
    })

    console.log("✅ MongoDB Connected")
    console.log("📦 DB Name:", mongoose.connection.name)
  } catch (err) {
    console.error("❌ Mongo connection error:", err.message)
    server?.close()
    process.exit(1)
  }
}

startServer()
