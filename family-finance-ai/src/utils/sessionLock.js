const SESSION_STORAGE_KEY = 'family-finance-unlock-v1'
const SESSION_TTL_MS = 30 * 60 * 1000

function nowMs() {
  return Date.now()
}

function readRawSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function isSessionUnlocked() {
  if (typeof window === 'undefined') {
    return false
  }

  const session = readRawSession()
  if (!session) {
    return false
  }

  const isValid = session.expiresAt > nowMs()
  if (!isValid) {
    clearSessionUnlock()
    return false
  }

  return true
}

export function unlockSession() {
  if (typeof window === 'undefined') {
    return
  }

  const expiresAt = nowMs() + SESSION_TTL_MS
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ expiresAt }))
}

export function clearSessionUnlock() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function getSanitizedReturnPath(rawReturnTo) {
  if (!rawReturnTo || typeof rawReturnTo !== 'string') {
    return '/home'
  }

  if (!rawReturnTo.startsWith('/')) {
    return '/home'
  }

  if (rawReturnTo.startsWith('//')) {
    return '/home'
  }

  if (rawReturnTo.startsWith('/preview') || rawReturnTo.startsWith('/notifications') || rawReturnTo === '/') {
    return '/home'
  }

  return rawReturnTo
}

export { SESSION_TTL_MS }
