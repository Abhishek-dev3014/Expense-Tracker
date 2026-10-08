export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0)
export const isIncome = (tx) =>
  tx.type ? tx.type === "income" : Number(tx.amount) > 0

export function buildOverview(data, now = new Date()) {
  const transactions = data.allTransactions || []
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    return {
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      income: 0,
      expense: 0,
    }
  })
  const categories = {}
  let monthlyIncome = 0,
    monthlyExpense = 0
  for (const tx of transactions) {
    const date = new Date(tx.date)
    const amount = Math.abs(Number(tx.amount) || 0)
    const income = isIncome(tx)
    const bucket = months.find(
      (month) =>
        month.year === date.getFullYear() &&
        month.monthIndex === date.getMonth(),
    )
    if (bucket) bucket[income ? "income" : "expense"] += amount
    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      if (income) monthlyIncome += amount
      else {
        monthlyExpense += amount
        categories[tx.category || "Other"] =
          (categories[tx.category || "Other"] || 0) + amount
      }
    }
  }
  const allCategories = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const topCategories = allCategories
    .slice(0, 4)
    .map(([name, value]) => ({ name, value }))
  if (allCategories.length > 4)
    topCategories.push({
      name: "Other categories",
      value: allCategories.slice(4).reduce((sum, entry) => sum + entry[1], 0),
    })
  return {
    ...data,
    monthlyIncome,
    monthlyExpense,
    months,
    categories: topCategories,
    averageDailyExpense: monthlyExpense / now.getDate(),
  }
}
