import { Check, ChevronRight, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { formatCurrency } from "../../utils/finance"

const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })

export function MonthlySummary({ data }) {
  const purchases = data.categories.reduce(
    (total, category) => total + category.count,
    0,
  )
  return (
    <section className="panel analytics-summary" aria-label="Monthly totals">
      <div className="analytics-total">
        <span>Total spent</span>
        <strong>{formatCurrency(data.summary.spending)}</strong>
        <small>Recorded through {dateLabel(data.periodEnd)}</small>
        {data.summary.changePercent !== null && (
          <span className="analytics-comparison">
            {data.summary.changePercent > 0 ? "+" : ""}
            {data.summary.changePercent}% vs the comparable previous period
          </span>
        )}
      </div>
      <div className="analytics-secondary-total">
        <span>Purchases</span>
        <strong>{purchases}</strong>
        <small>In this period</small>
      </div>
      <div className="analytics-secondary-total">
        <span>Average expense</span>
        <strong>
          {purchases > 0
            ? formatCurrency(Number(data.summary.spending) / purchases)
            : "—"}
        </strong>
        <small>Per recorded purchase</small>
      </div>
    </section>
  )
}

function Evidence({ rows = [] }) {
  if (!rows.length) return null
  return (
    <details className="planning-evidence">
      <summary>See supporting purchases</summary>
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
        View transactions <ChevronRight size={13} />
      </Link>
    </details>
  )
}

export function RecordedInsights({ data, mutate, busy }) {
  const insights = data.insights.filter(
    (item) => item.tone === "review" || item.tone === "progress",
  )
  if (!insights.length)
    return (
      <p className="analytics-quiet-note">
        More spending observations will appear as your recorded history grows.
      </p>
    )
  return (
    <section
      className="planning-review"
      aria-labelledby="analytics-observations-heading"
    >
      <div className="planning-section-title">
        <Sparkles size={19} />
        <div>
          <h2 id="analytics-observations-heading">From your history</h2>
          <p>Patterns worth a closer look.</p>
        </div>
      </div>
      <div className="planning-insight-grid">
        {insights.map((insight) => (
          <article
            className={`panel planning-insight tone-${insight.tone}`}
            key={insight.id}
          >
            <span className="planning-badge">
              {insight.tone === "review" ? "Worth a look" : "Progress"}
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
                disabled={busy}
                onClick={() =>
                  mutate(`/insights/${insight.id}/feedback`, "POST", {
                    month: data.month,
                    response: "helpful",
                  })
                }
              >
                <Check size={13} /> Helpful
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  mutate(`/insights/${insight.id}/feedback`, "POST", {
                    month: data.month,
                    response:
                      insight.tone === "review" ? "expected" : "dismissed",
                  })
                }
              >
                {insight.tone === "review" ? "This was expected" : "Dismiss"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function SpendingOutlook({ data, onReviewTracking }) {
  const ready = data.outlook.status === "ready"
  const historical = data.outlook.status === "historical"
  const dueBills = data.outlook.status === "review_due_bills"
  return (
    <section className="panel planning-section analytics-forecast">
      <div className="planning-section-title">
        <div>
          <h2>Spending forecast</h2>
          {ready && <p>An estimate for the end of this month.</p>}
        </div>
        {ready && <span className="planning-badge">Estimate</span>}
      </div>
      {ready ? (
        <div className="planning-outlook">
          <strong>{formatCurrency(data.outlook.projectedSpending)}</strong>
          <p>
            {formatCurrency(data.summary.spending)} recorded +{" "}
            {formatCurrency(data.outlook.remainingVariable)} expected variable
            spending + {formatCurrency(data.outlook.upcomingBills)} scheduled
            bills.
          </p>
        </div>
      ) : (
        <div className="analytics-forecast-empty">
          <h3>
            {historical
              ? "This month has ended"
              : dueBills
                ? "Check your scheduled bills first"
                : "A little more history is needed"}
          </h3>
          <p>
            {historical
              ? "Choose the current month to see a forecast."
              : dueBills
                ? "Review payments due today or overdue before using an estimate."
                : "A forecast needs 28 fully tracked days through yesterday and at least 12 expenses."}
          </p>
          {dueBills ? (
            <Link className="text-link" to="/dashboard/recurring">
              Review recurring payments <ChevronRight size={14} />
            </Link>
          ) : (
            !historical && (
              <button className="text-link" onClick={onReviewTracking}>
                Review tracked dates <ChevronRight size={14} />
              </button>
            )
          )}
        </div>
      )}
      <details className="planning-assumptions">
        <summary>How the forecast works</summary>
        <ul>
          {data.outlook.assumptions.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </details>
      {data.summary.budget !== null && (
        <p className="analytics-budget-note">
          Monthly budget: {formatCurrency(data.summary.budget)} · Remaining from
          recorded spending: {formatCurrency(data.summary.remainingBudget)}
        </p>
      )}
      {data.outlook.bills.length > 0 && (
        <>
          <h3>Upcoming payments</h3>
          <ul className="planning-bills">
            {data.outlook.bills.map((bill) => (
              <li key={`${bill.id}-${bill.date}`}>
                <span>
                  {bill.title}
                  <small>{dateLabel(bill.date)}</small>
                </span>
                <strong>{formatCurrency(bill.amount)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to="/dashboard/recurring">
        Manage recurring payments <ChevronRight size={14} />
      </Link>
    </section>
  )
}

export function RecurringSuggestions({ data, mutate, busy }) {
  if (!data.recurringCandidates.length) return null
  return (
    <details className="panel planning-section analytics-recurring">
      <summary>
        Possible recurring payments{" "}
        <span>{data.recurringCandidates.length} to review</span>
      </summary>
      <p>Review these patterns before adding a schedule.</p>
      <div className="planning-candidate-grid">
        {data.recurringCandidates.map((candidate) => (
          <article className="analytics-candidate" key={candidate.id}>
            <h3>{candidate.title}</h3>
            <p>
              {formatCurrency(candidate.amount)} · {candidate.frequency} ·
              suggested {dateLabel(candidate.nextDate)}
            </p>
            <Evidence rows={candidate.evidence} />
            <button
              className="btn"
              disabled={busy || data.month !== data.asOf.slice(0, 7)}
              onClick={() =>
                mutate(
                  `/recurring-candidates/${candidate.id}/confirm`,
                  "POST",
                  { month: data.month },
                )
              }
            >
              Confirm schedule
            </button>
          </article>
        ))}
      </div>
    </details>
  )
}
