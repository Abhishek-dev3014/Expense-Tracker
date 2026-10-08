import { Wallet, ArrowDownLeft, ArrowUpRight, Sprout } from "lucide-react"
import StatCard from "./StatCard"
export default function StatsGrid({ data }) {
  if (!data) return null
  const { totalBalance = 0, monthlyIncome = 0, monthlyExpense = 0 } = data
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
        value={monthlyIncome}
        subtitle="Received this month"
        icon={<ArrowDownLeft />}
      />
      <StatCard
        title="Expenses"
        value={monthlyExpense}
        subtitle="Spent this month"
        icon={<ArrowUpRight />}
      />
      <StatCard
        title="Net savings"
        value={monthlyIncome - monthlyExpense}
        subtitle="Income minus expenses this month"
        icon={<Sprout />}
      />
    </section>
  )
}
