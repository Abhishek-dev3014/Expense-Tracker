import { Fragment, useEffect, useState } from "react"
import {
  Search,
  Trash2,
  Pencil,
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
import { useOutletContext, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { PERIODS, transactionParams, transactionDay } from "../../utils/transactionFilters"
import ImportModal from "../../components/dashboard/ImportModal"
import SplitModal from "../../components/dashboard/SplitModal"
import EditTransactionModal from "../../components/dashboard/EditTransactionModal"
import LoadingState, { LoadingIndicator } from "../../components/ui/LoadingState"
import { BASE_URL } from "../../utils/apiPaths"

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useSearchParams()
  const search = filters.get("search") || ""
  const type = ["expense", "income"].includes(filters.get("type")) ? filters.get("type") : ""
  const category = filters.get("category") || ""
  const period = PERIODS[filters.get("period")] ? filters.get("period") : "all"
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState(false)
  const { onAddExpense } = useOutletContext() || {}
  const hasFilters = Boolean(search || type || category || period !== "all")
  const changeFilter = (key, value) => {
    if ({ search, type, category, period }[key] === value) return
    setLoading(true)
    setPage(1)
    setFilters((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }
  const clearFilters = () => { setLoading(true); setPage(1); setFilters({}, { replace: true }) }
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [splitTransaction, setSplitTransaction] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [revision, setRevision] = useState(0)
  const refresh = () => setRevision((value) => value + 1)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["expense", "income"].map(async (kind) => {
      const response = await fetch(`${BASE_URL}/api/categories?type=${kind}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: controller.signal,
      })
      if (!response.ok) throw new Error()
      return (await response.json()).categories || []
    })).then((lists) => {
      setCategories([...new Set(lists.flat())])
      setCategoryError(false)
    }).catch(() => { if (!controller.signal.aborted) setCategoryError(true) })
    return () => controller.abort()
  }, [revision])
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
        const params = transactionParams({ page, search, type, category, period })
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
        setTotal(data.total ?? data.transactions?.length ?? 0)
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
  }, [page, search, type, category, period, revision])
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
      toast.success("Transaction deleted")
      window.dispatchEvent(new Event("transactions-updated"))
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
  const categoryOptions = [...new Set([
    "Food", "Grocery", "Transport", "Travel", "Shopping", "Clothing", "Electronics", "Rent", "Utilities", "Entertainment", "Health", "Education", "Other", "General",
    "Salary", "Freelance", "Business", "Investment", ...categories, ...transactions.map((tx) => tx.category).filter(Boolean), ...(category ? [category] : []),
  ])].sort((a, b) => a.localeCompare(b))
  return (
    <section className="panel transaction-ledger" aria-label="Transaction history" aria-busy={loading}>
      <div className="ledger-heading">
        <div>
          <h2>Your money journal</h2>
          <p className="ledger-description">Find an expense, check the details, or pick up where you left off.</p>
        </div>
        <span className="ledger-count" role="status">
          {loading ? <LoadingIndicator>Updating…</LoadingIndicator> : `${total} ${total === 1 ? "transaction" : "transactions"}`}
        </span>
      </div>
      <div className="transaction-toolbar">
        <div className="transaction-search">
          <Search size={16} />
          <input
            aria-label="Search transactions"
            placeholder="Search by description…"
            maxLength={200}
            value={search}
            onChange={(event) => {
              changeFilter("search", event.target.value)
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
            disabled={!transactions.length || loading || Boolean(error)}
          >
            <Download size={14} />
            Export this page
          </button>
        </div>
      </div>
      <div className="ledger-filters">
        <div className="type-filter" role="group" aria-label="Transaction type">
          {[["", "All transactions"], ["expense", "Expenses"], ["income", "Income"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={type === value} onClick={() => changeFilter("type", value)}>{label}</button>
          ))}
        </div>
        <div className="ledger-selects">
          <label><span>When</span><select aria-label="Transaction period" value={period} onChange={(e) => changeFilter("period", e.target.value)}>
            {Object.entries(PERIODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label><span>Category</span><select aria-label="Transaction category" value={category} onChange={(e) => changeFilter("category", e.target.value)}>
            <option value="">All categories</option>
            {categoryOptions.map((name) => <option key={name}>{name}</option>)}
          </select></label>
        </div>
      </div>
      {categoryError && <p className="filter-notice" role="status">Some saved categories couldn’t load. <button className="text-link" onClick={refresh}>Retry</button></p>}
      <div className="ledger-results" role="status">
        <span>{loading ? "Finding transactions…" : error ? "Results unavailable" : `${total} ${total === 1 ? "transaction" : "transactions"}${hasFilters ? (total === 1 ? " matches your filters" : " match your filters") : " recorded"}`} <span aria-hidden="true">·</span> Newest first</span>
        {hasFilters && <button className="text-link" onClick={clearFilters}>Reset filters</button>}
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
        <LoadingState variant="table" label="Loading your transactions…" rows={6} />
      ) : error ? null : transactions.length ? (
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
              {transactions.map((tx, index) => (
                <Fragment key={tx._id}>
                {(index === 0 || transactionDay(tx.date) !== transactionDay(transactions[index - 1].date)) && (
                  <tr className="ledger-date-group"><th colSpan={5} scope="rowgroup">{transactionDay(tx.date)}</th></tr>
                )}
                <tr>
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
                      <button
                        type="button"
                        className="icon-button transaction-edit"
                        onClick={() => setEditingTransaction(tx)}
                        aria-label={`Edit ${tx.title || "transaction"}`}
                        title="Edit transaction"
                      >
                        <Pencil size={14} />
                        <span>Edit</span>
                      </button>
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Receipt size={28} />
          <strong>
            {hasFilters ? "No matching transactions" : "No transactions yet"}
          </strong>
          <p>
            {hasFilters
              ? "Try another date or category, or reset your filters to see everything."
              : "Add your first income or expense to get started."}
          </p>
          {hasFilters ? (
            <button
              className="text-link"
              style={{ marginTop: 12 }}
              onClick={clearFilters}
            >
              Reset filters
            </button>
          ) : <button className="btn btn-primary empty-action" onClick={onAddExpense}>Add your first expense</button>}
        </div>
      )}
      <div className="table-footer">
        <span>
          {loading ? "Updating…" : error ? "Please retry to load your history" : total ? `Showing ${(page - 1) * 10 + 1}–${(page - 1) * 10 + transactions.length} of ${total} · Page ${page} of ${totalPages}` : "No transactions to show"}
        </span>
        <div className="flex gap-1">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={page <= 1 || loading || Boolean(error)}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={page >= totalPages || loading || Boolean(error)}
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
      {editingTransaction && (
        <EditTransactionModal
          key={editingTransaction._id}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
      <SplitModal
        isOpen={Boolean(splitTransaction)}
        onClose={() => setSplitTransaction(null)}
        transaction={splitTransaction}
        onRefresh={refresh}
      />
    </section>
  )
}
