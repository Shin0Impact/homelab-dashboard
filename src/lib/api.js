// Shared fetch helper: attaches the bearer token automatically, and lets the
// whole app react in one place when a token goes bad (expired, revoked, or
// never existed) instead of every poller silently failing forever.

const AUTH_EXPIRED_EVENT = "homelab:auth-expired"

export function getToken() {
  return localStorage.getItem("homelab_token")
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
