import { useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"

const defaults = {
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Rent",
    "Utilities",
    "Entertainment",
    "Health",
    "Education",
    "Other",
  ],
  income: ["Salary", "Freelance", "Business", "Investment", "Other"],
}
export default function CategorySelect({ type, onBusyChange }) {
  const { token } = useAuth()
  const [categories, setCategories] = useState([])
  const [value, setValue] = useState("")
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const input = useRef(null)
  const select = useRef(null)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(() => controller.abort(), 20000)
    async function load() {
      setLoading(true)
      setLoadError("")
      try {
        const response = await fetch(
          `${BASE_URL}/api/categories?type=${type}`,
          {
            headers: {
              Authorization: `Bearer ${token || localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          },
        )
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!Array.isArray(data.categories)) throw new Error()
        if (active) setCategories(data.categories)
      } catch {
        if (active) setLoadError("Saved categories couldn’t load.")
      } finally {
        clearTimeout(timer)
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [type, token, revision])
  useEffect(() => {
    if (editing) input.current?.focus()
  }, [editing])
  const saveCategory = async () => {
    if (pending.current) return
    const cleaned = name.normalize("NFKC").trim().replace(/\s+/g, " ")
    if (!cleaned || cleaned.length > 40) {
      setError("Enter a name of 1–40 characters.")
      return
    }
    const existing = [...defaults[type], ...categories].find(
      (item) => item.toLowerCase() === cleaned.toLowerCase(),
    )
    if (existing) {
      setValue(existing)
      setEditing(false)
      setName("")
      setError("")
      select.current?.focus()
      return
    }
    const controller = new AbortController()
    pending.current = controller
    const timer = setTimeout(() => controller.abort(), 20000)
    setSaving(true)
    onBusyChange(true)
    setError("")
    try {
      const response = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: cleaned, type }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.name !== "string")
        throw new Error(
          data.message || "Your category could not be saved. Please try again.",
        )
      setCategories((items) => [...new Set([...items, data.name])])
      setValue(data.name)
      setName("")
      setEditing(false)
      select.current?.focus()
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Saving took too long. Please try again."
          : err.message,
      )
    } finally {
      clearTimeout(timer)
      pending.current = null
      setSaving(false)
      onBusyChange(false)
    }
  }
  return (
    <div className="form-field category-field">
      <label htmlFor="transaction-category">Category</label>
      <select
        ref={select}
        id="transaction-category"
        name="category"
        required={type === "income"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={saving}
      >
        <option value="">
          {type === "income" ? "Select category" : "Auto-detect"}
        </option>
        {defaults[type].map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
        {categories.length > 0 && (
          <optgroup label="Your categories">
            {categories
              .filter((item) => !defaults[type].includes(item))
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </optgroup>
        )}
      </select>
      {loading && (
        <small className="field-hint" role="status">
          Loading saved categories…
        </small>
      )}
      {loadError && (
        <div className="category-load-error" role="status">
          {loadError}{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setRevision((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {!editing ? (
        <button
          type="button"
          className="text-link category-add"
          onClick={() => {
            setEditing(true)
            setError("")
          }}
        >
          <Plus size={14} /> Add category
        </button>
      ) : (
        <div className="category-editor">
          <label htmlFor="custom-category-name">New {type} category</label>
          <input
            ref={input}
            id="custom-category-name"
            value={name}
            maxLength={40}
            placeholder="e.g. Pet care"
            disabled={saving}
            aria-describedby="category-help"
            aria-invalid={Boolean(error)}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                saveCategory()
              }
            }}
          />
          <small id="category-help" className="field-hint">
            Saved to your account for future{" "}
            {type === "income" ? "income entries" : "expenses"}.
          </small>
          {error && (
            <small role="alert" className="category-error">
              {error}
            </small>
          )}
          <div className="category-editor-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={saveCategory}
            >
              {saving ? "Saving…" : "Save category"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={() => {
                setEditing(false)
                setError("")
                select.current?.focus()
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
