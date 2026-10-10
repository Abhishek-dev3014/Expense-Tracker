import express from "express"
import Category from "../models/Category.js"
import { protect } from "../middleware/authMiddleware.js"
import { createCategoryHandlers } from "../controllers/categoryController.js"

const router = express.Router()
const { list, create } = createCategoryHandlers({ Category })
router.use(protect)
router.get("/", list)
router.post("/", create)
export default router
