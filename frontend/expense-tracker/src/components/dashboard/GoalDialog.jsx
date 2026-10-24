import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, Target, Wallet, X } from "lucide-react"
import { LoadingIndicator } from "../ui/LoadingState"
import "../../styles/goal-dialog.css"

export default function GoalDialog({ onClose, onSubmit }) {
  const dialog = useRef(null)
  const nameInput = useRef(null)
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const name = form.elements.goalName.value.trim()
    if (!name) {
      setError("Enter a name for your goal.")
      nameInput.current.focus()
      return
    }
    const values = {
      name,
      targetAmount: form.elements.targetAmount.value,
      category: form.elements.category.value,
      deadline: form.elements.deadline.value || null,
    }
    pending.current = true
    setSaving(true)
    setError("")
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "The request timed out. Close this form and refresh your goals before trying again."
          : err.response?.data?.message ||
              "We couldn’t create your goal. Please try again.",
      )
      pending.current = false
      setSaving(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="goal-dialog"
      aria-labelledby="create-goal-title"
      aria-describedby="create-goal-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending.current) onClose()
      }}
      onClick={(event) => {
        if (event.target !== dialog.current || pending.current) return
        const bounds = dialog.current.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const items = [
          ...dialog.current.querySelectorAll(
            "button:enabled, input:enabled, select:enabled",
          ),
        ]
        if (!items.length) return
        const first = items[0],
          last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
    >
      <header className="goal-dialog-header">
        <span className="goal-dialog-symbol" aria-hidden="true">
          <Target size={22} />
        </span>
        <div>
          <h2 id="create-goal-title">Create a goal</h2>
          <p id="create-goal-description">
            Set a target and track your savings.
          </p>
        </div>
        <button
          type="button"
          className="goal-dialog-close"
          aria-label="Close create goal"
          disabled={saving}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <form onSubmit={submit} aria-busy={saving}>
        <div className="goal-dialog-body">
          <fieldset disabled={saving}>
            <label className="form-field" htmlFor="goal-name">
              Goal name
              <input
                ref={nameInput}
                id="goal-name"
                name="goalName"
                placeholder="e.g. Emergency fund or a new laptop"
                required
                maxLength={100}
                autoFocus
                autoComplete="off"
              />
            </label>
            <div className="goal-dialog-grid">
              <label className="form-field" htmlFor="goal-target">
                Target amount
                <span className="goal-amount-input">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="goal-target"
                    name="targetAmount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="999999999999.99"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </span>
              </label>
              <label className="form-field" htmlFor="goal-category">
                Goal type
                <select
                  id="goal-category"
                  name="category"
                  defaultValue="Savings"
                >
                  {[
                    "Savings",
                    "Investment",
                    "Purchase",
                    "Travel",
                    "Education",
                    "Emergency",
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-field" htmlFor="goal-deadline">
              <span>
                Target date <small>Optional</small>
              </span>
              <input
                id="goal-deadline"
                name="deadline"
                type="date"
                aria-describedby="goal-date-help"
              />
              <small id="goal-date-help" className="goal-field-help">
                Leave blank if you don’t have a date in mind.
              </small>
            </label>
          </fieldset>
          <p className="goal-dialog-note">
            <Wallet size={16} aria-hidden="true" />
            <span>Your goal starts at ₹0. Add savings as you go.</span>
          </p>
          {error && (
            <p className="form-error goal-dialog-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="goal-dialog-actions">
          <button
            className="btn"
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? (
              <LoadingIndicator>Creating…</LoadingIndicator>
            ) : (
              <>
                Create goal <ArrowRight size={16} />
              </>
            )}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body,
  )
}
