export async function updateTransaction(url, values, token) {
  let response
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    })
  } catch {
    throw new Error("We couldn’t reach the service. Check your connection and try again.")
  }
  const data = await response.json().catch(() => null)
  const message = typeof data?.message === "string" ? data.message : ""
  if (
    response.status === 405 ||
    (response.status === 404 && (!message || message === "Endpoint not found."))
  ) {
    throw new Error(
      "Transaction editing isn’t available on the service yet. The service needs to be updated before changes can be saved.",
    )
  }
  if (response.status === 401)
    throw new Error("Your session has expired. Please sign in again before saving.")
  if (!response.ok)
    throw new Error(message || "Could not save this transaction. Please try again.")
  if (!data?._id)
    throw new Error("The service did not confirm your changes. Please refresh your transactions to check before trying again.")
  return data
}
