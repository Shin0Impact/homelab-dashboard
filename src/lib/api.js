// Shared fetch helper: attaches the bearer token automatically, and lets the
// whole app react in one place when a token goes bad (expired, revoked, or
// never existed) instead of every poller silently failing forever.
//
// Session storage: "Remember Session" actually controls something now —
// checked writes to localStorage (survives closing the browser entirely,
// paired with a 30-day token from the server), unchecked writes to
// sessionStorage (cleared the moment the tab/browser closes, paired with a
// 12-hour token). Only one copy ever exists at a time — logging in clears
// whichever storage wasn't used, so a stale token can't linger in the other
// one and cause confusing behavior later.
//
// Demo mode: when built with VITE_DEMO_MODE=true (the GitHub Pages build,
// see .github/workflows/deploy-demo.yml), there's no backend at all — every
// request here is instead answered by the in-memory mock in mockApi.js.
// Everything else in the app is completely unaware of this; it just calls
// authFetch()/apiFetch() like normal and gets back something that looks
// exactly like a real fetch() Response.
import { mockFetch } from "./mockApi"

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

const AUTH_EXPIRED_EVENT = "homelab:auth-expired"
const TOKEN_KEY = "homelab_token"
const USER_KEY = "homelab_user"
const AUTHED_KEY = "homelab_authed"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function isAuthed() {
  return localStorage.getItem(AUTHED_KEY) === "true" || sessionStorage.getItem(AUTHED_KEY) === "true"
}

export function saveSession({ token, user, remember }) {
  const store = remember ? localStorage : sessionStorage
  const clear = remember ? sessionStorage : localStorage

  if (token) store.setItem(TOKEN_KEY, token)
  if (user) store.setItem(USER_KEY, JSON.stringify(user))
  store.setItem(AUTHED_KEY, "true")

  // Make sure the other storage doesn't hold a leftover copy.
  clear.removeItem(TOKEN_KEY)
  clear.removeItem(USER_KEY)
  clear.removeItem(AUTHED_KEY)
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
    store.removeItem(AUTHED_KEY)
  }
}

export function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Drop-in replacement for fetch() that adds the Authorization header and
 * broadcasts a single global event if the server ever responds 401, so
 * App.jsx can drop back to the login screen instead of leaving the UI in a
 * broken, silently-failing state. In demo mode, routes to the in-memory
 * mock instead of the network.
 */
export async function authFetch(url, options = {}) {
  if (DEMO_MODE) {
    return mockFetch(url, options)
  }

  const headers = { ...(options.headers || {}), ...getAuthHeaders() }
  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
  }

  return res
}

/**
 * Same idea as authFetch(), for the handful of calls that happen before a
 * token exists at all (login, register, the setup-status check). No auth
 * header to attach, but still demo-aware.
 */
export async function apiFetch(url, options = {}) {
  if (DEMO_MODE) {
    return mockFetch(url, options)
  }
  return fetch(url, options)
}

export function onAuthExpired(callback) {
  window.addEventListener(AUTH_EXPIRED_EVENT, callback)
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, callback)
}
