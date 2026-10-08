import { Link } from "react-router-dom"
import { ArrowUpRight, Target } from "lucide-react"
import { formatCurrency } from "../../utils/finance"
export default function BudgetHealthCard({
  totalExpense = 0,
  budgetLimit = 0,
  avgDailyExpense = 0,
}) {
  const now = new Date()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remaining = budgetLimit - totalExpense
  const used = budgetLimit > 0 ? (totalExpense / budgetLimit) * 100 : 0
  const over = remaining < 0
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Monthly budget</h2>
          <p>A plan for the month ahead</p>
        </div>
        <Link
          to="/dashboard/budget"
          className="text-link"
          aria-label="Manage your budget"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {budgetLimit > 0 ? (
        <div className="budget-content">
          <div
            className="budget-amount"
            style={{ color: over ? "#a06346" : "var(--text)" }}
          >
            {formatCurrency(Math.abs(remaining))}
            <span
              style={{
                fontSize: 11,
                fontFamily: "DM Sans",
                letterSpacing: 0,
                fontWeight: 400,
                color: "var(--muted)",
                marginLeft: 8,
              }}
            >
              {over ? "over budget" : "left to spend"}
            </span>
          </div>
          <div className="budget-meta">
            <span>{formatCurrency(totalExpense)} spent</span>
            <span>of {formatCurrency(budgetLimit)}</span>
          </div>
          <div
            className="progress-track"
            style={{ height: 7 }}
            role="progressbar"
            aria-label="Monthly budget used"
            aria-valuenow={Math.round(Math.min(used, 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(used, 100)}%`,
                background: over ? "#b07b59" : "#8d9f73",
              }}
            />
          </div>
          <div className="budget-note">
            {over
              ? "You’re over your monthly limit. Review your categories to adjust your plan."
              : avgDailyExpense * days > budgetLimit
                ? "At your current pace, spending may exceed your budget this month."
                : totalExpense === 0
                  ? "Your budget is ready. New expenses will appear here."
                  : "You’re on track. Your current spending pace is within your budget."}
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: 23 }}>
          <Target size={25} />
          <strong>Make room for what matters</strong>
          <p>Set a monthly limit to keep spending in perspective.</p>
          <Link
            to="/dashboard/budget"
            className="btn"
            style={{ marginTop: 17 }}
          >
            Create a budget <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
    </section>
  )
}
