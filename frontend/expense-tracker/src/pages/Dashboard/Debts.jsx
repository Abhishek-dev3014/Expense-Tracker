// src/pages/Dashboard/Debts.jsx
import { useEffect, useState } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import { Users, HandMetal, CheckCircle2, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react"

const Debts = () => {
  const [debts, setDebts] = useState([])
  const [ious, setIous] = useState([])
  const [activeTab, setActiveTab] = useState("local") // "local" or "social"
  const [loading, setLoading] = useState(true)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await axios.get(`${BASE_URL}/api/splits/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDebts(res.data.debts)
      setIous(res.data.ious)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const handleSettle = async (txId, person) => {
    try {
      const token = localStorage.getItem("token")
      await axios.post(`${BASE_URL}/api/splits/settle/${txId}/${person}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSummary()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRespond = async (id, status) => {
    try {
      const token = localStorage.getItem("token")
      await axios.patch(`${BASE_URL}/api/splits/respond-request/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSummary()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSettleSocial = async (id) => {
    try {
      const token = localStorage.getItem("token")
      await axios.patch(`${BASE_URL}/api/splits/settle-social/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSummary()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="panel empty-state" role="status">Loading shared expenses…</div>

  const totalOwedToMe = debts.reduce((acc, curr) => acc + curr.amount, 0)
  const totalIOwe = ious.reduce((acc, curr) => acc + (curr.status !== "settled" ? curr.amount : 0), 0)

  return (
    <div className="feature-page max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">


        <div className="flex flex-wrap gap-4">
          <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-6 shadow-sm shadow-emerald-500/5">
             <div className="w-12 h-12 rounded-lg bg-emerald-100 text-stone-800 flex items-center justify-center">
               <HandMetal size={24} />
             </div>
             <div>
               <p className="text-[8px] font-semibold uppercase tracking-wide text-emerald-800/60 mb-1">Owed to You</p>
               <p className="text-2xl font-semibold text-stone-800">₹{totalOwedToMe.toLocaleString()}</p>
             </div>
          </div>

          <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-6 shadow-sm shadow-rose-500/5">
             <div className="w-12 h-12 rounded-lg bg-rose-500 text-stone-800 flex items-center justify-center">
               <ArrowUpRight size={24} />
             </div>
             <div>
               <p className="text-[8px] font-semibold uppercase tracking-wide text-rose-700/60 mb-1">You Owe</p>
               <p className="text-2xl font-semibold text-stone-800">₹{totalIOwe.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          {/* Tabs */}
          <div className="flex items-center gap-4 p-1.5 rounded-xl bg-white border border-stone-200 w-fit">
            <button
              onClick={() => setActiveTab("local")}
              className={`px-6 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "local" ? 'bg-emerald-100 text-stone-800 shadow-sm shadow-emerald-500/20' : 'text-stone-600 hover:text-stone-800'}`}
            >
              LOCALLY SPLIT
            </button>
            <button
              onClick={() => setActiveTab("social")}
              className={`px-6 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "social" ? 'bg-emerald-100 text-stone-800 shadow-sm shadow-indigo-500/20' : 'text-stone-600 hover:text-stone-800'}`}
            >
              SOCIAL REQUESTS
              {ious.filter(i => i.status === "pending").length > 0 && (
                <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
              )}
            </button>
          </div>

          {activeTab === "local" ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <ArrowDownLeft className="text-emerald-800" />
                 <h2 className="text-xl font-bold text-stone-800 tracking-tight">Who Owes Me</h2>
              </div>

              <div className="space-y-4">
                {debts.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center">
                     <p className="text-stone-600">All settled up locally!</p>
                  </div>
                ) : (
                  debts.map((debt, index) => (
                    <div key={index} className="group p-6 rounded-xl bg-white border border-stone-200 hover:border-emerald-200 transition-all duration-500 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-semibold text-xl border border-emerald-200">
                            {debt.person[0]}
                         </div>
                         <div>
                           <p className="text-stone-800 font-bold text-lg">{debt.person}</p>
                           <p className="text-xs text-stone-500 font-medium tracking-wide">For "{debt.title}"</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <p className="text-xl font-semibold text-emerald-800">₹{debt.amount.toLocaleString()}</p>
                        <button
                          onClick={() => handleSettle(debt.transactionId, debt.person)}
                          className="px-6 py-3 rounded-xl bg-emerald-100 text-stone-800 text-[10px] font-semibold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <ArrowUpRight className="text-emerald-800" />
                 <h2 className="text-xl font-bold text-stone-800 tracking-tight">Pending Approval / Payment</h2>
              </div>

              <div className="space-y-4">
                {ious.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center">
                     <p className="text-stone-600">No incoming social requests.</p>
                  </div>
                ) : (
                  ious.map((iou, index) => (
                    <div key={index} className="group p-6 rounded-xl bg-white border border-stone-200 hover:border-emerald-200 transition-all duration-500 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-semibold text-xl border border-emerald-200">
                            {iou.person[0].toUpperCase()}
                         </div>
                         <div>
                           <p className="text-stone-800 font-bold text-lg">{iou.person}</p>
                           <p className="text-xs text-stone-500 font-medium tracking-wide">Sent you a split for "{iou.title}"</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="text-xl font-semibold text-rose-700 mr-4">₹{iou.amount.toLocaleString()}</p>

                        {iou.status === "pending" && (
                          <div className="flex gap-2">
                             <button
                               onClick={() => handleRespond(iou._id, "accepted")}
                               className="px-4 py-2 rounded-xl bg-emerald-100 text-stone-800 text-[9px] font-semibold uppercase tracking-wide transition-all"
                             >
                               Accept
                             </button>
                             <button
                               onClick={() => handleRespond(iou._id, "rejected")}
                               className="px-4 py-2 rounded-xl bg-white text-stone-600 text-[9px] font-semibold uppercase tracking-wide hover:text-stone-800 transition-all"
                             >
                               Reject
                             </button>
                          </div>
                        )}

                        {iou.status === "accepted" && (
                          <button
                            onClick={() => handleSettleSocial(iou._id)}
                            className="px-6 py-2 rounded-xl bg-emerald-100 text-stone-800 text-[9px] font-semibold uppercase tracking-wide transition-all shadow-sm shadow-emerald-500/20"
                          >
                            Mark Paid
                          </button>
                        )}

                        {iou.status === "settled" && (
                          <span className="px-4 py-2 rounded-xl bg-white text-stone-500 text-[9px] font-semibold uppercase tracking-wide">
                            Settled
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
           <div className="sticky top-8 p-6 rounded-xl bg-emerald-100 overflow-hidden shadow-sm shadow-indigo-500/20 relative group">
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white rounded-full hidden group-hover:scale-125 transition-transform duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 rounded-lg bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                  <HandMetal size={32} />
                </div>
                <h3 className="text-3xl font-semibold text-stone-800 leading-tight">Industry Standard<br/>Collaboration.</h3>
                <p className="text-emerald-800 font-medium opacity-80">
                  Switch to <b>Social Requests</b> to send real-time split asks to other users. No more manual reminders.
                </p>
                <div className="pt-4 flex items-center gap-2 text-stone-800 text-xs font-bold uppercase tracking-wide">
                   <CheckCircle2 size={16} /> Cross-User Sync
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default Debts
