import { useEffect, useRef, useState } from "react"
import { Heart, Settings2, Trash2 } from "lucide-react"
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
  const [showAll, setShowAll] = useState(false)
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
          <h2 id="spending-review-heading">Purchase review</h2>
          <p>How your purchases fit your priorities.</p>
        </div>
        {data?.expenseCount > 0 && (
          <span className="spending-review-count">
            {data.reviewedCount} of {data.expenseCount} rated
          </span>
        )}
      </div>
      {state.error && (
        <p role="status">
          {state.error}{" "}
          <button
            className="text-link"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </p>
      )}
      {!data && !state.error && (
        <p role="status">Preparing your personal spending review…</p>
      )}
      {data && (
        <>
          {data.expenseCount > 0 && (
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
          )}
          <div className="spending-review-details">
            <h3>Recent purchases</h3>
            <p className="spending-value-help">
              Only ratings you confirm appear in the totals.
            </p>
            {data.purchases.length === 0 ? (
              <p className="spending-value-help">
                Add your first expense, then choose a rating that feels right
                for you.
              </p>
            ) : (
              <ul className="spending-review-purchases">
                {(showAll ? data.purchases : data.purchases.slice(0, 5)).map(
                  (item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <small>
                          {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )}{" "}
                          · {item.category} · {formatCurrency(item.amount)}
                        </small>
                      </div>
                      <label>
                        <span className="sr-only">Rate {item.description}</span>
                        <select
                          className={`spending-review-select ${item.value || "unreviewed"}`}
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
                  ),
                )}
              </ul>
            )}
            {data.purchases.length > 5 && (
              <button
                type="button"
                className="text-link"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll
                  ? "Show fewer purchases"
                  : `Show ${data.purchases.length - 5} more purchases`}
              </button>
            )}
            {data.expenseCount > 15 && (
              <p className="spending-value-help">
                Edit older expenses in Transactions to rate them.
              </p>
            )}
          </div>
          <details className="spending-review-details">
            <summary>
              <Settings2 size={15} /> Suggestion settings
            </summary>
            <p className="spending-value-help">
              Optional suggestions use your account only. You always choose the
              final rating.
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
                Learn from my ratings
              </label>
              <small>
                Suggest ratings from purchases you have already reviewed.
                Similar purchases need six different descriptions across two
                ratings.
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
                Use food starter suggestions
              </label>
              <small>
                Start with milk, fruits and home food as “Good for me,” and ice
                cream or takeaway as “Could improve.” Change any suggestion to
                suit you.
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
                Purchase description
                <input
                  name="description"
                  placeholder="e.g. Friday dinner with friends"
                  required
                  maxLength={200}
                  disabled={busy}
                />
              </label>
              <label className="form-field">
                Preferred rating
                <select name="value" disabled={busy}>
                  {SPENDING_VALUES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" disabled={busy}>
                Save preference
              </button>
            </form>
            <p className="spending-value-help">
              Saved preferences apply to matching descriptions and take priority
              over suggestions. They do not change past ratings.
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
