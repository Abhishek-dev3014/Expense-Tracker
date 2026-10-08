import { useEffect, useState } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Rocket,
  ShieldCheck,
  BarChart3,
  Zap,
  ZapOff,
  Tag,
  AlertCircle,
  Lightbulb,
  CheckCircle2
} from "lucide-react"

const AIInsights = () => {
  const { token } = useAuth()
  const authToken = token || localStorage.getItem("token")

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/insights`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        setData(res.data)
      } catch (err) {
        console.error(err)
        setError("Failed to load AI insights.")
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [authToken])

  const getInsightStyles = (type) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          iconBg: "bg-rose-500/20",
          iconColor: "text-rose-700",
          textColor: "text-rose-700"
        }
      case "success":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-800",
          textColor: "text-emerald-800"
        }
      case "tip":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-800",
          textColor: "text-emerald-800"
        }
      default:
        return {
          bg: "bg-white",
          border: "border-stone-200",
          iconBg: "bg-white",
          iconColor: "text-emerald-800",
          textColor: "text-stone-600"
        }
    }
  }

  const getIcon = (iconName) => {
    const icons = {
      TrendingDown: <TrendingDown size={20} />,
      Rocket: <Rocket size={20} />,
      ShieldCheck: <ShieldCheck size={20} />,
      BarChart3: <BarChart3 size={20} />,
      Zap: <Zap size={20} />,
      ZapOff: <ZapOff size={20} />,
      Tag: <Tag size={20} />,
    }
    return icons[iconName] || <Lightbulb size={20} />
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <BrainCircuit className="text-indigo-500 animate-pulse" size={48} />
      <p className="text-stone-600 animate-pulse font-medium">Loading your financial insights…</p>
    </div>
  )

  if (error) return (
    <div className="p-8 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-4 text-rose-700">
      <AlertCircle size={24} />
      <p>{error}</p>
    </div>
  )

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200 group hover:border-stone-200 transition-all">
          <p className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-2">Total Monthly Income</p>
          <p className="text-3xl font-bold text-stone-800 tabular-nums">₹{data.totalIncome?.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200 group hover:border-stone-200 transition-all">
          <p className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-2">Total Monthly Expense</p>
          <p className="text-3xl font-bold text-rose-700 tabular-nums">₹{data.totalExpense?.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-xl bg-emerald-50 backdrop-blur-xl border border-emerald-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full hidden -mr-12 -mt-12" />
          <p className="text-xs text-emerald-800 uppercase font-bold tracking-wide mb-2 flex items-center gap-2">
            Savings Rate <CheckCircle2 size={14} />
          </p>
          <p className="text-3xl font-bold text-emerald-800 tabular-nums">{data.savingsRate}%</p>
        </div>
      </div>

      {/* Structured Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.insights?.length > 0 ? (
          data.insights.map((insight, index) => {
            const style = getInsightStyles(insight.type)
            return (
              <div
                key={index}
                className={`p-6 rounded-xl ${style.bg} border ${style.border} flex items-start gap-5 hover:scale-[1.02] transition-all duration-300`}
              >
                <div className={`p-4 ${style.iconBg} rounded-lg ${style.iconColor} shrink-0`}>
                  {getIcon(insight.icon)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 uppercase font-bold tracking-wide">{insight.type}</p>
                  <p className={`text-[0.95rem] leading-relaxed font-medium ${style.textColor}`}>
                    {insight.message}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-2 p-12 rounded-xl bg-white backdrop-blur-xl border border-stone-200 border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6">
              <Sparkles className="text-stone-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Analyzing your patterns...</h3>
            <p className="text-stone-600 max-w-sm">We need a few more transactions to provide accurate financial advice. Keep tracking your spending!</p>
          </div>
        )}
      </div>

    </div>
  )
}

export default AIInsights
