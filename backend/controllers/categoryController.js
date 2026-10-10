export const DEFAULT_CATEGORIES = {
  expense: ["Food", "Transport", "Shopping", "Rent", "Utilities", "Entertainment", "Health", "Education", "Other"],
  income: ["Salary", "Freelance", "Business", "Investment", "Other"],
}
const validType = (type) => type === "expense" || type === "income"
export function createCategoryHandlers({ Category }) {
  return {
    list: async (req, res) => {
      const { type } = req.query
      if (!validType(type)) return res.status(400).json({ message: "Choose income or expense categories." })
      try {
        const categories = await Category.find({ user: req.user._id, type }).sort({ name: 1 }).lean()
        return res.json({ categories: categories.map(({ name }) => name) })
      } catch {
        return res.status(503).json({ message: "Saved categories could not be loaded. Please try again." })
      }
    },
    create: async (req, res) => {
      const { type, name } = req.body || {}
      const cleaned = typeof name === "string" ? name.normalize("NFKC").trim().replace(/\s+/g, " ") : ""
      if (!validType(type) || !cleaned || cleaned.length > 40 || /[\p{Cc}\p{Cf}]/u.test(cleaned)) {
        return res.status(400).json({ message: "Enter a category name of 1–40 characters and a valid transaction type." })
      }
      const normalizedName = cleaned.toLowerCase()
      const builtIn = DEFAULT_CATEGORIES[type].find(item => item.toLowerCase() === normalizedName)
      if (builtIn) return res.json({ name: builtIn })
      const filter = { user: req.user._id, type, normalizedName }
      try {
        const category = await Category.findOneAndUpdate(filter, { $setOnInsert: { ...filter, name: cleaned } }, { upsert: true, new: true, runValidators: true })
        return res.status(201).json({ name: category.name })
      } catch (err) {
        // A concurrent insertion is safe to reuse under the unique account/type/name index.
        if (err.code === 11000) {
          try {
            const category = await Category.findOne(filter)
            if (category) return res.json({ name: category.name })
          } catch { /* Return the same actionable error below. */ }
        }
        return res.status(503).json({ message: "Your category could not be saved. Please try again." })
      }
    },
  }
}
