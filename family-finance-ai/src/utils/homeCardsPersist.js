const LINKED_KEY = 'family-finance-user-linked-cards-v1'
const RENAME_KEY = 'family-finance-card-renames-v1'

export function loadUserLinkedCards() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LINKED_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function saveUserLinkedCards(cards) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LINKED_KEY, JSON.stringify(cards))
  } catch {
    /* ignore */
  }
}

export function loadCardRenames() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RENAME_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function saveCardRenames(map) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RENAME_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}
