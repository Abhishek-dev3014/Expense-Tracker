export function transactionNotice(saved, type = "expense", editing = false) {
  const subject = type === "income" ? "Income" : "Expense"
  if (saved.categoryRuleSaved === false)
    return { kind: "warning", message: `${subject} saved, but the category could not be remembered. Edit this expense and try remembering it again; do not add it again.` }
  if (saved.categoryRuleSaved === true)
    return { kind: "success", message: `${subject} saved. Category remembered for this description.` }
  if (saved.categoryStatus === "remembered")
    return { kind: "success", message: `${subject} saved using your remembered category.` }
  if (saved.categoryStatus === "unavailable")
    return { kind: "warning", message: `${subject} saved. Auto-categorization is unavailable; choose a category when editing.` }
  if (saved.categoryStatus === "needs_review")
    return { kind: "warning", message: `${subject} saved. Add more detail or choose a category when editing.` }
  return { kind: "success", message: editing ? "Changes saved" : `${subject} added` }
}
