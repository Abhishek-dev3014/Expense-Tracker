// src/utils/apiPaths.js

// Spring Boot API origin; keep the same port and API contract in development.
export const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "")

// Auth APIs
export const AUTH_API = {
  SIGNUP: `${BASE_URL}/api/auth/signup`,
  LOGIN: `${BASE_URL}/api/auth/login`,
}

// Dashboard APIs
export const DASHBOARD_API = {
  SUMMARY: `${BASE_URL}/api/dashboard`,
}
