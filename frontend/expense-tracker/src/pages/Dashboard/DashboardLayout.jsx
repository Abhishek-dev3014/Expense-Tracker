import { Outlet, Navigate, useLocation } from "react-router-dom"
import { useState, useEffect, useRef, Suspense } from "react"
import { Plus, ArrowDownLeft, CalendarDays } from "lucide-react"
import Sidebar from "../../components/dashboard/Sidebar"
import Topbar from "../../components/dashboard/Topbar"
import AddIncomeModal from "../../components/dashboard/AddIncomeModal"
import AddExpenseModal from "../../components/dashboard/AddExpenseModal"
import TutorialOverlay from "../../components/dashboard/TutorialOverlay"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import axios from "axios"

const pages = {
  "": ["Overview", "Here’s how your finances are looking this month."],
  transactions: [
    "Transactions",
    "Every income and expense, neatly in one place.",
  ],
  analytics: [
    "Analytics",
    "Understand where your money goes and how your habits change.",
  ],
  budget: ["Budgets", "Give your spending a plan and keep the month on track."],
  insights: [
    "Insights",
    "A closer look at your spending habits and opportunities to save.",
  ],
  reports: ["Reports", "Review and export a clear picture of your finances."],
  recurring: [
    "Recurring payments",
    "Stay on top of subscriptions, bills, and regular income.",
  ],
  goals: [
    "Savings goals",
    "Make steady progress toward the things that matter.",
  ],
  achievements: [
    "Achievements",
    "The good habits you are building, one day at a time.",
  ],
  debts: ["Shared expenses", "Keep shared costs and balances easy to follow."],
}

function readOverviewPreference(key) {
  try {
    return key && localStorage.getItem(key) === "expenses"
  } catch {
    return false
  }
}

export default function DashboardLayout() {
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contentRevision, setContentRevision] = useState(0)
  const { token, user, completeTutorial } = useAuth()
  const [overviewPreference, setOverviewPreference] = useState(null)
  const preferenceKey = user?._id ? `overview_view_${user._id}` : null
  const expensesOnly =
    overviewPreference?.key === preferenceKey
      ? overviewPreference.expensesOnly
      : readOverviewPreference(preferenceKey)
  const changeOverview = (value) => {
    setOverviewPreference({ key: preferenceKey, expensesOnly: value })
    try {
      if (preferenceKey)
        localStorage.setItem(preferenceKey, value ? "expenses" : "full")
    } catch {
      // The view still works when browser storage is unavailable.
    }
  }
  const location = useLocation()
  const mobileNav = useRef(null)
  const authToken = token || localStorage.getItem("token")
  const section = location.pathname.split("/")[2] || ""
  const [title, subtitle] = pages[section] || pages[""]

  useEffect(() => {
    const refresh = () => setContentRevision((value) => value + 1)
    window.addEventListener("transactions-updated", refresh)
    return () => window.removeEventListener("transactions-updated", refresh)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const previousFocus = document.activeElement
    const focusable = () => [
      ...mobileNav.current.querySelectorAll("button, a[href]"),
    ]
    focusable()[0]?.focus()
    const keydown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false)
      if (event.key === "Tab") {
        const items = focusable()
        const first = items[0],
          last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", keydown)
    return () => {
      document.removeEventListener("keydown", keydown)
      document.body.style.overflow = oldOverflow
      previousFocus?.focus()
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (!authToken) return
    const headers = { Authorization: `Bearer ${authToken}` }
    const sync = async () => {
      try {
        await axios.post(`${BASE_URL}/api/recurring/process`, {}, { headers })
      } catch (err) {
        console.error("Recurring payments:", err)
      } finally {
        window.dispatchEvent(new Event("transactions-updated"))
      }
      try {
        await axios.post(
          `${BASE_URL}/api/gamification/check-streak`,
          {},
          { headers },
        )
        await axios.post(
          `${BASE_URL}/api/gamification/sync-badges`,
          {},
          { headers },
        )
      } catch (err) {
        console.error("Progress sync:", err)
      }
    }
    sync()
  }, [authToken])

  if (!authToken) return <Navigate to="/login" replace />
  const saveTransaction = async (type, data) => {
    const response = await fetch(`${BASE_URL}/api/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok)
      throw new Error(`Could not save your ${type}. Please try again.`)
    setShowIncome(false)
    setShowExpense(false)
    window.dispatchEvent(new Event("transactions-updated"))
  }
  return (
    <div className="dashboard-root">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to content
      </a>
      <div className="sidebar-container sidebar-desktop">
        <Sidebar />
      </div>
      {sidebarOpen && (
        <>
          <button
            className="sidebar-overlay"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            ref={mobileNav}
            className="sidebar-container sidebar-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
      <div className="main-content" inert={sidebarOpen ? true : undefined}>
        <Topbar title={title} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="main-scroller" id="main-content">
          <div className="page-header">
            <div>
              <h1>
                {!section
                  ? `Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`
                  : title}
                {!section && <span style={{ color: "#3265df" }}>.</span>}
              </h1>
              <p>
                {!section && expensesOnly
                  ? "Keep track of your spending. No income entry needed."
                  : subtitle}
              </p>
            </div>
            <div className="page-actions">
              {(section || !expensesOnly) && (
                <button onClick={() => setShowIncome(true)} className="btn">
                  <ArrowDownLeft size={15} />
                  Add income
                </button>
              )}
              <button
                onClick={() => setShowExpense(true)}
                className="btn btn-primary"
              >
                <Plus size={15} />
                Add expense
              </button>
            </div>
          </div>
          {!section && (
            <div className="overview-view-control">
              <div
                className="view-switcher"
                role="group"
                aria-label="Overview view"
              >
                <button
                  type="button"
                  aria-pressed={!expensesOnly}
                  onClick={() => changeOverview(false)}
                >
                  Full overview
                </button>
                <button
                  type="button"
                  aria-pressed={Boolean(expensesOnly)}
                  onClick={() => changeOverview(true)}
                >
                  Expenses only
                </button>
              </div>
              <span className="period-label">
                <CalendarDays size={14} />
                {new Date().toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <div
            key={`${location.pathname}:${!section ? Boolean(expensesOnly) : section !== "transactions" ? contentRevision : ""}`}
            className="page-enter"
          >
            <Suspense
              fallback={
                <div className="empty-state" role="status">
                  Loading your workspace…
                </div>
              }
            >
              <Outlet context={{ expensesOnly: Boolean(expensesOnly) }} />
            </Suspense>
          </div>
        </main>
      </div>
      {showIncome && (
        <AddIncomeModal
          onClose={() => setShowIncome(false)}
          onSubmit={(data) => saveTransaction("income", data)}
        />
      )}
      {showExpense && (
        <AddExpenseModal
          onClose={() => setShowExpense(false)}
          onSubmit={(data) => saveTransaction("expense", data)}
        />
      )}
      {user &&
        !user.hasSeenTutorial &&
        !localStorage.getItem(`tutorial_seen_${user._id}`) && (
          <TutorialOverlay onComplete={completeTutorial} />
        )}
    </div>
  )
}
