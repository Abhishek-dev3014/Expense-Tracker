import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  SPENDING_VALUES,
  spendingLabel,
  spendingRequest,
} from "../../utils/spendingReview"
import "../../styles/spending-review.css"
export default function SpendingValueField({
  description,
  value,
  onChange,
  excludeTransactionId,
}) {
  const { token } = useAuth()
  const [state, setState] = useState(null)
  useEffect(() => {
    if (description.trim().length < 2 || !token) return
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(async () => {
      try {
        const suggestion = await spendingRequest("/suggest", {
          token,
          method: "POST",
          body: {
            description: description.trim(),
            excludeTransactionId: excludeTransactionId || null,
          },
          signal: controller.signal,
        })
        if (active) setState({ description, suggestion })
      } catch (e) {
        if (active && e.name !== "AbortError")
          setState({ description, error: e.message })
      }
    }, 500)
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [description, excludeTransactionId, token])
  const current = state?.description === description ? state : null
  return (
    <section
      className="spending-value-field"
      aria-labelledby="spending-value-label"
    >
      <div className="spending-value-heading">
        <strong id="spending-value-label">How does this purchase feel?</strong>
        <span>Optional · your priorities</span>
      </div>
      <div
        className="spending-value-choices"
        role="group"
        aria-label="Your spending rating"
      >
        {SPENDING_VALUES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`spending-choice ${item.value}`}
            aria-pressed={value === item.value}
            title={item.description}
            onClick={() =>
              onChange(value === item.value ? "unreviewed" : item.value)
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="spending-value-help">
        Rate the value to you, separately from the category. A treat can be
        worthwhile too. Tap a selected rating to clear it.
      </p>
      {current?.suggestion?.value && (
        <div className="spending-suggestion" role="status">
          <Sparkles size={16} />
          <div>
            <strong>
              Suggested: {spendingLabel(current.suggestion.value)}
            </strong>
            <p>{current.suggestion.explanation}</p>
            <button
              type="button"
              className="text-link"
              disabled={value === current.suggestion.value}
              onClick={() => onChange(current.suggestion.value)}
            >
              {value === current.suggestion.value
                ? "Suggested rating selected"
                : "Use this rating"}
            </button>
          </div>
        </div>
      )}
      {current?.suggestion && !current.suggestion.value && (
        <small className="spending-value-help">
          {current.suggestion.explanation}
        </small>
      )}
      {current?.error && (
        <small className="spending-value-help" role="status">
          Suggestions are unavailable. You can choose a rating and save as
          usual.
        </small>
      )}
    </section>
  )
}
