import TransactionModal from "./TransactionModal"
import { BASE_URL } from "../../utils/apiPaths"
import { useAuth } from "../../context/AuthContext"
import { updateTransaction } from "../../utils/transactionRequest"
import { transactionNotice } from "../../utils/transactionNotice"
import toast from "react-hot-toast"

export default function EditTransactionModal({ transaction, onClose }) {
  const { token } = useAuth()
  const save = async (values) => {
    const saved = await updateTransaction(
      `${BASE_URL}/api/transactions/${transaction._id}`,
      values,
      token || localStorage.getItem("token"),
    )
    const notice = transactionNotice(saved, transaction.type, true)
    if (notice.kind === "success") toast.success(notice.message)
    else toast(notice.message, { duration: 8000 })
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
