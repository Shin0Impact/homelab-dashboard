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
 * broken, silently-failing state.
 */
export async function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), ...getAuthHeaders() }
  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
  }

  return res
}

export function onAuthExpired(callback) {
  window.addEventListener(AUTH_EXPIRED_EVENT, callback)
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, callback)
}
