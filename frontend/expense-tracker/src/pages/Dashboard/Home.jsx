import { useEffect, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import {
  ArrowRight,
  ArrowUpRight,
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
import EditTransactionModal from "../../components/dashboard/EditTransactionModal"
import CategoryTransactionsModal from "../../components/dashboard/CategoryTransactionsModal"
import UpcomingBills from "../../components/dashboard/UpcomingBills"
import BudgetHealthCard from "../../components/dashboard/BudgetHealthCard"
import useReducedMotion from "../../hooks/useReducedMotion"

const COLORS = ["#49765a", "#b5a6ca", "#d4ad72", "#a6bc87", "#dba99a"]
const ChartTooltip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p
          key={item.dataKey}
          style={{ color: item.dataKey === "income" ? "#39795a" : "#697d41" }}
        >
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  ) : null

export default function Home() {
  const reducedMotion = useReducedMotion()
  const [chartMonths, setChartMonths] = useState(1)
  const [visibleSeries, setVisibleSeries] = useState({ income: true, expense: true })
  const { expensesOnly = false, onAddExpense } = useOutletContext() || {}
  const { token } = useAuth()
  const authToken = token || localStorage.getItem("token")
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
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
  const chartData = chartMonths === 1 ? data.days : months.slice(-chartMonths)
  const toggleSeries = (series) => {
    setVisibleSeries((current) => {
      const other = series === "income" ? "expense" : "income"
      return current[series] && !current[other]
        ? current
        : { ...current, [series]: !current[series] }
    })
  }
  const net = monthlyIncome - monthlyExpense
  const hasChartData = chartData.some(
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
    <div className="space-y-5 overview-home" aria-busy={loading}>
      <StatsGrid data={data} expensesOnly={expensesOnly} />
      <div className="spending-context">
        <span className="context-icon"><ChartNoAxesColumnIncreasing size={19} /></span>
        <div>
          <strong>{categories.length ? `${categories[0].name} is your largest spending category` : "A little tracking goes a long way"}</strong>
          <p>{categories.length
            ? `${formatCurrency(categories[0].value)} · ${Math.round(categories[0].value / monthlyExpense * 100)}% of this month’s spending. ${data.monthlyExpenseCount} expenses recorded this month.`
            : "Start with your latest expense. Your overview will grow with you."}</p>
        </div>
        {categories.length ? <button className="text-link" onClick={() => setSelectedCategory(categories[0])}>Review spending <ArrowRight size={14} /></button>
          : <button className="text-link" onClick={onAddExpense}>Add an expense <ArrowRight size={14} /></button>}
      </div>
      <div className="overview-grid">
        <TransactionsTable
          onEdit={setEditingTransaction}
          onAddExpense={onAddExpense}
          expensesOnly={expensesOnly}
          headingAction={<Link className="text-link" to={`/dashboard/transactions${expensesOnly ? "?type=expense" : ""}`}>View all <ArrowRight size={14} /></Link>}
          transactions={activity.transactions}
          page={activity.currentPage}
          totalPages={activity.totalPages}
          onPrev={() => setPage(Math.max(1, activity.currentPage - 1))}
          onNext={() =>
            setPage(Math.min(activity.currentPage + 1, activity.totalPages))
          }
        />
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Spending breakdown</h2>
              <p>This month · Select a category to explore</p>
            </div>
            <PieChart size={17} color="#738065" />
          </div>
          {categories.length ? (
            <>
              <div className="spending-summary">
                <div className="spend-total">
                  <span>Total spent this month</span>
                  <strong>{formatCurrency(monthlyExpense)}</strong>
                </div>
                <svg
                  className="spending-ring"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  {categories.map((category, index) => (
                    <circle
                      key={`${index}-${category.name}`}
                      cx="50"
                      cy="50"
                      r="39"
                      fill="none"
                      stroke={COLORS[index]}
                      strokeWidth="13"
                      pathLength="100"
                      strokeDasharray={`${(category.value / monthlyExpense) * 100} 100`}
                      strokeDashoffset={
                        (-categories
                          .slice(0, index)
                          .reduce((sum, item) => sum + item.value, 0) /
                          monthlyExpense) *
                        100
                      }
                      transform="rotate(-90 50 50)"
                    />
                  ))}
                </svg>
              </div>
              <div className="category-list">
                {categories.map((category, index) => (
                  <button
                    type="button"
                    className="category-row category-drilldown"
                    key={`${index}-${category.name}`}
                    aria-label={`View ${category.name} transactions for ${data.spendingMonth}`}
                    aria-haspopup="dialog"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="category-row-header">
                      <span>
                        <i
                          className="dot"
                          style={{ background: COLORS[index] }}
                        />
                        {category.name}
                      </span>
                      <span className="category-row-amount">
                        <strong>
                          {formatCurrency(category.value)}{" "}
                          <span
                            style={{
                              display: "inline",
                              color: "var(--muted)",
                              fontSize: 12,
                              fontWeight: 400,
                              marginLeft: 5,
                            }}
                          >
                            {Math.round((category.value / monthlyExpense) * 100)}%
                          </span>
                        </strong>
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
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
                  </button>
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
        <section className="panel cashflow-panel">
          <div className="panel-heading">
            <div>
              <h2>{chartMonths === 1 ? "This month, day by day" : expensesOnly ? "Your spending over time" : "Cash flow"}</h2>
              <p>
                {chartMonths === 1 ? (expensesOnly ? "See which days you spend the most" : "See when your money comes in and goes out") : expensesOnly
                  ? `Monthly expenses over the last ${chartMonths} months`
                  : `Your cash flow over the last ${chartMonths} months`}
              </p>
            </div>
            <div className="chart-range" role="group" aria-label="Cash flow time range">
              {[1, 3, 6].map((range) => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={chartMonths === range}
                  aria-label={range === 1 ? "Daily totals this month" : `Last ${range} months`}
                  onClick={() => setChartMonths(range)}
                >
                  {range === 1 ? "This month" : `${range}M`}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-controls">
            <div className="chart-legend" role="group" aria-label="Visible cash flow series">
              {!expensesOnly && (
                <button
                  type="button"
                  className="legend-key legend-toggle"
                  aria-pressed={visibleSeries.income}
                  disabled={visibleSeries.income && !visibleSeries.expense}
                  onClick={() => toggleSeries("income")}
                >
                  <i className="dot" style={{ background: "#39795a" }} />
                  Income
                </button>
              )}
              <button
                type="button"
                className="legend-key legend-toggle"
                aria-pressed={expensesOnly || visibleSeries.expense}
                disabled={expensesOnly || (visibleSeries.expense && !visibleSeries.income)}
                onClick={() => toggleSeries("expense")}
              >
                <i className="dot" style={{ background: "#bbcb97" }} />
                Expenses
              </button>
            </div>
            {!expensesOnly && <span className="chart-hint">Select a legend to filter</span>}
          </div>
          {hasChartData ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  barGap={5}
                  margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#edf0e7"
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#69765f", fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#69765f", fontSize: 12 }}
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
                    cursor={{ fill: "#f4f6ee" }}
                  />
                  {!expensesOnly && (
                    <Bar
                      hide={!visibleSeries.income}
                      isAnimationActive={!reducedMotion}
                      animationDuration={650}
                      name="Income"
                      dataKey="income"
                      fill="#39795a"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                  )}
                  <Bar
                    hide={!expensesOnly && !visibleSeries.expense}
                    isAnimationActive={!reducedMotion}
                    animationDuration={650}
                    name="Expenses"
                    dataKey="expense"
                    fill="#bbcb97"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
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
          style={{ background: "#285c44", width: 5, height: 5 }}
        />
        All amounts in INR · Based on your recorded transactions
      </div>
      {selectedCategory && (
        <CategoryTransactionsModal
          category={selectedCategory}
          month={data.spendingMonth}
          onClose={() => setSelectedCategory(null)}
        />
      )}
      {editingTransaction && (
        <EditTransactionModal
          key={editingTransaction._id}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  )
}
