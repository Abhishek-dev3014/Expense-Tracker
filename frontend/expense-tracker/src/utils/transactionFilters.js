// Use local calendar boundaries, then send explicit instants to the API.
export const PERIODS = { all: "All time", today: "Today", week: "Last 7 days", month: "This month", lastMonth: "Last month" }

export function transactionParams({ page = 1, search = "", type = "", category = "", period = "all" }, now = new Date()) {
  const params = new URLSearchParams({ page: String(page), search })
  if (["income", "expense"].includes(type)) params.set("type", type)
  if (category) params.set("category", category)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  if (period === "week") start.setDate(start.getDate() - 6)
  if (period === "month") {
    start.setDate(1)
    end.setFullYear(now.getFullYear(), now.getMonth() + 1, 1)
  }
  if (period === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1)
    end.setFullYear(now.getFullYear(), now.getMonth(), 1)
  }
  if (period !== "all" && PERIODS[period]) {
    params.set("startDate", start.toISOString())
    params.set("endDate", new Date(end.getTime() - 1).toISOString())
  }
  return params
}

export function transactionDay(date, now = new Date()) {
  const value = new Date(date)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (value.toDateString() === now.toDateString()) return "Today"
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday"
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
