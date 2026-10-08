import { useEffect, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  PieChart,
  RefreshCw,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { useAuth } from "../../context/AuthContext"
import { BASE_URL } from "../../utils/apiPaths"
import { buildOverview, expensePage, formatCurrency } from "../../utils/finance"
import StatsGrid from "../../components/dashboard/StatsGrid"
import TransactionsTable from "../../components/dashboard/TransactionsTable"
import UpcomingBills from "../../components/dashboard/UpcomingBills"
import BudgetHealthCard from "../../components/dashboard/BudgetHealthCard"

const COLORS = ["#365e43", "#8b9d73", "#c2ad88", "#a5b9b0", "#d4c8af"]
const ChartTooltip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p
          key={item.dataKey}
          style={{ color: item.dataKey === "income" ? "#365e43" : "#798759" }}
        >
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  ) : null

export default function Home() {
  const { expensesOnly = false } = useOutletContext() || {}
  const { token } = useAuth()
  const authToken = token || localStorage.getItem("token")
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const requestPage = expensesOnly ? 1 : page
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener("transactions-updated", refresh)
    return () => window.removeEventListener("transactions-updated", refresh)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(
          `${BASE_URL}/api/dashboard?page=${requestPage}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            signal: controller.signal,
          },
        )
        if (!response.ok)
          throw new Error(
            "We couldn’t load your overview. Please check your connection and try again.",
          )
        setData(buildOverview(await response.json()))
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [requestPage, authToken, revision])
  if (error)
    return (
      <div className="panel empty-state" role="alert">
        <ChartNoAxesColumnIncreasing size={28} />
        <strong>Your overview is temporarily unavailable</strong>
        <p>{error}</p>
        <button
          className="btn"
          style={{ marginTop: 18 }}
          onClick={() => setRevision((x) => x + 1)}
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    )
  if (!data)
    return (
      <div className="space-y-5" aria-label="Loading overview" role="status">
        <div
          className={`stats-grid${expensesOnly ? " stats-grid-expenses" : ""}`}
        >
          {(expensesOnly ? [1, 2, 3] : [1, 2, 3, 4]).map((x) => (
            <div key={x} className="panel h-36 animate-pulse bg-stone-100" />
          ))}
        </div>
        <div className="overview-grid">
          <div className="panel h-80 animate-pulse" />
          <div className="panel h-80 animate-pulse" />
        </div>
        <span className="sr-only">Loading your financial overview</span>
      </div>
    )
  const { monthlyIncome, monthlyExpense, months, categories } = data
  const net = monthlyIncome - monthlyExpense
  const hasChartData = months.some(
    (month) => month.expense || (!expensesOnly && month.income),
  )
  const activity = expensesOnly
    ? expensePage(data.allTransactions, page)
    : {
        transactions: data.transactions || [],
        currentPage: page,
        totalPages: data.totalPages || 1,
      }
  return (
    <div className="space-y-5" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold" style={{ color: "#5a6857" }}>
          At a glance
        </h2>
        <span
          className="flex items-center gap-2 text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          <CalendarDays size={12} />
          {new Date().toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <StatsGrid data={data} expensesOnly={expensesOnly} />
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {expensesOnly
                  ? "Your spending over time"
                  : "Money in, money out"}
              </h2>
              <p>
                {expensesOnly
                  ? "Monthly expenses over the last 6 months"
                  : "Your cash flow over the last 6 months"}
              </p>
            </div>
            <div className="chart-legend">
              {!expensesOnly && (
                <span className="legend-key">
                  <i className="dot" style={{ background: "#365e43" }} />
                  Income
                </span>
              )}
              <span className="legend-key">
                <i className="dot" style={{ background: "#c5d1ae" }} />
                Expenses
              </span>
            </div>
          </div>
          {hasChartData ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months}
                  barGap={5}
                  margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#edf0e8"
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#899180", fontSize: 10 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#899180", fontSize: 9 }}
                    tickFormatter={(v) =>
                      v >= 100000
                        ? `₹${v / 100000}L`
                        : v >= 1000
                          ? `₹${v / 1000}k`
                          : `₹${v}`
                    }
                    width={53}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f7f9f3" }}
                  />
                  {!expensesOnly && (
                    <Bar
                      isAnimationActive={false}
                      name="Income"
                      dataKey="income"
                      fill="#365e43"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={23}
                    />
                  )}
                  <Bar
                    isAnimationActive={false}
                    name="Expenses"
                    dataKey="expense"
                    fill="#c5d1ae"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={23}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="empty-state"
              style={{
                height: 260,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <ChartNoAxesColumnIncreasing size={30} />
              <strong>
                {expensesOnly
                  ? "Your spending starts here"
                  : "Your cash flow starts here"}
              </strong>
              <p>
                {expensesOnly
                  ? "Add an expense to see your spending over time."
                  : "Add transactions to see your income and spending over time."}
              </p>
            </div>
          )}
          <div className="cashflow-footer">
            <span>
              {expensesOnly ? (
                "Every expense helps you understand your spending."
              ) : monthlyIncome > 0 ? (
                <>
                  <strong>
                    {Math.abs(Math.round((net / monthlyIncome) * 100))}%
                  </strong>{" "}
                  of this month’s income {net >= 0 ? "saved" : "overspent"}
                </>
              ) : (
                "Your monthly savings will appear as you add income"
              )}
            </span>
            <Link className="text-link" to="/dashboard/analytics">
              View analytics <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Where your money goes</h2>
              <p>Spending by category · This month</p>
            </div>
            <PieChart size={17} color="#89977e" />
          </div>
          {categories.length ? (
            <>
              <div className="spend-total">
                <strong>{formatCurrency(monthlyExpense)}</strong>
                <span>total spent</span>
              </div>
              <div className="category-list">
                {categories.map((category, index) => (
                  <div className="category-row" key={category.name}>
                    <div className="category-row-header">
                      <span>
                        <i
                          className="dot"
                          style={{ background: COLORS[index] }}
                        />
                        {category.name}
                      </span>
                      <strong>
                        {formatCurrency(category.value)}{" "}
                        <span
                          style={{
                            display: "inline",
                            color: "var(--muted)",
                            fontSize: 10,
                            fontWeight: 400,
                            marginLeft: 5,
                          }}
                        >
                          {Math.round((category.value / monthlyExpense) * 100)}%
                        </span>
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(category.value / monthlyExpense) * 100}%`,
                          background: COLORS[index],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ paddingTop: 65 }}>
              <PieChart size={29} />
              <strong>No spending this month</strong>
              <p>Your categories will appear with your first expense.</p>
            </div>
          )}
        </section>
      </div>
      <div className="overview-grid" style={{ alignItems: "start" }}>
        <TransactionsTable
          expensesOnly={expensesOnly}
          transactions={activity.transactions}
          page={activity.currentPage}
          totalPages={activity.totalPages}
          onPrev={() => setPage(Math.max(1, activity.currentPage - 1))}
          onNext={() =>
            setPage(Math.min(activity.currentPage + 1, activity.totalPages))
          }
        />
        <div className="overview-stack">
          <BudgetHealthCard
            totalExpense={monthlyExpense}
            budgetLimit={data.monthlyBudgetLimit}
            avgDailyExpense={data.averageDailyExpense}
          />
          <UpcomingBills revision={revision} />
        </div>
      </div>
      <div className="overview-footer">
        <span
          className="dot"
          style={{ background: "#95a585", width: 5, height: 5 }}
        />
        A clearer picture. A little more peace of mind.
      </div>
    </div>
  )
}
