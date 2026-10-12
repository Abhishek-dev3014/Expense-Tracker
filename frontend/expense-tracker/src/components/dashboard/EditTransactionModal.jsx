import TransactionModal from "./TransactionModal"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import { updateTransaction } from "../../utils/transactionRequest"

export default function EditTransactionModal({ transaction, onClose }) {
  const { token } = useAuth()
  const save = async (values) => {
    await updateTransaction(
      `${BASE_URL}/api/transactions/${transaction._id}`,
      values,
      token || localStorage.getItem("token"),
    )
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
