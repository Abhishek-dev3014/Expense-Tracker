import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Receipt,
  ChartNoAxesCombined,
  Target,
} from "lucide-react"
import { AUTH_API } from "../../utils/apiPaths"
import { authenticate } from "../../utils/authRequest"
import { useAuth } from "../../context/AuthContext"
import Brand from "../../components/ui/Brand"
export default function AuthForm({ signup = false }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [slow, setSlow] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  const submit = async (event) => {
    event.preventDefault()
    if (pending.current) return
    // Read successful controls before disabling the fieldset.
    const fields = new FormData(event.currentTarget)
    const credentials = {
      email: String(fields.get("email") || "")
        .trim()
        .toLowerCase(),
      password: String(fields.get("password") || ""),
      ...(signup ? { name: String(fields.get("name") || "").trim() } : {}),
    }
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setError("")
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 8000)
    try {
      const token = await authenticate(
        signup ? AUTH_API.SIGNUP : AUTH_API.LOGIN,
        credentials,
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      login(token)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message)
    } finally {
      clearTimeout(slowTimer)
      if (!controller.signal.aborted) {
        pending.current = null
        setLoading(false)
        setSlow(false)
      }
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow" style={{ marginBottom: 22 }}>
            YOUR PERSONAL FINANCE WORKSPACE
          </div>
          <h1>
            Your money.
            <br />A clearer view.
          </h1>
          <p>
            Track everyday spending, plan your budget, and see your progress.
            All in one focused workspace.
          </p>
          <div className="auth-features">
            <div>
              <Receipt size={20} />
              <span>
                <strong>Every expense, organised</strong>
                <small>Keep your daily transactions in one place.</small>
              </span>
            </div>
            <div>
              <ChartNoAxesCombined size={20} />
              <span>
                <strong>Understand your spending</strong>
                <small>See patterns with clear monthly breakdowns.</small>
              </span>
            </div>
            <div>
              <Target size={20} />
              <span>
                <strong>Plan your next step</strong>
                <small>Build a budget and track your savings goals.</small>
              </span>
            </div>
          </div>
        </div>
        <small>FinTrack · Personal finance, simplified.</small>
      </section>
      <main className="auth-form-wrap">
        <div style={{ marginBottom: 44 }}>
          <Brand />
        </div>
        <h2>{signup ? "Create your account." : "Welcome back."}</h2>
        <p>
          {signup
            ? "Start tracking your expenses and planning your finances."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit} aria-busy={loading}>
          <fieldset
            disabled={loading}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            {signup && (
              <label className="form-field" htmlFor="auth-name">
                Full name
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            <label className="form-field" htmlFor="auth-email">
              Email address
              <input
                id="auth-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <div className="password-input">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder={
                    signup ? "Create a password" : "Enter your password"
                  }
                  required
                  minLength={signup ? 6 : undefined}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="auth-password"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {signup && (
                <small className="field-hint">Use at least 6 characters.</small>
              )}
            </div>
            {slow && (
              <p
                role="status"
                style={{
                  color: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                Connecting to the server is taking longer than usual. Please
                keep this page open; we’ll stop waiting after one minute.
              </p>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", minHeight: 45, marginTop: 6 }}
            >
              {loading ? "Please wait…" : signup ? "Create account" : "Sign in"}
              <ArrowRight size={15} />
            </button>
          </fieldset>
        </form>
        <p style={{ fontSize: 12, textAlign: "center", marginTop: 25 }}>
          {signup ? "Already have an account? " : "New to FinTrack? "}
          <Link className="text-link" to={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </main>
    </div>
  )
}
