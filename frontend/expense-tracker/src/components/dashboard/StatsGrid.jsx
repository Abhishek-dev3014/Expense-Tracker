import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sprout,
  CalendarDays,
  Receipt,
} from "lucide-react"
import StatCard from "./StatCard"
export default function StatsGrid({ data, expensesOnly = false }) {
  if (!data) return null
  const { totalBalance = 0, monthlyIncome = 0, monthlyExpense = 0 } = data
  if (expensesOnly)
    return (
      <section
        className="stats-grid stats-grid-expenses"
        aria-label="Expense summary"
      >
        <StatCard
          title="Expenses this month"
          value={monthlyExpense}
          highlight
          subtitle="Your spending so far this month"
          icon={<ArrowUpRight />}
        />
        <StatCard
          title="Daily average"
          value={data.averageDailyExpense}
          subtitle="Across all days so far this month"
          icon={<CalendarDays />}
        />
        <StatCard
          title="Total expenses"
          value={data.totalExpense}
          subtitle="Across all your recorded expenses"
          icon={<Receipt />}
        />
      </section>
    )
  return (
    <section className="stats-grid" aria-label="Financial summary">
      <StatCard
        title="Total balance"
        value={totalBalance}
        highlight
        subtitle="Across all your transactions"
        icon={<Wallet />}
      />
      <StatCard
        title="Income"
        tone="income"
        value={monthlyIncome}
        subtitle="Received this month"
        icon={<ArrowDownLeft />}
      />
      <StatCard
        title="Expenses"
        tone="expense"
        value={monthlyExpense}
        subtitle="Spent this month"
        icon={<ArrowUpRight />}
      />
      <StatCard
        title="Net savings"
        tone="savings"
        value={monthlyIncome - monthlyExpense}
        subtitle="Income minus expenses this month"
        icon={<Sprout />}
      />
    </section>
  )
}
