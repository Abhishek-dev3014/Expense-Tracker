import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import {
  Target,
  Wallet,
  TrendingDown,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react"

const Budget = () => {
  const { token } = useAuth()
  const authToken = token || localStorage.getItem("token")

  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchBudget = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/budget`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [authToken])

  const saveBudget = async () => {
    if (!monthlyLimit || monthlyLimit <= 0) return
    try {
      await axios.post(
        `${BASE_URL}/api/budget`,
        { monthlyLimit: Number(monthlyLimit) },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      setMonthlyLimit("")
      fetchBudget()
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchBudget()
  }, [fetchBudget])

  const percentage =
    data?.budget && data?.budget.monthlyLimit
      ? (data.used / data.budget.monthlyLimit) * 100
      : 0

  const getStatusColor = () => {
    if (percentage > 90) return "bg-rose-500"
    if (percentage > 70) return "bg-amber-500"
    return "bg-emerald-100"
  }

  const getStatusText = () => {
    if (percentage > 100) return "Over Budget"
    if (percentage > 90) return "Critical Limit"
    if (percentage > 70) return "Approaching Limit"
    return "Safe Zone"
  }

  const getStatusIcon = () => {
    if (percentage > 90) return <AlertCircle className="text-rose-700" size={18} />
    if (percentage > 70) return <Info className="text-amber-700" size={18} />
    return <CheckCircle2 className="text-emerald-800" size={18} />
  }

  if (loading) return null

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Metrics & Progress */}
        <div className="lg:col-span-8 space-y-8">

          {/* Main Budget Card */}
          {data?.budget ? (
            <div className="p-8 rounded-xl bg-white backdrop-blur-xl border border-stone-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full hidden -mr-16 -mt-16 transition-all group-hover:bg-emerald-50" />

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-lg border border-stone-200">
                    <Target className="text-emerald-800" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Monthly Budget</h3>
                    <p className="text-sm text-stone-600">Current active plan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-500 uppercase font-medium">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon()}
                    <span className={`text-sm font-bold uppercase tracking-wider ${percentage > 90 ? 'text-rose-700' : percentage > 70 ? 'text-amber-700' : 'text-emerald-800'}`}>
                      {getStatusText()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-sm text-stone-600 font-medium">Usage Progress</span>
                    <span className="text-2xl font-bold text-stone-800 tabular-nums">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white border border-stone-200 rounded-full h-4 relative overflow-hidden p-0.5">
                    <div
                      className={`${getStatusColor()} h-full rounded-full transition-all duration-1000 ease-out shadow-sm`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4 border-t border-stone-200">
                  <div>
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-1">Limit</p>
                    <p className="text-xl font-bold text-stone-800 tabular-nums">₹{data.budget.monthlyLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-1">Used</p>
                    <p className="text-xl font-bold text-emerald-800 tabular-nums">₹{data.used.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-1">Remaining</p>
                    <p className={`text-xl font-bold tabular-nums ${data.remaining < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                      ₹{data.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white backdrop-blur-xl border border-stone-200 border-dashed flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6">
                <Target className="text-stone-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">No active budget set</h3>
              <p className="text-stone-600 max-w-sm">Set your first monthly spending limit to start tracking your financial goals more effectively.</p>
            </div>
          )}

          {/* Tips Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <TrendingDown className="text-emerald-800" size={20} />
              </div>
              <div>
                <h4 className="text-stone-800 font-semibold mb-1">Savings Tip</h4>
                <p className="text-xs text-stone-600 leading-relaxed">Consider setting your budget 20% lower than your target to build emergency funds faster.</p>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Wallet className="text-emerald-800" size={20} />
              </div>
              <div>
                <h4 className="text-stone-800 font-semibold mb-1">Spending Habit</h4>
                <p className="text-xs text-stone-600 leading-relaxed">Wait 24 hours before any non-essential purchase to reduce impulsive expenditure.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
          <div className="p-8 rounded-xl bg-white border border-stone-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <PlusCircle className="text-emerald-800" size={20} />
              <h3 className="text-lg font-semibold text-stone-800">Adjust Budget</h3>
            </div>

            <p className="text-sm text-stone-600 mb-8 leading-relaxed">
              Define your monthly spending ceiling. We will alert you when you approach this limit.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-xs text-stone-500 uppercase font-bold tracking-wide block mb-2 px-1">Monthly Limit (₹)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                    <IndianRupee size={16} />
                  </div>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full pl-10 pr-4 py-4 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:border-emerald-200 transition-all font-semibold"
                  />
                </div>
              </div>

              <button
                onClick={saveBudget}
                disabled={!monthlyLimit || monthlyLimit <= 0}
                className="w-full py-4 bg-emerald-100 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-stone-800 font-bold transition-all shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2 btn-primary"
              >
                Set New Budget
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-stone-200">
              <div className="p-4 rounded-lg bg-white border border-stone-200">
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Info size={14} className="text-emerald-800" />
                  <span>Updates affect the current month</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Stub for IndianRupee if not available (though it is in Lucide)
const IndianRupee = ({size}) => <span className="font-bold" style={{fontSize: size}}>₹</span>

export default Budget
