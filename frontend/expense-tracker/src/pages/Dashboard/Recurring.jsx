import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import {
  RotateCcw,
  Plus,
  Trash2,
  Play,
  Pause,
  Calendar,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

const Recurring = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "General",
    type: "expense",
    frequency: "monthly",
    startDate: new Date().toISOString().split('T')[0]
  })

  const fetchRecurring = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await axios.get(`${BASE_URL}/api/recurring`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setItems(res.data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError("Failed to fetch recurring transactions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecurring()
  }, [fetchRecurring])

  const handleProcess = async () => {
    try {
      setProcessing(true)
      const token = localStorage.getItem("token")
      await axios.post(`${BASE_URL}/api/recurring/process`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchRecurring()
      // Optional: Add a subtle notification here
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      await axios.post(`${BASE_URL}/api/recurring`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowAddForm(false)
      fetchRecurring()
      setFormData({
        title: "",
        amount: "",
        category: "General",
        type: "expense",
        frequency: "monthly",
        startDate: new Date().toISOString().split('T')[0]
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${BASE_URL}/api/recurring/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchRecurring()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("token")
      await axios.put(`${BASE_URL}/api/recurring/${id}`,
        { status: currentStatus === "active" ? "paused" : "active" },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchRecurring()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">


        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleProcess}
            disabled={processing || items.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-stone-200 hover:bg-white text-stone-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {processing ? "Processing..." : "Process Pending"}
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-100 hover:bg-emerald-100 text-stone-800 font-semibold transition-all shadow-sm shadow-indigo-500/25 active:scale-95"
          >
            <Plus size={20} />
            Add Recurring
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200">
          <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">Active Items</p>
          <p className="text-3xl font-bold text-stone-800 mt-2">
            {items.filter(i => i.status === "active").length}
          </p>
        </div>
        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200">
          <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">Total Monthly Outflow</p>
          <p className="text-3xl font-bold text-rose-700 mt-2">
            ₹{items.filter(i => i.type === "expense" && i.frequency === "monthly").reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="p-6 rounded-xl bg-white backdrop-blur-xl border border-stone-200">
          <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">Next Auto-Process</p>
          <p className="text-2xl font-bold text-emerald-800 mt-2">
            {items.length > 0 ? new Date(Math.min(...items.map(i => new Date(i.nextOccurrence)))).toLocaleDateString() : "No tasks"}
          </p>
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-stone-600 italic">
            Gathering your automation rules...
          </div>
        ) : items.length === 0 ? (
          <div className="p-20 text-center rounded-xl bg-white border-2 border-dashed border-stone-200">
            <RotateCcw size={48} className="mx-auto text-stone-500 mb-4" />
            <h3 className="text-xl font-semibold text-stone-800">No recurring tasks found</h3>
            <p className="text-stone-600 mt-2 max-w-sm mx-auto">
              Start by adding your rent, Netflix, or salary to automate your tracking.
            </p>
            <button
               onClick={() => setShowAddForm(true)}
               className="mt-6 text-emerald-800 hover:text-emerald-800 font-medium"
            >
              Add your first recurring item →
            </button>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item._id}
              className="group relative p-8 rounded-xl bg-white hover:bg-white backdrop-blur-md border border-stone-200 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${item.type === "income" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-500/10 text-rose-700 border border-rose-500/20"}`}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800 group-hover:text-emerald-800 transition-colors uppercase tracking-tight">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-600">
                    <span className="flex items-center gap-1.5"><Tag size={14} /> {item.category}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {item.frequency}</span>
                    <span className="flex items-center gap-1.5"><RotateCcw size={14} /> Next: {new Date(item.nextOccurrence).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className={`text-2xl font-bold ${item.type === "income" ? "text-emerald-800" : "text-rose-700"}`}>
                    {item.type === "income" ? "+" : "-"} ₹{item.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wide mt-1">{item.status}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStatus(item._id, item.status)}
                    className={`p-3 rounded-xl transition-all ${item.status === 'active' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-50'}`}
                    title={item.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {item.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-3 rounded-xl bg-white text-stone-600 hover:bg-rose-500/10 hover:text-rose-700 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-white backdrop-blur-xl" onClick={() => setShowAddForm(false)}></div>

          <div className="relative w-full max-w-xl p-6 rounded-xl bg-white border border-stone-200 shadow-sm animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-stone-800 mb-8">Add Recurring Item</h2>

            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-600 ml-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Netflix Subscription"
                  className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600 ml-1">Amount (₹)</label>
                  <input
                    required
                    type="number"
                    placeholder="0.00"
                    className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600 ml-1">Category</label>
                  <select
                    className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="General">General</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Housing">Housing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Salary">Salary</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600 ml-1">Frequency</label>
                  <select
                    className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600 ml-1">Type</label>
                  <select
                    className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-600 ml-1">Starting From</label>
                <input
                  required
                  type="date"
                  className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-4 rounded-lg bg-white text-stone-800 font-semibold hover:bg-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-lg bg-emerald-100 text-stone-800 font-semibold hover:bg-emerald-100 shadow-sm shadow-indigo-500/25 transition-all active:scale-95 btn-primary"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Recurring
