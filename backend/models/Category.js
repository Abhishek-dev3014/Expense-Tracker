import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  name: { type: String, required: true, maxlength: 40 },
  normalizedName: { type: String, required: true },
}, { timestamps: true })

categorySchema.index({ user: 1, type: 1, normalizedName: 1 }, { unique: true })
export default mongoose.model("Category", categorySchema)
