import { useEffect, useRef, useState } from "react"
import CategorySelect from "./CategorySelect"
import { X, ArrowRight } from "lucide-react"
export default function TransactionModal({ type, onClose, onSubmit }) {
  const dialog = useRef(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const income = type === "income"
  const now = new Date()
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
        date: form.date.value,
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
        <h2 id="transaction-dialog-title">Add {type}</h2>
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
              required
              autoFocus
              style={{ fontSize: 27, fontWeight: 600 }}
            />
          </label>
          <label className="form-field" htmlFor="transaction-notes">
            Description
            <input
              id="transaction-notes"
              name="notes"
              placeholder={
                income ? "e.g. October salary" : "e.g. Groceries for the week"
              }
              required
              maxLength={200}
            />
          </label>
          <div className="transaction-details-grid">
            <CategorySelect type={type} onBusyChange={setCategorySaving} />
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
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={categorySaving}
            className="btn btn-primary"
            style={{ width: "100%", minHeight: 44, marginTop: 8 }}
          >
            {saving ? "Saving…" : `Save ${type}`}
            {!saving && <ArrowRight size={15} />}
          </button>
        </fieldset>
      </form>
    </dialog>
  )
}
