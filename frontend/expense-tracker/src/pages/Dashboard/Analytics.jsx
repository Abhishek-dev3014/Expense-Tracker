import { createElement, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Info,
  CloudOff,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import LoadingState, {
  LoadingIndicator,
} from "../../components/ui/LoadingState";
import useReducedMotion from "../../hooks/useReducedMotion";
import { planningRequest, localMonth } from "../../utils/planningApi";
import { formatCurrency } from "../../utils/finance";
import "../../styles/planning.css";

const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

function Evidence({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <details className="planning-evidence">
      <summary>View supporting transactions</summary>
      <p>Most recent supporting entries · up to six shown</p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <span>
              {row.description}
              <small>
                {dateLabel(row.date)} · {row.category}
              </small>
            </span>
            <strong>{formatCurrency(Math.abs(row.amount))}</strong>
          </li>
        ))}
      </ul>
      <Link to="/dashboard/transactions">
        Review your transactions <ChevronRight size={13} />
      </Link>
    </details>
  );
}

function Metric({ label, value, caption, icon = ChartNoAxesCombined }) {
  return (
    <article className="panel planning-metric">
      <div>
        <span>{label}</span>
        {createElement(icon, { size: 18 })}
      </div>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  );
}

function SavingsScenario({ data, token }) {
  const [category, setCategory] = useState(data.categories[0]?.name || "");
  const [percent, setPercent] = useState(10);
  const [goalId, setGoalId] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function calculate(event) {
    event.preventDefault();
    if (busy) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
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
      );
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="panel planning-section">
      <div className="planning-section-title">
        <Target size={20} />
        <div>
          <h2>Make room for your priorities</h2>
          <p>Explore a change you choose. Your transactions stay the same.</p>
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
              A category you could adjust
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setResult(null);
                }}
              >
                {data.categories.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field" htmlFor="scenario-reduction">
              Try a {percent}% reduction
              <input
                id="scenario-reduction"
                type="range"
                min="0"
                max="100"
                step="5"
                value={percent}
                onChange={(e) => {
                  setPercent(Number(e.target.value));
                  setResult(null);
                }}
              />
            </label>
            {data.goals.length > 0 && (
              <label className="form-field">
                Explore the impact on a goal
                <select
                  value={goalId}
                  onChange={(e) => {
                    setGoalId(e.target.value);
                    setResult(null);
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
                "Explore this scenario"
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
  );
}

function Coverage({ data, mutate, busy }) {
  const [from, setFrom] = useState(
    data.coverage.from || data.coverage.firstRecord || data.asOf,
  );
  const [through, setThrough] = useState(data.coverage.through || data.asOf);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <details className="panel planning-section planning-coverage">
      <summary>
        <CalendarDays size={18} /> Your tracking coverage{" "}
        <span>
          {data.coverage.from
            ? `${dateLabel(data.coverage.from)} – ${dateLabel(data.coverage.through)}`
            : "Not confirmed"}
        </span>
      </summary>
      <p>
        Only confirm dates where you have recorded all expenses and reviewed
        duplicates, refunds, shared reimbursements and transfers. A day with no
        entry may be missing, rather than a zero-spend day.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate("/coverage", "PUT", { from, through });
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
                setFrom(e.target.value);
                setConfirmed(false);
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
                setThrough(e.target.value);
                setConfirmed(false);
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
  );
}

export default function Analytics() {
  const { token } = useAuth();
  const reducedMotion = useReducedMotion();
  const [month, setMonth] = useState(localMonth);
  const [tab, setTab] = useState("overview");
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
    errorCode: "",
  });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const action = useRef(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 20000);
    async function load() {
      setState((previous) => ({
        ...previous,
        loading: true,
        error: "",
        errorCode: "",
      }));
      try {
        const data = await planningRequest(
          `?month=${encodeURIComponent(month)}`,
          { token, signal: controller.signal },
        );
        if (active)
          setState({ data, loading: false, error: "", errorCode: "" });
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
          }));
      } finally {
        clearTimeout(timer);
      }
    }
    load();
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("transactions-updated", refresh);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      window.removeEventListener("transactions-updated", refresh);
    };
  }, [month, revision, token]);
  async function mutate(path, method, body) {
    if (busy || state.loading) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await planningRequest(path, {
        token,
        method,
        body,
        signal: controller.signal,
      });
      setNotice(
        path.includes("confirm")
          ? "Recurring schedule confirmed. No expense has been created."
          : path.includes("feedback")
            ? "Your feedback was saved."
            : "Tracking coverage updated.",
      );
      setRevision((value) => value + 1);
    } catch (err) {
      if (err.name !== "AbortError") setActionError(err.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const data = state.data?.month === month ? state.data : null;
  return (
    <div className="planning-page">
      <div className="planning-toolbar">
        <div className="planning-tabs" role="group" aria-label="Analytics view">
          {[
            ["overview", "Overview"],
            ["ahead", "Plan ahead"],
            ["patterns", "Your patterns"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="planning-month">
          Recorded period
          <input
            aria-label="Analytics month"
            type="month"
            min="2000-01"
            max={localMonth()}
            value={month}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setActionError("");
                setNotice("");
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
                ? "Your spending review is unavailable"
                : "We couldn’t load your spending review"}
            </h2>
            <p>{state.error}</p>
            <div className="planning-error-actions">
              <button
                className="btn btn-primary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Check again
              </button>
              <Link className="btn" to="/dashboard/transactions">
                View transactions <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
      {!data && state.loading && (
        <LoadingState variant="chart" label="Preparing your spending review…" />
      )}
      {data && (
        <>
          <div className="planning-context">
            <span>
              <span className="planning-badge">Recorded INR activity</span>{" "}
              Through {dateLabel(data.periodEnd)} · {data.timezone}
            </span>
            <span role="status">
              {state.loading || busy ? (
                <LoadingIndicator>Updating your review…</LoadingIndicator>
              ) : state.error ? (
                "Previous review · refresh failed"
              ) : (
                "Based on your entries"
              )}
            </span>
          </div>
          <p className="planning-notice" role="status">
            {notice}
          </p>
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          <div className="planning-metrics">
            <Metric
              label="Recorded spending"
              value={formatCurrency(data.summary.spending)}
              caption={
                data.summary.changePercent === null
                  ? "No complete, nonzero comparison baseline"
                  : `${data.summary.changePercent > 0 ? "+" : ""}${data.summary.changePercent}% versus the comparable previous period`
              }
            />
            <Metric
              label="Recorded net cash flow"
              value={formatCurrency(data.summary.netCashFlow)}
              caption="Recorded income minus expenses · not a bank balance"
            />
            <Metric
              label="Remaining chosen budget"
              value={
                data.summary.remainingBudget === null
                  ? "Not set"
                  : formatCurrency(data.summary.remainingBudget)
              }
              caption="Before any unrecorded or upcoming spending"
              icon={Target}
            />
            <Metric
              label="Recorded savings rate"
              value={
                data.summary.savingsRate === null
                  ? "Unavailable"
                  : `${data.summary.savingsRate}%`
              }
              caption={
                data.summary.savingsRate === null
                  ? "Record income to calculate this measure"
                  : "From recorded income and expenses in this period"
              }
              icon={ArrowDownRight}
            />
          </div>
          {tab === "overview" && (
            <>
              <section className="planning-review">
                <div className="planning-section-title">
                  <Sparkles size={20} />
                  <div>
                    <h2>What’s worth knowing</h2>
                    <p>A short review, with room for your own priorities.</p>
                  </div>
                </div>
                <div className="planning-insight-grid">
                  {data.insights.slice(0, 3).map((insight) => (
                    <article
                      className={`panel planning-insight tone-${insight.tone}`}
                      key={insight.id}
                    >
                      <span className="planning-badge">
                        Observed ·{" "}
                        {insight.tone === "review"
                          ? "Worth a look"
                          : insight.tone === "progress"
                            ? "Progress"
                            : "Getting started"}
                      </span>
                      <h3>{insight.title}</h3>
                      <p>{insight.message}</p>
                      <Evidence rows={insight.evidence} />
                      <div
                        className="planning-feedback"
                        role="group"
                        aria-label={`Feedback on ${insight.title}`}
                      >
                        <button
                          disabled={busy || state.loading}
                          onClick={() =>
                            mutate(`/insights/${insight.id}/feedback`, "POST", {
                              month,
                              response: "helpful",
                            })
                          }
                        >
                          <Check size={13} /> Helpful
                        </button>
                        <button
                          disabled={busy || state.loading}
                          onClick={() =>
                            mutate(`/insights/${insight.id}/feedback`, "POST", {
                              month,
                              response:
                                insight.tone === "review"
                                  ? "expected"
                                  : "dismissed",
                            })
                          }
                        >
                          {insight.tone === "review"
                            ? "This was expected"
                            : "Dismiss"}
                        </button>
                      </div>
                    </article>
                  ))}
                  {!data.insights.length && (
                    <div className="panel planning-section">
                      <h3>You’re up to date</h3>
                      <p>
                        Your feedback has cleared this review. Explore your
                        plans or recorded patterns below.
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <div className="planning-two-columns">
                <SpendingChart data={data} reducedMotion={reducedMotion} />
                <CategoryBreakdown data={data} />
              </div>
              <SavingsScenario
                key={`${month}:${data.categories.map((c) => `${c.name}:${c.amount}`).join("|")}:${data.goals.map((g) => `${g.id}:${g.current}:${g.target}`).join("|")}`}
                data={data}
                token={token}
              />
            </>
          )}
          {tab === "ahead" && (
            <>
              <section className="panel planning-section">
                <div className="planning-section-title">
                  <ChartNoAxesCombined size={20} />
                  <div>
                    <h2>Your spending outlook</h2>
                    <p>
                      Confirmed scheduled bills plus a weekday spending
                      baseline.
                    </p>
                  </div>
                </div>
                {data.outlook.status === "ready" ? (
                  <div className="planning-outlook">
                    <span className="planning-badge">
                      Estimate · {data.outlook.historyDays} confirmed history
                      days
                    </span>
                    <strong>
                      {formatCurrency(data.outlook.projectedSpending)} recorded
                      + projected spending by month-end
                    </strong>
                    <p>
                      {formatCurrency(data.summary.spending)} recorded +{" "}
                      {formatCurrency(data.outlook.remainingVariable)} variable
                      spending from tomorrow +{" "}
                      {formatCurrency(data.outlook.upcomingBills)} scheduled
                      bills.
                    </p>
                  </div>
                ) : (
                  <div className="planning-empty">
                    <h3>
                      {data.outlook.status === "historical"
                        ? "Recorded facts for a completed month"
                        : data.outlook.status === "review_due_bills"
                          ? "Review bills due today or overdue first"
                          : "Build a reliable starting point"}
                    </h3>
                    <p>
                      {data.outlook.status === "historical"
                        ? "Choose the current month to see an outlook when your data is ready."
                        : data.outlook.status === "review_due_bills"
                          ? "An active schedule has an unresolved due date. Review recurring payments before using an outlook."
                          : "An outlook needs at least 28 fully tracked days through yesterday and 12 recorded expenses. Confirm only dates you have fully reviewed."}
                    </p>
                    <Link to="/dashboard/recurring">
                      Review recurring payments <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
                <details className="planning-assumptions">
                  <summary>How this estimate works</summary>
                  <ul>
                    {data.outlook.assumptions.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </details>
                <h3 className="planning-subheading">
                  Upcoming scheduled payments
                </h3>
                {data.outlook.bills.length ? (
                  <ul className="planning-bills">
                    {data.outlook.bills.map((b) => (
                      <li key={`${b.id}-${b.date}`}>
                        <CalendarDays size={17} />
                        <span>
                          {b.title}
                          <small>{dateLabel(b.date)}</small>
                        </span>
                        <strong>{formatCurrency(b.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="planning-muted">
                    No future scheduled expense in the remaining month. This
                    does not prove that no bills are due.
                  </p>
                )}
              </section>
              <SavingsScenario
                key={`${month}:${data.categories.map((c) => `${c.name}:${c.amount}`).join("|")}:${data.goals.map((g) => `${g.id}:${g.current}:${g.target}`).join("|")}`}
                data={data}
                token={token}
              />
            </>
          )}
          {tab === "patterns" && (
            <>
              <div className="planning-two-columns">
                <CategoryBreakdown data={data} />
                <SpendingChart data={data} reducedMotion={reducedMotion} />
              </div>
              <section className="planning-review">
                <div className="planning-section-title">
                  <CalendarDays size={20} />
                  <div>
                    <h2>Possible repeating expenses</h2>
                    <p>
                      Similar descriptions, timing and amounts. Confirm what
                      belongs in your plan.
                    </p>
                  </div>
                </div>
                <div className="planning-candidate-grid">
                  {data.recurringCandidates.map((candidate) => (
                    <article
                      className="panel planning-section"
                      key={candidate.id}
                    >
                      <span className="planning-badge">
                        Suggestion · {candidate.frequency}
                      </span>
                      <h3>{candidate.title}</h3>
                      <p>
                        {formatCurrency(candidate.amount)} · next suggested date{" "}
                        {dateLabel(candidate.nextDate)}
                      </p>
                      <p>
                        Three or more similar payments. Billing history cannot
                        establish whether a subscription is used.
                      </p>
                      <Evidence rows={candidate.evidence} />
                      <button
                        className="btn"
                        disabled={
                          busy ||
                          state.loading ||
                          month !== data.asOf.slice(0, 7)
                        }
                        onClick={() =>
                          mutate(
                            `/recurring-candidates/${candidate.id}/confirm`,
                            "POST",
                            { month },
                          )
                        }
                      >
                        Confirm recurring schedule
                      </button>
                    </article>
                  ))}
                  {!data.recurringCandidates.length && (
                    <div className="panel planning-empty">
                      <h3>No unconfirmed repeating pattern yet</h3>
                      <p>
                        Patterns need at least three distinct payment dates. You
                        can also add a known bill yourself.
                      </p>
                      <Link to="/dashboard/recurring">
                        Manage recurring payments <ChevronRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              </section>
              <section className="panel planning-section">
                <div className="planning-section-title">
                  <Target size={20} />
                  <div>
                    <h2>Your goal progress</h2>
                    <p>
                      Current recorded contributions, without assumptions about
                      this week.
                    </p>
                  </div>
                </div>
                {data.goals.length ? (
                  data.goals.map((goal) => (
                    <div className="planning-goal" key={goal.id}>
                      <span>{goal.name}</span>
                      <strong>
                        {formatCurrency(goal.current)} /{" "}
                        {formatCurrency(goal.target)}
                      </strong>
                      <progress
                        max="100"
                        value={Math.min(100, goal.percent)}
                        aria-label={`${goal.name} progress`}
                      />
                    </div>
                  ))
                ) : (
                  <p className="planning-muted">
                    Choose a savings goal to make future reviews more personal.
                  </p>
                )}
                <Link to="/dashboard/goals">
                  Manage savings goals <ChevronRight size={14} />
                </Link>
              </section>
            </>
          )}
          <Coverage
            key={`${month}:${data.coverage.from}:${data.coverage.through}`}
            data={data}
            mutate={mutate}
            busy={busy || state.loading}
          />
          <details className="planning-limitations">
            <summary>
              <Info size={15} /> About your recorded data
            </summary>
            <ul>
              {data.limitations.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

function SpendingChart({ data, reducedMotion }) {
  return (
    <section className="panel planning-section">
      <h2>Spending, day by day</h2>
      <p>
        Recorded expenses for the selected period. Gaps may be untracked days.
      </p>
      <div className="planning-chart">
        {data.categories.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.days}>
              <defs>
                <linearGradient id="planning-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#70956c" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#70956c" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
              <Area
                type="linear"
                dataKey="spending"
                connectNulls={false}
                stroke="#49765a"
                fill="url(#planning-spend)"
                strokeWidth={2}
                isAnimationActive={!reducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="planning-empty">
            Your spending chart starts with your first recorded expense.
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryBreakdown({ data }) {
  const total = Number(data.summary.spending);
  return (
    <section className="panel planning-section">
      <h2>Where your recorded spending went</h2>
      <p>Categories for this selected period.</p>
      <div className="planning-category-list">
        {data.categories.map((category) => (
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
              {category.count} recorded{" "}
              {category.count === 1 ? "expense" : "expenses"}
            </small>
          </div>
        ))}
        {!data.categories.length && (
          <p className="planning-muted">No recorded expenses in this period.</p>
        )}
      </div>
    </section>
  );
}
