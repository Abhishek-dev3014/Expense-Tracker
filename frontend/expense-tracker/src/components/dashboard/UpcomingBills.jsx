import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, CalendarCheck2 } from "lucide-react"
import { BASE_URL } from "../../utils/apiPaths"
import { formatCurrency } from "../../utils/finance"
export default function UpcomingBills({ revision = 0 }) {
  const [bills, setBills] = useState([])
  const [status, setStatus] = useState("loading")
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/recurring`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Could not load payments")
        const data = await response.json()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(today)
        end.setDate(end.getDate() + 8)
        setBills(
          data
            .filter(
              (bill) =>
                bill.type === "expense" &&
                bill.status === "active" &&
                new Date(bill.nextOccurrence) >= today &&
                new Date(bill.nextOccurrence) < end,
            )
            .sort(
              (a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence),
            ),
        )
        setStatus("ready")
      } catch (err) {
        if (err.name !== "AbortError") setStatus("error")
      }
    }
    load()
    return () => controller.abort()
  }, [revision])
  return (
    <section className="panel">
      <div className="panel-heading" style={{ paddingBottom: 16 }}>
        <div>
          <h2>Coming up</h2>
          <p>Scheduled payments · Next 7 days</p>
        </div>
        <Link
          className="text-link"
          to="/dashboard/recurring"
          aria-label="View recurring payments"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {status !== "ready" ? (
        <div className="empty-state" role="status">
          {status === "loading"
            ? "Loading upcoming payments…"
            : "Payments are unavailable. Open recurring payments to try again."}
        </div>
      ) : bills.length ? (
        bills.slice(0, 3).map((bill) => (
          <Link to="/dashboard/recurring" className="bill-row" key={bill._id}>
            <div className="bill-date">
              <small>
                {new Date(bill.nextOccurrence).toLocaleDateString("en-IN", {
                  month: "short",
                })}
              </small>
              <strong>{new Date(bill.nextOccurrence).getDate()}</strong>
            </div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 500 }}>
              {bill.title}
              <div
                style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}
              >
                {bill.category}
              </div>
            </div>
            <strong style={{ fontSize: 11, fontWeight: 600 }}>
              {formatCurrency(Math.abs(bill.amount))}
            </strong>
          </Link>
        ))
      ) : (
        <div
          className="empty-state"
          style={{ paddingTop: 12, paddingBottom: 25 }}
        >
          <CalendarCheck2 size={22} />
          <p>No payments due in the next 7 days.</p>
          <Link
            className="text-link"
            style={{ marginTop: 12 }}
            to="/dashboard/recurring"
          >
            Manage recurring payments <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
    </section>
  )
}
