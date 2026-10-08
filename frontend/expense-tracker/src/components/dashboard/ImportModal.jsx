// src/components/dashboard/ImportModal.jsx
import { useState } from "react"
import axios from "axios"
import { BASE_URL } from "../../utils/apiPaths"
import { Upload, X, Check, AlertCircle, FileText, ArrowRight } from "lucide-react"

const ImportModal = ({ isOpen, onClose, onRefresh }) => {
  const [file, setFile] = useState(null)
  const [data, setData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({
    date: "",
    title: "",
    amount: "",
    type: "expense" // Default type
  })
  const [step, setStep] = useState(1) // 1: Upload, 2: Map, 3: Review/Categorize
  const [importing, setImporting] = useState(false)

  if (!isOpen) return null

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFile(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const rows = text.split("\n").map(row => row.split(",").map(cell => cell.trim()))
      const headers = rows[0]
      const values = rows.slice(1).filter(row => row.length === headers.length && row.some(cell => cell !== ""))

      setHeaders(headers)
      setData(values)
      setStep(2)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const token = localStorage.getItem("token")

      const transactions = data.map(row => {
        const amount = parseFloat(row[headers.indexOf(mapping.amount)])
        return {
          title: row[headers.indexOf(mapping.title)],
          amount: Math.abs(amount),
          type: amount < 0 ? "expense" : "income",
          date: new Date(row[headers.indexOf(mapping.date)]),
          category: "General" // We can add AI categorization here later or on frontend before send
        }
      })

      // Optional: AI Categorization here before sending
      // For now, let's just send the batch
      await axios.post(`${BASE_URL}/api/transactions/batch`, { transactions }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      onRefresh()
      onClose()
      setStep(1)
    } catch (err) {
      console.error(err)
      alert("Import failed. Please check the format.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl p-6 rounded-xl bg-white border border-stone-200 shadow-sm animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-stone-600 hover:text-stone-800 transition-colors">
          <X size={24} />
        </button>

        <h2 className="text-3xl font-bold text-stone-800 mb-2">Import Bank Statement</h2>
        <p className="text-stone-600 mb-8">Rapidly upload your financial history via CSV.</p>

        {step === 1 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-xl p-12 hover:border-emerald-200 transition-all group bg-white">
            <div className="w-20 h-20 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Upload size={40} />
            </div>
            <label className="cursor-pointer">
              <span className="px-8 py-3 rounded-lg bg-emerald-100 hover:bg-emerald-100 text-stone-800 font-bold transition-all shadow-sm shadow-indigo-500/20 active:scale-95">
                Choose CSV File
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <p className="mt-4 text-sm text-stone-500">Only .csv files supported at this moment.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-white border border-stone-200 flex items-center gap-4">
              <FileText className="text-emerald-800" />
              <span className="text-stone-800 font-medium">{file?.name}</span>
              <span className="text-stone-500 text-sm ml-auto">Detected {data.length} rows</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {['title', 'amount', 'date'].map(field => (
                <div key={field} className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide ml-1">{field}</label>
                  <select
                    className="w-full px-6 py-4 rounded-lg bg-white border border-stone-200 text-stone-800 focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    value={mapping[field]}
                    onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  >
                    <option value="">Select Column</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={!mapping.title || !mapping.amount || !mapping.date || importing}
              className="w-full py-5 rounded-lg bg-emerald-100 hover:bg-emerald-100 text-stone-800 font-semibold uppercase tracking-wide text-sm transition-all shadow-sm shadow-emerald-500/20 active:scale-95 disabled:opacity-40"
            >
              {importing ? "Importing Data..." : "Finalize Import"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportModal
