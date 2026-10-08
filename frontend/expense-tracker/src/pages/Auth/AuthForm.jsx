import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { AUTH_API } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import Brand from "../../components/ui/Brand"
export default function AuthForm({ signup = false }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(event.target)
    try {
      const response = await fetch(signup ? AUTH_API.SIGNUP : AUTH_API.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(
          data.message || "We couldn’t sign you in. Please try again.",
        )
      login(data.token)
      navigate("/dashboard")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow" style={{ marginBottom: 22 }}>
            A little more clarity
          </div>
          <h1>
            Good things grow
            <br />
            with a little
            <br />
            attention.
          </h1>
          <p>
            Know where your money goes. Make room for your goals. Feel more at
            home with your finances.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            {[28, 43, 38, 62, 76, 67, 100].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <small>Your everyday finances, thoughtfully organised.</small>
      </section>
      <main className="auth-form-wrap">
        <div style={{ marginBottom: 44 }}>
          <Brand />
        </div>
        <h2>{signup ? "Start with a fresh perspective." : "Welcome back."}</h2>
        <p>
          {signup
            ? "Create your account and take the first step toward a clearer financial picture."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit}>
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
            <label className="form-field" htmlFor="auth-password">
              Password
              <input
                id="auth-password"
                type="password"
                name="password"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "Create a password" : "Enter your password"
                }
                required
                minLength={signup ? 6 : undefined}
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="btn btn-primary"
              type="submit"
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
