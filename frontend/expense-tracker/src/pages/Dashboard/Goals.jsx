import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import LoadingState from "../../components/ui/LoadingState"
import GoalDialog from "../../components/dashboard/GoalDialog"
import toast from "react-hot-toast"
import {
  Flag,
  Plus,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Trophy,
  Wallet
} from "lucide-react"

const Goals = () => {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)


  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await axios.get(`${BASE_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGoals(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleAdd = async (values) => {
    const token = localStorage.getItem("token")
    const response = await axios.post(`${BASE_URL}/api/goals`, values, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    })
    setGoals((current) => [response.data, ...current])
    toast.success("Savings goal created")
  }

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${BASE_URL}/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchGoals()
    } catch (err) {
      console.error(err)
    }
  }

  const addFunds = async (id, current) => {
    const amount = prompt("Enter amount to add (₹):")
    if (!amount || isNaN(amount)) return

    try {
      const token = localStorage.getItem("token")
      await axios.put(`${BASE_URL}/api/goals/${id}`,
        { currentAmount: Number(current) + Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchGoals()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading && goals.length === 0) return <LoadingState cards={3} label="Loading your savings goals…" rows={3} />

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">


        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Create goal
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 rounded-xl bg-white backdrop-blur-xl border border-stone-200 group hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <TrendingUp size={24} />
               </div>
               <span className="text-stone-600 font-medium tracking-wide text-sm uppercase">Total Savings</span>
            </div>
            <p className="text-3xl font-bold text-stone-800">₹{goals.reduce((acc, curr) => acc + curr.currentAmount, 0).toLocaleString()}</p>
         </div>

         <div className="p-8 rounded-xl bg-white backdrop-blur-xl border border-stone-200 group hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Target size={24} />
               </div>
               <span className="text-stone-600 font-medium tracking-wide text-sm uppercase">Active Goals</span>
            </div>
            <p className="text-3xl font-bold text-stone-800">{goals.filter(g => g.status === 'active').length}</p>
         </div>

         <div className="p-8 rounded-xl bg-emerald-50 backdrop-blur-xl border border-emerald-200 group transition-all">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Trophy size={24} />
               </div>
               <span className="text-emerald-800 font-medium tracking-wide text-sm uppercase">Completed</span>
            </div>
            <p className="text-3xl font-bold text-stone-800">{goals.filter(g => g.status === 'completed').length}</p>
         </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full"><LoadingState variant="cards" cards={2} label="Updating your savings goals…" /></div>
        ) : goals.length === 0 ? (
          <div className="col-span-full p-24 text-center rounded-xl bg-white border-2 border-dashed border-stone-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Flag size={32} className="text-stone-500" />
            </div>
            <h3 className="text-2xl font-bold text-stone-800">No active goals</h3>
            <p className="text-stone-600 mt-2 max-w-sm mx-auto italic">
              "A goal without a plan is just a wish." Start planning your next big purchase today.
            </p>
          </div>
        ) : (
          goals.map(goal => {
            const percentage = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
            return (
              <div
                key={goal._id}
                className="group relative p-8 rounded-xl bg-white hover:bg-white backdrop-blur-md border border-stone-200 transition-all duration-500 overflow-hidden"
              >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 hidden -mr-16 -mt-16 transition-all duration-500 ${goal.status === 'completed' ? 'bg-emerald-50' : 'bg-emerald-50'}`} />

                <div className="relative flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-3 py-1 rounded-full bg-white text-xs font-bold text-stone-600 uppercase tracking-wide">{goal.category}</span>
                       {goal.status === 'completed' && (
                         <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                            <Trophy size={12} /> Winner
                         </span>
                       )}
                    </div>
                    <h3 className="text-2xl font-bold text-stone-800 group-hover:text-emerald-800 transition-colors">{goal.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(goal._id)}
                    className="p-3 rounded-lg bg-white text-stone-500 hover:text-rose-700 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-stone-600 mb-1">Target Amount</p>
                      <p className="text-2xl font-bold text-stone-800">₹{goal.targetAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-600 mb-1">Progress</p>
                      <p className="text-2xl font-bold text-emerald-800">{percentage}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-4 w-full bg-white rounded-full overflow-hidden border border-stone-200">
                    <div
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${goal.status === 'completed' ? 'bg-stone-100   shadow-sm' : 'bg-stone-100  '}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-4">
                     <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Calendar size={14} />
                        <span>Deadline: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'N/A'}</span>
                     </div>
                     <button
                        disabled={goal.status === 'completed'}
                        onClick={() => addFunds(goal._id, goal.currentAmount, goal.targetAmount)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all active:scale-95 ${goal.status === 'completed' ? 'bg-emerald-50 text-emerald-500 cursor-not-allowed' : 'bg-white text-stone-800 hover:bg-white border border-stone-200'}`}
                     >
                        <Wallet size={16} />
                        {goal.status === 'completed' ? 'Goal Achieved' : 'Add Funds'}
                     </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showAddForm && <GoalDialog onClose={() => setShowAddForm(false)} onSubmit={handleAdd} />}

    </div>
  )
}

export default Goals
