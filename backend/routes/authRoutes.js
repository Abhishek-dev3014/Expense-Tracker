import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { protect } from '../middleware/authMiddleware.js'
import { createAuthHandlers } from '../controllers/authController.js'

const router = express.Router()

const { signup, login } = createAuthHandlers({ User, bcrypt, jwt })

router.post('/signup', signup)
router.post('/login', login)

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    // Ensure the field exists in the response
    const userObj = user.toObject()
    if (userObj.hasSeenTutorial === undefined) {
      userObj.hasSeenTutorial = false
    }
    
    res.json(userObj)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/complete-tutorial', protect, async (req, res) => {
  try {
    const userId = req.user._id
    console.log(`Tutorial completed for user: ${userId}`)
    const user = await User.findByIdAndUpdate(
      userId,
      { hasSeenTutorial: true },
      { new: true }
    ).select('-password')
    
    if (!user) {
      console.log('User not found for tutorial completion update')
      return res.status(404).json({ message: 'User not found' })
    }

    console.log(`Tutorial update saved for ${user.email}: hasSeenTutorial=${user.hasSeenTutorial}`)
    res.json(user)
  } catch (err) {
    console.error('Tutorial completion error:', err)
    res.status(500).json({ message: err.message })
  }
})

export default router
