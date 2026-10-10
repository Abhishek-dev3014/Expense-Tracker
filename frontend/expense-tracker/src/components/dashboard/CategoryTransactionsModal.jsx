import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import TransactionsTable from "./TransactionsTable"
import { expensePage, formatCurrency } from "../../utils/finance"

export default function CategoryTransactionsModal({ category, month, onClose }) {
  const dialogRef = useRef(null)
  const [page, setPage] = useState(1)
  const transactions = [...category.transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  )
  const activity = expensePage(transactions, page, 10)
  const close = () => {
    dialogRef.current.close()
    onClose()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = "hidden"
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="category-transactions-dialog"
      aria-label={`${category.name} transactions`}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom
          ) close()
        }
      }}
    >
      <TransactionsTable
        expensesOnly
        title={`${category.name} transactions`}
        subtitle={`${month} · ${formatCurrency(category.value)} total · ${transactions.length} transactions`}
        headingAction={
          <button className="icon-button" aria-label="Close category transactions" onClick={close} autoFocus>
            <X size={18} />
          </button>
        }
        transactions={activity.transactions}
        page={activity.currentPage}
        totalPages={activity.totalPages}
        onPrev={() => setPage(activity.currentPage - 1)}
        onNext={() => setPage(activity.currentPage + 1)}
      />
    </dialog>
  )
}
