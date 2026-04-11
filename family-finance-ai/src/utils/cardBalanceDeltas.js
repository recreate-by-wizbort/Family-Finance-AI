const KEY = 'family-finance-card-balance-deltas-v1'

export function loadCardBalanceDeltas() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function saveCardBalanceDeltas(deltas) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(deltas))
  } catch {
    /* ignore */
  }
}
