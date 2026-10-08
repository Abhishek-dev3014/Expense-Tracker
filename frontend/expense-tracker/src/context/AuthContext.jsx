import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"
import { BASE_URL } from "../utils/apiPaths"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null)
        return
      }
      try {
        const res = await axios.get(`${BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(res.data)
      } catch (err) {
        console.error("Fetch user error:", err)
        if (err.response?.status === 401) {
          localStorage.removeItem("token")
          setToken(null)
          setUser(null)
        }
      }
    }
    fetchUser()
  }, [token])

  const login = (newToken) => {
    localStorage.setItem("token", newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  const completeTutorial = async () => {
    if (!token || !user) return

    // Optimistic and Local Storage update
    localStorage.setItem(`tutorial_seen_${user._id}`, "true")
    const prevUser = user
    setUser({ ...user, hasSeenTutorial: true })

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/complete-tutorial`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(res.data)
    } catch (err) {
      console.error("Complete tutorial error:", err)
      // Rollback is safe because the localStorage will still be checked in components as a secondary filter
      setUser(prevUser)
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, completeTutorial, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Auth state and its consumer hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
