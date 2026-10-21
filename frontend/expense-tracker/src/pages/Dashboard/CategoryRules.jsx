import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Pencil, Pause, Play, Trash2, Tags } from "lucide-react"
import CategorySelect from "../../components/dashboard/CategorySelect"
import LoadingState, { LoadingIndicator } from "../../components/ui/LoadingState"
import { useAuth } from "../../context/AuthContext"
import { BASE_URL } from "../../utils/apiPaths"

export default function CategoryRules() {
  const { token } = useAuth()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const authToken = token || localStorage.getItem("token")

  const request = useCallback(async (path = "", options = {}) => {
    const response = await fetch(`${BASE_URL}/api/category-rules${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      signal: options.signal || AbortSignal.timeout(20000),
    })
    if (response.status === 204) return null
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.message || "Category memory could not be updated. Please try again.")
    if (!data) throw new Error("The service did not confirm your category memory. Refresh to check.")
    return data
  }, [authToken])

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError("")
    try {
      const data = await request("", { signal })
      if (!Array.isArray(data)) throw new Error("Category memory could not load. Please try again.")
      setRules(data)
    } catch (err) {
      if (!signal?.aborted) setError(err.message || "Category memory could not load.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [request])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const update = async (rule, changes) => {
    if (busy || categoryBusy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const saved = await request(`/${rule._id}`, {
        method: "PUT",
        body: JSON.stringify({ description: rule.description, category: rule.category, enabled: rule.enabled, ...changes }),
      })
      if (!saved?._id) throw new Error("The service did not confirm the rule. Refresh to check.")
      setRules((items) => items.map((item) => item._id === saved._id ? saved : item))
      setEditing(null)
      setNotice("Category memory updated. Existing expenses have not changed.")
    } catch (err) {
      setError(err.message || "Could not update the rule. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (rule) => {
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await request(`/${rule._id}`, { method: "DELETE" })
      setRules((items) => items.filter((item) => item._id !== rule._id))
      setDeleting(null)
      setNotice("Rule removed. Existing expenses have not changed.")
    } catch (err) {
      setError(err.message || "Could not remove the rule. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="category-memory-page">
      <section className="panel category-memory-intro">
        <Tags size={24} aria-hidden="true" />
        <div>
          <h2>Make a choice once. Remember it next time.</h2>
          <p>When adding or editing an expense, choose a category and select “Remember for this description”. Auto-detect will use that choice for future matching expenses and imports.</p>
          <p>Matches ignore case and extra spacing. Different descriptions stay separate, so “Uber ride” and “Uber Eats” can have different categories. Rules are private to your account.</p>
        </div>
      </section>
      {error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={() => load()} disabled={busy}>Refresh rules</button></div>}
      {notice && <p className="category-memory-notice" role="status">{notice}</p>}
      {loading ? <LoadingState variant="table" label="Loading your remembered categories…" rows={3} /> : rules.length === 0 ? (
        <section className="panel empty-state">
          <h2>No remembered categories yet</h2>
          <p>Try correcting an expense such as “Uber travel”, then remember your preferred category.</p>
          <Link to="/dashboard/transactions" className="btn">View transactions</Link>
        </section>
      ) : (
        <ul className="category-memory-list" aria-label="Your remembered categories">
          {rules.map((rule) => (
            <li key={rule._id} className="panel category-memory-rule">
              {editing === rule._id ? (
                <form onSubmit={(event) => {
                  event.preventDefault()
                  const form = event.currentTarget
                  update(rule, { description: form.description.value.trim(), category: form.category.value })
                }}>
                  <fieldset disabled={busy}>
                    <label className="form-field">Match this description
                      <input name="description" defaultValue={rule.description} maxLength={200} required autoFocus />
                    </label>
                    <CategorySelect id="rule-category" type="expense" defaultValue={rule.category} onBusyChange={setCategoryBusy} allowAutoDetect={false} />
                    <div className="category-memory-actions">
                      <button className="btn btn-primary" disabled={busy || categoryBusy} aria-busy={busy}>{busy ? <LoadingIndicator>Saving rule…</LoadingIndicator> : "Save rule"}</button>
                      <button type="button" className="btn" disabled={busy || categoryBusy} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <>
                  <div className="category-memory-description">
                    <h3>{rule.description}</h3>
                    <p><span className="category-pill">{rule.category}</span> <span>{rule.enabled ? "Active" : "Paused"}</span></p>
                  </div>
                  <div className="category-memory-actions">
                    <button className="btn" disabled={busy || Boolean(editing)} onClick={() => { setEditing(rule._id); setDeleting(null); setError("") }}><Pencil size={14} /> Edit</button>
                    <button className="btn" disabled={busy || Boolean(editing)} onClick={() => update(rule, { enabled: !rule.enabled })} aria-label={`${rule.enabled ? "Pause" : "Resume"} rule for ${rule.description}`}>
                      {rule.enabled ? <Pause size={14} /> : <Play size={14} />} {rule.enabled ? "Pause" : "Resume"}
                    </button>
                    <button className="btn" disabled={busy || Boolean(editing)} onClick={() => setDeleting(rule._id)} aria-label={`Remove rule for ${rule.description}`}><Trash2 size={14} /> Remove</button>
                  </div>
                  {deleting === rule._id && (
                    <div className="category-memory-delete" role="group" aria-label="Confirm rule removal">
                      <p>Remove this remembered choice? Future Auto-detect will use the model for this description.</p>
                      <button className="btn" disabled={busy} onClick={() => remove(rule)}>Remove rule</button>
                      <button className="btn" disabled={busy} onClick={() => setDeleting(null)}>Keep rule</button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
