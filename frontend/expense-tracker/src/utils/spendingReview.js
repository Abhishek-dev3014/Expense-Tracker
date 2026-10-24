import { BASE_URL } from "./apiPaths.js";
export const SPENDING_VALUES = [
  {
    value: "good",
    label: "Good for me",
    description: "Worthwhile for my priorities",
  },
  {
    value: "fine",
    label: "Fine for me",
    description: "A reasonable choice for me",
  },
  {
    value: "improve",
    label: "Could improve",
    description: "I would change this next time",
  },
];
export function spendingLabel(value) {
  return SPENDING_VALUES.find((v) => v.value === value)?.label || "Not rated";
}
export async function spendingRequest(
  path = "",
  { token, method = "GET", body, signal, timeoutMs = 15000 } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const r = await fetch(`${BASE_URL}/api/spending-review${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok)
      throw new Error(
        r.status === 404
          ? "Personal spending reviews are not available yet. You can still save and edit expenses."
          : data?.message ||
              "Your spending review could not be updated. Please try again.",
      );
    if (
      r.status !== 204 &&
      (!data || typeof data !== "object" || Array.isArray(data))
    )
      throw new Error(
        "The service returned an incomplete spending review. Please refresh to check your changes.",
      );
    return data;
  } catch (e) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error(
        "The spending review request timed out. Please try again.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
