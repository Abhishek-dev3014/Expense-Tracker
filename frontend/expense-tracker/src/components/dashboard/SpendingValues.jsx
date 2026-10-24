import { useEffect, useRef, useState } from "react"
import { Heart, Sparkles, Trash2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  SPENDING_VALUES,
  spendingLabel,
  spendingRequest,
} from "../../utils/spendingReview"
import { formatCurrency } from "../../utils/finance"
import "../../styles/spending-review.css"
export default function SpendingValues({ month }) {
  const { token } = useAuth()
  const [state, setState] = useState({ data: null, error: "" })
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    spendingRequest(`?month=${encodeURIComponent(month)}`, {
      token,
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setState({ data, error: "" })
      })
      .catch((e) => {
        if (active && e.name !== "AbortError")
          setState({ data: null, error: e.message })
      })
    const refresh = () => setRevision((v) => v + 1)
    window.addEventListener("transactions-updated", refresh)
    return () => {
      active = false
      controller.abort()
      window.removeEventListener("transactions-updated", refresh)
    }
  }, [month, revision, token])
  const data = state.data?.month === month ? state.data : null
  async function mutate(path, method, body, message) {
    if (busy) return
    setBusy(true)
    setNotice("Saving your change…")
    const controller = new AbortController()
    pending.current = controller
    let saved = false
    try {
      await spendingRequest(path, {
        token,
        method,
        body,
        signal: controller.signal,
      })
      saved = true
      if (!controller.signal.aborted) {
        setNotice(message)
        // Keep controls disabled until the confirmed server state replaces old preferences.
        const data = await spendingRequest(
          `?month=${encodeURIComponent(month)}`,
          { token, signal: controller.signal },
        )
        if (!controller.signal.aborted) setState({ data, error: "" })
      }
    } catch (e) {
      if (e.name !== "AbortError")
        setNotice(
          saved
            ? "Your change was saved, but the review could not refresh. Reopen Analytics to see it."
            : e.message,
        )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <section
      className="panel spending-review-panel"
      aria-labelledby="spending-review-heading"
      aria-busy={busy}
    >
      <div className="spending-review-title">
        <Heart size={21} />
        <div>
          <h2 id="spending-review-heading">
            Spending that feels right for you
          </h2>
          <p>
            Your own good, fine and could-improve choices. Suggestions never
            count as confirmed ratings.
          </p>
        </div>
      </div>
      {state.error && <p role="status">{state.error}</p>}
      {!data && !state.error && (
        <p role="status">Preparing your personal spending review…</p>
      )}
      {data && (
        <>
          <div className="spending-rating-totals">
            {data.totals.map((item) => (
              <div
                className={`spending-rating-total ${item.value}`}
                key={item.value}
              >
                <span>{spendingLabel(item.value)}</span>
                <strong>{formatCurrency(item.amount)}</strong>
                <small>
                  {item.count} {item.count === 1 ? "purchase" : "purchases"}
                </small>
              </div>
            ))}
          </div>
          <p className="spending-value-help">
            You have rated {data.reviewedCount} of {data.expenseCount} recorded
            expenses this month. “Could improve” is a reflection, not guaranteed
            savings.
          </p>
          <details className="spending-review-details">
            <summary>Review recent purchases</summary>
            <p className="spending-value-help">
              Up to 15 recent expenses. Edit any transaction to rate older
              purchases.
            </p>
            {data.purchases.length === 0 ? (
              <p>Add an expense to start your review.</p>
            ) : (
              <ul className="spending-review-purchases">
                {data.purchases.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.description}</strong>
                      <small>
                        {item.date} · {item.category} ·{" "}
                        {formatCurrency(item.amount)}
                      </small>
                    </div>
                    <label>
                      <span className="sr-only">Rate {item.description}</span>
                      <select
                        value={item.value || "unreviewed"}
                        disabled={busy}
                        onChange={(e) =>
                          mutate(
                            `/transactions/${item.id}`,
                            "PUT",
                            { value: e.target.value },
                            "Your rating was saved.",
                          )
                        }
                      >
                        <option value="unreviewed">Not rated</option>
                        {SPENDING_VALUES.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </details>
          <details className="spending-review-details">
            <summary>
              <Sparkles size={15} /> Personal suggestions and preferences
            </summary>
            <p className="spending-value-help">
              Keep these off for manual ratings only. Suggestions use only your
              account and always wait for your confirmation. No ratings are
              shared with other customers.
            </p>
            <fieldset disabled={busy} className="spending-preferences">
              <label>
                <input
                  type="checkbox"
                  checked={data.preferences.learningEnabled}
                  onChange={(e) =>
                    mutate(
                      "/preferences",
                      "PUT",
                      {
                        learningEnabled: e.target.checked,
                        foodGuideEnabled: data.preferences.foodGuideEnabled,
                      },
                      "Personal learning preference updated.",
                    )
                  }
                />{" "}
                Learn from my confirmed ratings
              </label>
              <small>
                Remembers consistent exact descriptions first. After six
                different descriptions across two ratings, a nearest-neighbour
                model can suggest similar purchases. Conflicting examples are
                left for review.
              </small>
              <label>
                <input
                  type="checkbox"
                  checked={data.preferences.foodGuideEnabled}
                  onChange={(e) =>
                    mutate(
                      "/preferences",
                      "PUT",
                      {
                        learningEnabled: data.preferences.learningEnabled,
                        foodGuideEnabled: e.target.checked,
                      },
                      "Everyday-food preferences updated.",
                    )
                  }
                />{" "}
                Use the everyday-food starter preferences
              </label>
              <small>
                Suggest “Good for me” for milk, fruits and home foods; “Could
                improve” for ice cream, takeaway and outside food. These are
                editable spending preferences, not nutritional advice. Mixed or
                unclear purchases stay unrated.
              </small>
            </fieldset>
            <form
              className="spending-rule-form"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                mutate(
                  "/rules",
                  "POST",
                  {
                    description: form.description.value,
                    value: form.value.value,
                  },
                  "Spending preference saved for this exact description.",
                )
              }}
            >
              <label className="form-field">
                Remember a description
                <input
                  name="description"
                  placeholder="e.g. Friday dinner with friends"
                  required
                  maxLength={200}
                  disabled={busy}
                />
              </label>
              <label className="form-field">
                Your preferred rating
                <select name="value" disabled={busy}>
                  {SPENDING_VALUES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" disabled={busy}>
                Remember preference
              </button>
            </form>
            <p className="spending-value-help">
              Exact descriptions ignore case, punctuation and spacing. Existing
              expenses stay unchanged. Your saved preference takes priority over
              learning and the starter guide.
            </p>
            {data.rules.length > 0 && (
              <ul className="spending-rule-list">
                {data.rules.map((rule) => (
                  <li key={rule.id}>
                    <span>
                      {rule.description}
                      <small>{spendingLabel(rule.value)}</small>
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Remove spending preference for ${rule.description}`}
                      onClick={() =>
                        mutate(
                          `/rules/${rule.id}`,
                          "DELETE",
                          undefined,
                          "Spending preference removed.",
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      )}
      <p role="status" className="spending-review-notice">
        {notice}
      </p>
    </section>
  )
}
