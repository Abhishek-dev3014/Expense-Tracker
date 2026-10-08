import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import {
  Medal,
  Flame,
  Trophy,
  Lock,
  CheckCircle2,
  Star,
  Zap,
  Award,
  ShieldCheck
} from "lucide-react"

const Achievements = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await axios.get(`${BASE_URL}/api/gamification/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const allBadges = [
    { name: "First Step", description: "Log your first transaction", icon: <Star />, color: "text-amber-700", bg: "bg-amber-400/10" },
    { name: "Transaction Pro", description: "Log 50 transactions", icon: <Zap />, color: "text-emerald-800", bg: "bg-emerald-50" },
    { name: "Goal Crusher", description: "Complete your first savings goal", icon: <Award />, color: "text-emerald-800", bg: "bg-emerald-50" },
    { name: "Weekly Warrior", description: "Maintain a 7-day login streak", icon: <Flame />, color: "text-rose-700", bg: "bg-rose-400/10" },
    { name: "Budget Master", description: "Stay under budget for 3 months", icon: <ShieldCheck />, color: "text-emerald-800", bg: "bg-emerald-50" },
  ]

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">


        {data && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl">
             <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-stone-800 shadow-sm shadow-rose-500/30 ">
                <Flame size={24} fill="currentColor" />
             </div>
             <div>
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Active Streak</p>
                <p className="text-2xl font-semibold text-stone-800 leading-none">{data.streakCount} Days</p>
             </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
            <div className="col-span-full h-64 flex items-center justify-center text-stone-500 italic">
                Polishing your medals...
            </div>
        ) : (
          allBadges.map(badge => {
            const isUnlocked = data?.badges?.includes(badge.name)
            return (
              <div
                key={badge.name}
                className={`relative group p-6 rounded-xl border-2 transition-all duration-500 overflow-hidden ${isUnlocked ? 'bg-white border-stone-200 hover:bg-white' : 'bg-white border-stone-200 opacity-60 grayscale'}`}
              >
                {/* Status Indicator */}
                <div className={`absolute top-6 right-6 ${isUnlocked ? 'text-emerald-800' : 'text-stone-500'}`}>
                   {isUnlocked ? <CheckCircle2 size={24} /> : <Lock size={24} />}
                </div>

                {/* Badge Icon */}
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 shadow-sm ${badge.color} ${badge.bg} ${isUnlocked && 'shadow-current/20'}`}>
                  {badge.icon}
                </div>

                <div className="relative">
                  <h3 className={`text-2xl font-semibold transition-colors ${isUnlocked ? 'text-stone-800 group-hover:text-amber-700' : 'text-stone-500'}`}>
                    {badge.name}
                  </h3>
                  <p className="text-stone-600 mt-2 font-medium leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                {/* Decorative Elements */}
                {isUnlocked && (
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white rounded-full hidden group-hover:bg-amber-400/20 transition-all duration-500" />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Stats Summary */}
      {!loading && (
        <div className="p-12 rounded-xl bg-stone-100    border border-stone-200 flex flex-col items-center text-center gap-6">
           <Trophy size={64} className="text-amber-700 drop-shadow-sm" />
           <div>
              <h2 className="text-3xl font-semibold text-stone-800">Your Progress</h2>
              <p className="text-stone-600 mt-2 text-lg">You have unlocked {data?.badges?.length || 0} out of {allBadges.length} legendary achievements.</p>
           </div>

           <div className="h-4 w-full max-w-xl bg-white rounded-full overflow-hidden p-1 border border-stone-200">
              <div
                className="h-full bg-stone-100    rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((data?.badges?.length || 0) / allBadges.length) * 100}%` }}
              />
           </div>
        </div>
      )}
    </div>
  )
}

export default Achievements
