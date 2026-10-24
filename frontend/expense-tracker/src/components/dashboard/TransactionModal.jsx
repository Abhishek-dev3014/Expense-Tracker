import { useEffect, useRef, useState } from "react"
import CategorySelect from "./CategorySelect"
import SpendingValueField from "./SpendingValueField"
import { X, ArrowRight } from "lucide-react"
import { LoadingIndicator } from "../ui/LoadingState"
export default function TransactionModal({
  type,
  transaction,
  onClose,
  onSubmit,
}) {
  const dialog = useRef(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(
    transaction?.category ?? "",
  )
  const [remember, setRemember] = useState(false)
  const [description, setDescription] = useState(transaction?.title ?? "")
  const [spendingValue, setSpendingValue] = useState(
    transaction?.spendingValue || "unreviewed",
  )
  const income = type === "income"
  const now = transaction ? new Date(transaction.date) : new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [])
  const submit = async (event) => {
    event.preventDefault()
    if (saving || categorySaving) return
    const form = event.target
    setSaving(true)
    setError("")
    try {
      await onSubmit({
        title: form.notes.value.trim(),
        amount: Number(form.amount.value),
        category: form.category.value,
        ...(!income && {
          rememberCategory: Boolean(form.category.value && remember),
          spendingValue,
        }),
        date:
          transaction && form.date.value === today
            ? transaction.date
            : form.date.value,
      })
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
      setSaving(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="transaction-dialog"
      aria-labelledby="transaction-dialog-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const items = [
          ...dialog.current.querySelectorAll(
            "button:enabled, input:enabled, select:enabled, textarea:enabled",
          ),
        ]
        const first = items[0]
        const last = items[items.length - 1]
        if (!first) {
          event.preventDefault()
          return
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!saving && !categorySaving) onClose()
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !saving && !categorySaving) {
          const rect = dialog.current.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose()
        }
      }}
    >
      <div className="dialog-title">
        <h2 id="transaction-dialog-title">
          {transaction ? "Edit" : "Add"} {type}
        </h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={saving || categorySaving}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 24 }}>
        Keep your financial picture up to date.
      </p>
      <form onSubmit={submit}>
        <fieldset
          disabled={saving}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <label className="form-field" htmlFor="transaction-amount">
            Amount (₹)
            <input
              id="transaction-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              defaultValue={transaction ? Math.abs(transaction.amount) : ""}
              required
              onChange={() => setSpendingValue("unreviewed")}
              autoFocus
              style={{ fontSize: 27, fontWeight: 600 }}
            />
          </label>
          <label className="form-field" htmlFor="transaction-notes">
            Description
            <input
              id="transaction-notes"
              name="notes"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setSpendingValue("unreviewed")
              }}
              placeholder={
                income ? "e.g. October salary" : "e.g. Groceries for the week"
              }
              required
              maxLength={200}
            />
          </label>
          {!income && (
            <small className="field-hint">
              Auto-detect checks your remembered choices first, then uses the
              description to suggest a category.
            </small>
          )}
          {transaction?.categoryStatus === "remembered" && (
            <p className="field-hint">
              This category came from your personal rule. Choose another
              category to change only this expense, or remember the new choice
              for future matches.
            </p>
          )}
          {transaction?.categoryStatus === "unavailable" && (
            <p role="status">
              Auto-categorization was unavailable. Select Auto-detect to try
              again, or choose a category.
            </p>
          )}
          {transaction?.categoryStatus === "needs_review" && (
            <p role="status">
              This description needs review. Add detail and select Auto-detect,
              or choose a category.
            </p>
          )}
          <div className="transaction-details-grid">
            <CategorySelect
              type={type}
              defaultValue={transaction?.category ?? ""}
              onBusyChange={setCategorySaving}
              onValueChange={(value) => {
                setSelectedCategory(value)
                setRemember(false)
                if (value !== selectedCategory) setSpendingValue("unreviewed")
              }}
            />
            <label className="form-field" htmlFor="transaction-date">
              Date
              <input
                id="transaction-date"
                name="date"
                type="date"
                defaultValue={today}
                required
              />
            </label>
          </div>
          {!income && (
            <SpendingValueField
              description={description}
              value={spendingValue}
              onChange={setSpendingValue}
              excludeTransactionId={transaction?._id}
            />
          )}
          {!income && (
            <div className="category-memory-choice">
              <label>
                <input
                  type="checkbox"
                  checked={remember && Boolean(selectedCategory)}
                  disabled={!selectedCategory || categorySaving}
                  onChange={(event) => setRemember(event.target.checked)}
                  aria-describedby="category-memory-help"
                />
                Remember this category
              </label>
              <small id="category-memory-help">
                {selectedCategory
                  ? "Use this category for future expenses with the same description, ignoring case and spacing. Your choice stays in your account. Existing expenses stay as they are."
                  : "Choose a category to remember it. Leave Auto-detect selected to use your personal rules and the model."}
              </small>
            </div>
          )}
          {transaction?.categoryHistory?.length > 0 && (
            <details className="category-correction-history">
              <summary>Category correction history</summary>
              <ul>
                {[...transaction.categoryHistory]
                  .reverse()
                  .map((change, index) => (
                    <li key={index}>
                      {change.previousCategory} → {change.category}
                      {" · "}
                      {new Date(change.correctedAt).toLocaleDateString()}
                    </li>
                  ))}
              </ul>
            </details>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={categorySaving}
            aria-busy={saving}
            className="btn btn-primary"
            style={{ width: "100%", minHeight: 44, marginTop: 8 }}
          >
            {saving ? (
              <LoadingIndicator>Saving {type}…</LoadingIndicator>
            ) : transaction ? (
              "Save changes"
            ) : (
              `Save ${type}`
            )}
            {!saving && <ArrowRight size={15} />}
          </button>
        </fieldset>
      </form>
    </dialog>
  )
}
