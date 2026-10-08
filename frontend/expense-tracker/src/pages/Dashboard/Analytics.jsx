import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { BASE_URL } from "../../utils/apiPaths"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Activity,
  Calendar,
  IndianRupee,
  PieChart as PieIcon,
} from "lucide-react"

const COLORS = ["#8b9d73", "#365e43", "#c2ad88", "#b78369", "#a5b9b0"]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white backdrop-blur-xl border border-stone-200 p-4 rounded-xl shadow-sm space-y-2">
        {label && <p className="text-stone-600 text-[10px] font-bold uppercase tracking-wide border-b border-stone-200 pb-2 mb-2">{label}</p>}
        {payload.map((entry, index) => (
          <div key={index} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.fill }}
              />
              <p className="text-[11px] text-stone-600 font-medium capitalize">
                {entry.name}
              </p>
            </div>
            <p className="text-sm font-bold text-stone-800 ml-3.5 tracking-tight">
              ₹{entry.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const Analytics = () => {
  const { token } = useAuth()
  const authToken = token || localStorage.getItem("token")
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then(setData)
  }, [authToken])

  if (!data) return null

  // 1️⃣ MoM Calculation Logic
  const now = new Date()
  const currentMonthIdx = now.getMonth()
  const lastMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1

  const currentMonthData = { income: 0, expense: 0 }
  const lastMonthData = { income: 0, expense: 0 }

  data.allTransactions?.forEach((t) => {
    const tDate = new Date(t.date)
    const tMonth = tDate.getMonth()

    if (tMonth === currentMonthIdx) {
      if (t.amount > 0) currentMonthData.income += t.amount
      else currentMonthData.expense += Math.abs(t.amount)
    } else if (tMonth === lastMonthIdx) {
      if (t.amount > 0) lastMonthData.income += t.amount
      else lastMonthData.expense += Math.abs(t.amount)
    }
  })

  const getPercentChange = (current, last) => {
    if (last === 0) return current > 0 ? 100 : 0
    return ((current - last) / last) * 100
  }

  const incomeChange = getPercentChange(currentMonthData.income, lastMonthData.income)
  const expenseChange = getPercentChange(currentMonthData.expense, lastMonthData.expense)
  const balanceChange = getPercentChange(
    currentMonthData.income - currentMonthData.expense,
    lastMonthData.income - lastMonthData.expense
  )

  // 2️⃣ Monthly Data Logic (Sorting by month index for chart flow)
  const monthly = {}
  data.allTransactions?.forEach((t) => {
    const date = new Date(t.date)
    const month = date.toLocaleString("en-US", { month: "short" })
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    if (!monthly[monthKey]) monthly[monthKey] = { month, income: 0, expense: 0, sortKey: monthKey }
    if (t.amount > 0) monthly[monthKey].income += t.amount
    else monthly[monthKey].expense += Math.abs(t.amount)
  })
  const barData = Object.values(monthly).sort((a,b) => a.sortKey.localeCompare(b.sortKey)).slice(-6)

  // 3️⃣ Category Data Logic
  const categoryMap = {}
  data.allTransactions?.forEach((t) => {
    if (t.amount < 0) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount)
    }
  })
  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // 4️⃣ Daily Data Logic
  const dailyData = {}
  data.allTransactions?.forEach((t) => {
    if (t.amount < 0) {
      const day = new Date(t.date).toLocaleDateString("en-US", { weekday: "short" })
      dailyData[day] = (dailyData[day] || 0) + Math.abs(t.amount)
    }
  })
  const areaData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => ({
    day,
    value: dailyData[day] || 0
  }))

  const savingsRate = data.totalIncome > 0
    ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
    : 0
  const topCategories = pieData.slice(0, 3)
  const avgDailySpend = data.totalExpense / (areaData.filter(d => d.value > 0).length || 1)

  const metrics = [
    {
      label: "Net Balance",
      value: data.totalBalance,
      icon: Wallet,
      color: "text-emerald-800",
      bg: "bg-emerald-50",
      change: balanceChange
    },
    {
      label: "Total Income",
      value: data.totalIncome,
      icon: TrendingUp,
      color: "text-emerald-800",
      bg: "bg-emerald-50",
      change: incomeChange
    },
    {
      label: "Total Expenses",
      value: data.totalExpense,
      icon: TrendingDown,
      color: "text-rose-700",
      bg: "bg-rose-500/10",
      change: expenseChange
    },
    {
      label: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      icon: Activity,
      color: "text-amber-700",
      bg: "bg-amber-500/10",
      change: null
    },
  ]

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((item, idx) => (
          <div key={idx} className="relative group p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200 transition-all duration-500 hover:bg-white hover:border-emerald-200 hover:-translate-y-1 shadow-sm">
            <div className={`absolute top-6 right-6 p-2.5 rounded-lg ${item.bg} ${item.color} shadow-inner`}>
              <item.icon size={20} />
            </div>
            <p className="text-stone-500 text-[10px] font-semibold uppercase tracking-wide">{item.label}</p>
            <h3 className="text-2xl font-semibold text-stone-800 mt-2 tabular-nums tracking-tight">
              {typeof item.value === "number" ? `₹${item.value.toLocaleString()}` : item.value}
            </h3>

            {item.change !== null && (
              <div className={`flex items-center gap-1.5 mt-5 text-[11px] font-bold ${item.change >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{Math.abs(item.change).toFixed(1)}% vs last month</span>
              </div>
            )}
            {item.change === null && (
              <div className="flex items-center gap-1.5 mt-5 text-[11px] font-bold text-emerald-800/60 italic">
                <Activity size={14} />
                <span>Steady performance</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-stone-800 tracking-tight">Cash Flow Analysis</h3>
              <p className="text-sm text-stone-600 mt-1">Income and expenses over time</p>
            </div>
            <div className="flex gap-2 p-1.5 bg-white rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide text-emerald-800 bg-emerald-50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-100 shadow-sm" /> Income
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide text-emerald-800 bg-emerald-50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-100 shadow-sm" /> Expense
              </div>
            </div>
          </div>

          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="10 10" stroke="#e8ede1" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#4B5563"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  dy={15}
                />
                <YAxis
                  stroke="#4B5563"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${val/1000}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f4f6ef" }} />
                <Bar dataKey="income" fill="#365e43" radius={[8, 8, 0, 0]} barSize={28} />
                <Bar dataKey="expense" fill="#8b9d73" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <PieIcon size={18} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800 tracking-tight">Top Spending</h3>
              <p className="text-xs text-stone-500">Major categories this month</p>
            </div>
          </div>

          <div className="h-[240px] mb-10 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={10}
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Spent</p>
              <p className="text-xl font-semibold text-stone-800 tracking-tight">₹{data.totalExpense.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4 mt-auto">
            {topCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white border border-stone-200 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-xs text-stone-600 font-bold uppercase tracking-wider">{cat.name}</span>
                </div>
                <span className="text-sm font-semibold text-stone-800">₹{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-stone-100   backdrop-blur-xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800 tracking-tight">Daily spending</h3>
              <p className="text-sm text-stone-600 mt-1">Spending by day of the week</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500 uppercase font-semibold tracking-wide">Daily Average</p>
            <p className="text-3xl font-semibold text-stone-800 tracking-tight">₹{Math.round(avgDailySpend).toLocaleString()}</p>
          </div>
        </div>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a5b9b0" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a5b9b0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="10 10" stroke="#e8ede1" vertical={false} />
              <XAxis dataKey="day" stroke="#4B5563" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
              <YAxis stroke="#4B5563" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#a5b9b0"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

export default Analytics
