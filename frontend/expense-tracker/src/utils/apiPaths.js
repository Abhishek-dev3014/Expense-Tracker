// src/utils/apiPaths.js

// Production uses the same-origin /api proxy in vercel.json.
// Local development can still point to a different API via VITE_API_URL.
export const BASE_URL = (import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5001")).replace(/\/+$/, "")

// Auth APIs
export const AUTH_API = {
  SIGNUP: `${BASE_URL}/api/auth/signup`,
  LOGIN: `${BASE_URL}/api/auth/login`,
}

// Dashboard APIs
export const DASHBOARD_API = {
  SUMMARY: `${BASE_URL}/api/dashboard`,
}
