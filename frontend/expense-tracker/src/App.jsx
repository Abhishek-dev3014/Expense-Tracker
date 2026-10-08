import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

import Login from "./pages/Auth/Login"
import SignUp from "./pages/Auth/SignUp"

import DashboardLayout from "./pages/Dashboard/DashboardLayout"
const Home = lazy(() => import("./pages/Dashboard/Home"))
const Analytics = lazy(() => import("./pages/Dashboard/Analytics"))
const Transactions = lazy(() => import("./pages/Dashboard/Transactions"))
const Budget = lazy(() => import("./pages/Dashboard/Budget"))
const AIInsights = lazy(() => import("./pages/Dashboard/AIInsights"))
const Reports = lazy(() => import("./pages/Dashboard/Reports"))
const Recurring = lazy(() => import("./pages/Dashboard/Recurring"))
const Goals = lazy(() => import("./pages/Dashboard/Goals"))
const Achievements = lazy(() => import("./pages/Dashboard/Achievements"))
const Debts = lazy(() => import("./pages/Dashboard/Debts"))

const App = () => {
  return (
    <Suspense
      fallback={
        <div className="empty-state" role="status">
          Loading your workspace…
        </div>
      }
    >
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="insights" element={<AIInsights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="recurring" element={<Recurring />} />
          <Route path="goals" element={<Goals />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="debts" element={<Debts />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  )
}

export default App
