import { BASE_URL } from "./apiPaths.js";

export async function planningRequest(
  path = "",
  { token, method = "GET", body, signal, timeoutMs = 20000 } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(`${BASE_URL}/api/analytics${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = "Analytics could not load. Please try again.";
      const planningUnavailable =
        response.status === 404 &&
        method === "GET" &&
        (path === "" || path.startsWith("?"));
      if (planningUnavailable)
        message =
          "We couldn’t reach the latest analytics service. You can still view and manage your transactions.";
      try {
        const error = await response.json();
        // The old backend returns a generic JSON 404. Keep the route-specific
        // explanation rather than replacing it with “Endpoint not found”.
        if (
          !planningUnavailable &&
          typeof error.message === "string" &&
          error.message
        )
          message = error.message;
      } catch {
        /* A gateway may return HTML. */
      }
      throw Object.assign(new Error(message), {
        status: response.status,
        code: planningUnavailable ? "ANALYTICS_UNAVAILABLE" : "REQUEST_FAILED",
      });
    }
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error(
        "This request took too long. Please check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function localMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
