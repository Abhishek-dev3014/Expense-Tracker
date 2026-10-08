export const AUTH_TIMEOUT_MS = 60_000

// Keep one bounded request: automatically retrying sign-up can create duplicate accounts.
export async function authenticate(
  url,
  credentials,
  { signal, timeoutMs = AUTH_TIMEOUT_MS } = {},
) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) controller.abort()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    })
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(
        "The sign-in service is temporarily unavailable. Please try again shortly.",
      )
    }
    if (!response.ok) {
      throw new Error(
        typeof data?.message === "string"
          ? data.message
          : response.status >= 500
            ? "The sign-in service is temporarily unavailable. Please try again shortly."
            : "We couldn’t complete your request. Please check your details and try again.",
      )
    }
    if (typeof data?.token !== "string" || !data.token.trim()) {
      throw new Error("The server did not complete sign-in. Please try again.")
    }
    return data.token
  } catch (error) {
    if (timedOut) {
      throw new Error(
        "The server is taking too long to respond. Please try again in a moment. If you were creating an account, try signing in before submitting again.",
      )
    }
    if (signal?.aborted) throw error
    if (error instanceof TypeError) {
      throw new Error(
        "We can’t reach the sign-in service. Check your connection and try again shortly.",
      )
    }
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", abort)
  }
}
