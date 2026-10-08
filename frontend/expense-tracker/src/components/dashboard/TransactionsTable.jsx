import { Link } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  Receipt,
  Coffee,
  Car,
  House,
} from "lucide-react"
const icons = {
  Food: Coffee,
  Transport: Car,
  Shopping: ShoppingBag,
  Rent: House,
  Housing: House,
}
export default function TransactionsTable({
  transactions = [],
  page = 1,
  totalPages = 1,
  onNext,
  onPrev,
}) {
  return (
    <section className="panel">
      <div className="panel-heading" style={{ paddingBottom: 19 }}>
        <div>
          <h2>Recent transactions</h2>
          <p>Your latest money movements</p>
        </div>
        <Link className="text-link" to="/dashboard/transactions">
          View all <ArrowUpRight size={14} />
        </Link>
      </div>
      {transactions.length === 0 ? (
        <div className="empty-state">
          <Receipt size={27} />
          <strong>A fresh start for your finances</strong>
          <p>Add an income or expense to see your activity here.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th className="optional-column">Category</th>
                <th className="optional-column">Date</th>
                <th className="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const income = tx.type ? tx.type === "income" : tx.amount > 0
                const Icon = income
                  ? ArrowDownLeft
                  : icons[tx.category] || ArrowUpRight
                return (
                  <tr key={tx._id}>
                    <td>
                      <span className="transaction-name">
                        <span className="transaction-icon">
                          <Icon size={15} />
                        </span>
                        <span>
                          {tx.title || "Untitled transaction"}
                          <small className="transaction-subtitle">
                            {tx.category} ·{" "}
                            {new Date(tx.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td className="optional-column">
                      <span className="category-pill">
                        {tx.category || "Other"}
                      </span>
                    </td>
                    <td
                      className="optional-column"
                      style={{ color: "var(--muted)" }}
                    >
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={`amount ${income ? "income-text" : ""}`}>
                      {income ? "+" : "−"}₹
                      {Math.abs(tx.amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="table-footer">
        <span>
          {transactions.length
            ? `${transactions.length} transactions · Page ${page} of ${Math.max(1, totalPages)}`
            : "Your activity will appear here"}
        </span>
        <div className="flex gap-1">
          <button
            aria-label="Previous transactions"
            className="icon-button"
            disabled={page <= 1}
            onClick={onPrev}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            aria-label="Next transactions"
            className="icon-button"
            disabled={page >= totalPages}
            onClick={onNext}
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  )
}
