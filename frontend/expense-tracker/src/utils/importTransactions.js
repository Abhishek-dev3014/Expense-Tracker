// Parse quoted commas, escaped quotes and newlines in bank-statement CSV exports.
export function parseStatementCsv(text) {
  const rows = []
  let row = [], cell = "", quoted = false
  const source = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
      row.push(cell.trim()); cell = ""
      if (char !== ",") {
        if (char === "\r" && source[i + 1] === "\n") i++
        if (row.some(Boolean)) rows.push(row)
        row = []
      }
    } else cell += char
  }
  if (quoted) throw new Error("A quoted CSV field is incomplete.")
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  const [headers, ...data] = rows
  if (!headers || new Set(headers).size !== headers.length || headers.some(h => !h))
    throw new Error("Use a CSV with unique, non-empty column headings.")
  if (!data.length || data.some(r => r.length !== headers.length))
    throw new Error("Each transaction must have the same columns as the heading row.")
  return { headers, data }
}

export function importTransactions(headers, rows, mapping) {
  if (rows.length > 1000) throw new Error("Import up to 1,000 transactions at a time.")
  return rows.map((row, index) => {
    const title = row[headers.indexOf(mapping.title)]?.trim()
    const raw = row[headers.indexOf(mapping.amount)]?.replace(/[,₹$£€\s]/g, "")
    const amount = Number(raw)
    const value = row[headers.indexOf(mapping.date)]
    const date = new Date(value)
    const type = mapping.type === "signed" ? (amount < 0 ? "expense" : "income") : mapping.type
    if (!title || title.length > 200 || !raw || !Number.isFinite(amount) || amount === 0 || !Number.isFinite(date.getTime()) || !["income", "expense"].includes(type))
      throw new Error(`Check the description, amount and date on CSV row ${index + 2}.`)
    // Omitting category requests backend prediction; explicit General bypassed it.
    return { title, amount: Math.abs(amount), type, date: date.toISOString() }
  })
}
