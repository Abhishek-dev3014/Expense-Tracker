import { useEffect, useState } from "react"
import {
  Search,
  Trash2,
  Download,
  Upload,
  Users,
  ArrowLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RefreshCw,
} from "lucide-react"
import ImportModal from "../../components/dashboard/ImportModal"
import SplitModal from "../../components/dashboard/SplitModal"
import { BASE_URL } from "../../utils/apiPaths"

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [splitTransaction, setSplitTransaction] = useState(null)
  const [revision, setRevision] = useState(0)
  const refresh = () => setRevision((value) => value + 1)
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener("transactions-updated", refresh)
    return () => window.removeEventListener("transactions-updated", refresh)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const params = new URLSearchParams({ page: String(page), search })
        const response = await fetch(`${BASE_URL}/api/transactions?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: controller.signal,
        })
        if (!response.ok)
          throw new Error(
            "We couldn’t load your transactions. Please try again.",
          )
        const data = await response.json()
        setTransactions(data.transactions || [])
        setTotalPages(Math.max(1, data.totalPages || 1))
        setTotal(data.total ?? data.transactions.length)
        if (page > Math.max(1, data.totalPages || 1))
          setPage(Math.max(1, data.totalPages || 1))
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [page, search, revision])
  const remove = async (tx) => {
    if (
      !window.confirm(
        `Delete “${tx.title}”? This transaction will be permanently removed.`,
      )
    )
      return
    try {
      const response = await fetch(`${BASE_URL}/api/transactions/${tx._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      if (!response.ok)
        throw new Error("Could not delete this transaction. Please try again.")
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }
  const exportPage = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`
    const rows = [
      ["Date", "Category", "Title", "Type", "Amount"],
      ...transactions.map((tx) => [
        new Date(tx.date).toLocaleDateString("en-IN"),
        tx.category,
        tx.title,
        tx.type,
        tx.amount,
      ]),
    ]
    const blob = new Blob(
      ["\ufeff" + rows.map((row) => row.map(escape).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8;" },
    )
    const url = URL.createObjectURL(blob),
      link = document.createElement("a")
    link.href = url
    link.download = `transactions-page-${page}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="panel">
      <div className="transaction-toolbar">
        <div className="transaction-search">
          <Search size={16} />
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setImportOpen(true)}>
            <Upload size={14} />
            Import CSV
          </button>
          <button
            className="btn"
            onClick={exportPage}
            disabled={!transactions.length || loading}
          >
            <Download size={14} />
            Export this page
          </button>
        </div>
      </div>
      {error && (
        <div
          className="form-error"
          role="alert"
          style={{ margin: "0 20px 16px" }}
        >
          {error}
          <button
            className="text-link"
            style={{ marginLeft: 12 }}
            onClick={refresh}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="empty-state" role="status">
          Loading transactions…
        </div>
      ) : transactions.length ? (
        <div className="table-scroll">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th className="optional-column">Category</th>
                <th className="optional-column">Date</th>
                <th className="amount">Amount</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td>
                    <span className="transaction-name">
                      <span className="transaction-icon">
                        {tx.type === "income" ? (
                          <ArrowDownLeft size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
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
                  <td
                    className={`amount ${tx.type === "income" ? "income-text" : ""}`}
                  >
                    {tx.type === "income" ? "+" : "−"}₹
                    {Math.abs(tx.amount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <div className="flex justify-end">
                      {tx.type === "expense" && (
                        <button
                          className="icon-button"
                          onClick={() => setSplitTransaction(tx)}
                          aria-label={`Split ${tx.title}`}
                          title="Split expense"
                        >
                          <Users size={14} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        onClick={() => remove(tx)}
                        aria-label={`Delete ${tx.title}`}
                        title="Delete transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Receipt size={28} />
          <strong>
            {search ? "No matching transactions" : "No transactions yet"}
          </strong>
          <p>
            {search
              ? "Try a different description or clear your search."
              : "Add your first income or expense to get started."}
          </p>
          {search && (
            <button
              className="text-link"
              style={{ marginTop: 12 }}
              onClick={() => setSearch("")}
            >
              Clear search
            </button>
          )}
        </div>
      )}
      <div className="table-footer">
        <span>
          {total} {search ? "matching " : ""}transactions · Page {page} of{" "}
          {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onRefresh={refresh}
      />
      <SplitModal
        isOpen={Boolean(splitTransaction)}
        onClose={() => setSplitTransaction(null)}
        transaction={splitTransaction}
        onRefresh={refresh}
      />
    </section>
  )
}
