export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0)
export const isIncome = (tx) =>
  tx.type ? tx.type === "income" : Number(tx.amount) > 0

export function expensePage(transactions = [], page = 1, pageSize = 5) {
  const expenses = transactions.filter((tx) => !isIncome(tx))
  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  return {
    transactions: expenses.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    ),
    totalPages,
    currentPage,
  }
}

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
  const categories = new Map()
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
        const name = tx.category || "Other"
        const category = categories.get(name) || { name, value: 0, transactions: [] }
        category.value += amount
        category.transactions.push(tx)
        categories.set(name, category)
      }
    }
  }
  const allCategories = [...categories.values()].sort((a, b) => b.value - a.value)
  const topCategories = allCategories.slice(0, 4)
  if (allCategories.length > 4)
    topCategories.push({
      name: "Other categories",
      value: allCategories.slice(4).reduce((sum, entry) => sum + entry.value, 0),
      transactions: allCategories.slice(4).flatMap((entry) => entry.transactions),
    })
  return {
    ...data,
    monthlyIncome,
    monthlyExpense,
    months,
    categories: topCategories,
    spendingMonth: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    averageDailyExpense: monthlyExpense / now.getDate(),
  }
}
