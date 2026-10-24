import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  ChevronRight,
  Info,
  CloudOff,
  Target,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { useAuth } from "../../context/AuthContext"
import LoadingState, {
  LoadingIndicator,
} from "../../components/ui/LoadingState"
import useReducedMotion from "../../hooks/useReducedMotion"
import { planningRequest, localMonth } from "../../utils/planningApi"
import { formatCurrency } from "../../utils/finance"
import "../../styles/planning.css"
import SpendingValues from "../../components/dashboard/SpendingValues"
import {
  MonthlySummary,
  RecordedInsights,
  SpendingOutlook,
  RecurringSuggestions,
} from "../../components/dashboard/AnalyticsSections"

const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })

function SavingsScenario({ data, token }) {
  const [category, setCategory] = useState(data.categories[0]?.name || "")
  const [percent, setPercent] = useState(10)
  const [goalId, setGoalId] = useState("")
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  async function calculate(event) {
    event.preventDefault()
    if (busy) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    setError("")
    setResult(null)
    try {
      setResult(
        await planningRequest("/scenarios", {
          token,
          method: "POST",
          body: {
            month: data.month,
            category,
            reductionPercent: Number(percent),
            goalId: goalId || null,
          },
          signal: controller.signal,
        }),
      )
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <section className="panel planning-section">
      <div className="planning-section-title">
        <Target size={20} />
        <div>
          <h2>Try a savings plan</h2>
          <p>Preview a smaller category spend before choosing a goal.</p>
        </div>
      </div>
      {!data.categories.length ? (
        <p className="planning-muted">
          Add an expense to explore a category scenario.
        </p>
      ) : (
        <form onSubmit={calculate} aria-busy={busy}>
          <fieldset disabled={busy} className="planning-scenario-fields">
            <label className="form-field">
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setResult(null)
                }}
              >
                {data.categories.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field" htmlFor="scenario-reduction">
              Reduce by {percent}%
              <input
                id="scenario-reduction"
                type="range"
                min="0"
                max="100"
                step="5"
                value={percent}
                onChange={(e) => {
                  setPercent(Number(e.target.value))
                  setResult(null)
                }}
              />
            </label>
            {data.goals.length > 0 && (
              <label className="form-field">
                Compare with a goal
                <select
                  value={goalId}
                  onChange={(e) => {
                    setGoalId(e.target.value)
                    setResult(null)
                  }}
                >
                  <option value="">No goal selected</option>
                  {data.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn btn-primary" type="submit">
              {busy ? (
                <LoadingIndicator>Calculating…</LoadingIndicator>
              ) : (
                "Preview change"
              )}
            </button>
          </fieldset>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="planning-scenario-result" role="status">
          <span className="planning-badge">Scenario · {data.month}</span>
          <strong>
            {formatCurrency(result.potentialReduction)} less over this recorded
            period
          </strong>
          <p>
            {formatCurrency(result.recordedSpending)} →{" "}
            {formatCurrency(result.adjustedSpending)} in {result.category}.
          </p>
          <p>{result.explanation}</p>
          {result.goalImpact && (
            <p>
              If you actually save and set aside{" "}
              {formatCurrency(result.goalImpact.possibleContribution)} for{" "}
              {result.goalImpact.name}, the remaining goal amount would change
              from {formatCurrency(result.goalImpact.remainingBefore)} to{" "}
              {formatCurrency(result.goalImpact.remainingAfter)}. No
              contribution has been recorded.
            </p>
          )}
          <Link to="/dashboard/goals">
            Choose a goal for your plan <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </section>
  )
}

function Coverage({ data, mutate, busy, expanded, onExpandedChange }) {
  const panel = useRef(null)
  useEffect(() => {
    if (expanded) {
      panel.current?.querySelector("summary")?.focus()
      panel.current?.scrollIntoView({ block: "nearest" })
    }
  }, [expanded])
  const [from, setFrom] = useState(
    data.coverage.from || data.coverage.firstRecord || data.asOf,
  )
  const [through, setThrough] = useState(data.coverage.through || data.asOf)
  const [confirmed, setConfirmed] = useState(false)
  return (
    <details
      ref={panel}
      id="analytics-tracked-dates"
      className="panel planning-section planning-coverage"
      open={expanded}
      onToggle={(event) => onExpandedChange(event.currentTarget.open)}
    >
      <summary>
        <CalendarDays size={18} /> Tracked dates{" "}
        <span>
          {data.coverage.from
            ? `${dateLabel(data.coverage.from)} – ${dateLabel(data.coverage.through)}`
            : "Not set"}
        </span>
      </summary>
      <p>
        Only confirm dates you have fully recorded and checked, including
        refunds and transfers. This avoids treating missing entries as zero
        spending.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutate("/coverage", "PUT", { from, through })
        }}
      >
        <fieldset disabled={busy} className="planning-coverage-fields">
          <label className="form-field">
            Tracked from
            <input
              type="date"
              required
              min="2000-01-01"
              max={through}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setConfirmed(false)
              }}
            />
          </label>
          <label className="form-field">
            Tracked through
            <input
              type="date"
              required
              min={from}
              max={data.asOf}
              value={through}
              onChange={(e) => {
                setThrough(e.target.value)
                setConfirmed(false)
              }}
            />
          </label>
          <label className="planning-checkbox">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I have fully tracked and reviewed this range.
          </label>
          <button className="btn" disabled={!confirmed} type="submit">
            Confirm tracked dates
          </button>
          {data.coverage.from && (
            <button
              className="text-link"
              type="button"
              onClick={() => mutate("/coverage", "DELETE")}
            >
              Clear confirmation
            </button>
          )}
        </fieldset>
      </form>
    </details>
  )
}

export default function Analytics({ initialView = "spending" }) {
  const { token } = useAuth()
  const reducedMotion = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedMonth = searchParams.get("month")
  const month =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth || "") &&
    requestedMonth >= "2000-01" &&
    requestedMonth <= localMonth()
      ? requestedMonth
      : localMonth()
  const selectedView = searchParams.get("view")
  const tab = ["spending", "review", "plan"].includes(selectedView)
    ? selectedView
    : initialView
  const [coverageExpanded, setCoverageExpanded] = useState(false)
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
    errorCode: "",
  })
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [notice, setNotice] = useState("")
  const action = useRef(null)
  useEffect(() => () => action.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(() => controller.abort(), 20000)
    async function load() {
      setState((previous) => ({
        ...previous,
        loading: true,
        error: "",
        errorCode: "",
      }))
      try {
        const data = await planningRequest(
          `?month=${encodeURIComponent(month)}`,
          { token, signal: controller.signal },
        )
        if (active) setState({ data, loading: false, error: "", errorCode: "" })
      } catch (err) {
        if (active)
          setState((previous) => ({
            ...previous,
            loading: false,
            errorCode: err.code || "",
            error:
              err.name === "AbortError"
                ? "Analytics took too long to load. Please try again."
                : err.message,
          }))
      } finally {
        clearTimeout(timer)
      }
    }
    load()
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener("transactions-updated", refresh)
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
      window.removeEventListener("transactions-updated", refresh)
    }
  }, [month, revision, token])
  async function mutate(path, method, body) {
    if (busy || state.loading) return
    const controller = new AbortController()
    action.current = controller
    setBusy(true)
    setActionError("")
    setNotice("")
    try {
      await planningRequest(path, {
        token,
        method,
        body,
        signal: controller.signal,
      })
      setNotice(
        path.includes("confirm")
          ? "Recurring schedule confirmed. No expense has been created."
          : path.includes("feedback")
            ? "Your feedback was saved."
            : "Tracking coverage updated.",
      )
      setRevision((value) => value + 1)
    } catch (err) {
      if (err.name !== "AbortError") setActionError(err.message)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  const data = state.data?.month === month ? state.data : null
  return (
    <div className="planning-page analytics-simple">
      <div className="planning-toolbar">
        <div className="planning-tabs" role="group" aria-label="Analytics view">
          {[
            ["spending", "Spending"],
            ["review", "My review"],
            ["plan", "Plan ahead"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              aria-pressed={tab === value}
              onClick={() =>
                setSearchParams(
                  (previous) => {
                    const next = new URLSearchParams(previous)
                    next.set("view", value)
                    return next
                  },
                  { replace: true },
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label className="planning-month">
          <span>Month</span>
          <input
            aria-label="Analytics month"
            type="month"
            min="2000-01"
            max={localMonth()}
            value={month}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                const selectedMonth = e.target.value
                setSearchParams(
                  (previous) => {
                    const next = new URLSearchParams(previous)
                    next.set("month", selectedMonth)
                    return next
                  },
                  { replace: true },
                )
                setCoverageExpanded(false)
                setActionError("")
                setNotice("")
              }
            }}
          />
        </label>
      </div>
      {state.error && (
        <section className="panel planning-section planning-error" role="alert">
          <span className="planning-error-icon" aria-hidden="true">
            <CloudOff size={25} />
          </span>
          <div>
            <h2>
              {state.errorCode === "ANALYTICS_UNAVAILABLE"
                ? "Analytics is unavailable"
                : "We couldn’t load Analytics"}
            </h2>
            <p>{state.error}</p>
            <div className="planning-error-actions">
              <button
                className="btn btn-primary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Try again
              </button>
              <Link className="btn" to="/dashboard/transactions">
                View transactions <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
      {!data && state.loading && (
        <LoadingState variant="chart" label="Loading your analytics…" />
      )}
      {data && (
        <>
          {(state.loading || busy) && (
            <p className="analytics-updating" role="status">
              <LoadingIndicator>Updating…</LoadingIndicator>
            </p>
          )}
          {state.error && (
            <p className="analytics-quiet-note">
              Showing your last loaded data.
            </p>
          )}
          <p className="planning-notice" role="status">
            {notice}
          </p>
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          {tab === "spending" && (
            <>
              <MonthlySummary data={data} />
              {data.categories.length ? (
                <div className="planning-two-columns">
                  <SpendingChart data={data} reducedMotion={reducedMotion} />
                  <CategoryBreakdown key={month} data={data} />
                </div>
              ) : (
                <section className="panel planning-section analytics-month-empty">
                  <h2>No expenses recorded for this month</h2>
                  <p>
                    Choose another month or add an expense to see your spending
                    breakdown.
                  </p>
                </section>
              )}
            </>
          )}
          {tab === "review" && (
            <>
              <SpendingValues key={month} month={month} />
              <RecordedInsights
                data={data}
                mutate={mutate}
                busy={busy || state.loading}
              />
            </>
          )}
          {tab === "plan" && (
            <>
              <div className="planning-two-columns analytics-planning-tools">
                <SpendingOutlook
                  data={data}
                  onReviewTracking={() => setCoverageExpanded(true)}
                />
                <SavingsScenario
                  key={`${month}:${data.categories.map((c) => `${c.name}:${c.amount}`).join("|")}:${data.goals.map((g) => `${g.id}:${g.current}:${g.target}`).join("|")}`}
                  data={data}
                  token={token}
                />
              </div>
              <RecurringSuggestions
                data={data}
                mutate={mutate}
                busy={busy || state.loading}
              />
              <Coverage
                key={`${month}:${data.coverage.from}:${data.coverage.through}`}
                data={data}
                mutate={mutate}
                busy={busy || state.loading}
                expanded={coverageExpanded}
                onExpandedChange={setCoverageExpanded}
              />
              <div className="analytics-plan-links">
                <Link to="/dashboard/budget">
                  Manage budgets <ChevronRight size={14} />
                </Link>
                <Link to="/dashboard/goals">
                  Savings goals <ChevronRight size={14} />
                </Link>
              </div>
            </>
          )}
          <details className="planning-limitations">
            <summary>
              <Info size={14} /> About these numbers
            </summary>
            <p>
              Based on your recorded INR entries through{" "}
              {dateLabel(data.periodEnd)} · {data.timezone}.
            </p>
            <ul>
              {data.limitations.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  )
}

function SpendingChart({ data, reducedMotion }) {
  return (
    <section className="panel planning-section">
      <h2>Daily spending</h2>
      <p>Your recorded expenses. Blank days may have missing entries.</p>
      <div className="planning-chart">
        {data.categories.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.days}>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="#e8eee3"
              />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                minTickGap={38}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                width={65}
                tickFormatter={(value) => formatCurrency(value)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <Tooltip
                labelFormatter={dateLabel}
                formatter={(value) => [
                  formatCurrency(value),
                  "Recorded spending",
                ]}
              />
              <Bar
                dataKey="spending"
                fill="#78946b"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
                isAnimationActive={!reducedMotion}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="planning-empty">
            Your spending chart starts with your first recorded expense.
          </div>
        )}
      </div>
    </section>
  )
}

function CategoryBreakdown({ data }) {
  const total = Number(data.summary.spending)
  const [showAll, setShowAll] = useState(false)
  const categories = showAll ? data.categories : data.categories.slice(0, 5)
  return (
    <section className="panel planning-section">
      <h2>Top categories</h2>
      <p>Your largest categories in this period.</p>
      <div className="planning-category-list">
        {categories.map((category) => (
          <div key={category.name}>
            <div>
              <span>{category.name}</span>
              <strong>{formatCurrency(category.amount)}</strong>
            </div>
            <progress
              max="100"
              value={total > 0 ? (Number(category.amount) / total) * 100 : 0}
              aria-label={`${category.name} share of spending`}
            />
            <small>
              {total > 0
                ? Math.round((Number(category.amount) / total) * 100)
                : 0}
              % of spending
            </small>
          </div>
        ))}
        {!data.categories.length && (
          <p className="planning-muted">
            Add an expense to see your categories.
          </p>
        )}
      </div>
      {data.categories.length > 5 && (
        <button
          className="text-link analytics-show-categories"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll
            ? "Show top five"
            : `View all ${data.categories.length} categories`}
        </button>
      )}
    </section>
  )
}
