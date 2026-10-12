import TransactionModal from "./TransactionModal"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"

export default function EditTransactionModal({ transaction, onClose }) {
  const { token } = useAuth()
  const save = async (values) => {
    const response = await fetch(`${BASE_URL}/api/transactions/${transaction._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || localStorage.getItem("token")}`,
      },
      body: JSON.stringify(values),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok)
      throw new Error(data.message || "Could not save this transaction. Please try again.")
    onClose()
    window.dispatchEvent(new Event("transactions-updated"))
  }
  return (
    <TransactionModal
      type={transaction.type}
      transaction={transaction}
      onClose={onClose}
      onSubmit={save}
    />
  )
}
