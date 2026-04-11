const STORAGE_KEY = 'family_finance_deleted_cards'
const REMOVED_ROW_IDS_KEY = 'family_finance_removed_payment_rows'
const PRIMARY_CARD_ID_KEY = 'family_finance_primary_card_id'

export function loadRemovedRowIds() {
  try {
    const raw = localStorage.getItem(REMOVED_ROW_IDS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function persistRemovedRowIds(ids) {
  try {
    localStorage.setItem(REMOVED_ROW_IDS_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export function loadPrimaryCardId() {
  try {
    const v = localStorage.getItem(PRIMARY_CARD_ID_KEY)
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function persistPrimaryCardId(id) {
  try {
    if (id == null) localStorage.removeItem(PRIMARY_CARD_ID_KEY)
    else localStorage.setItem(PRIMARY_CARD_ID_KEY, id)
  } catch {
    /* ignore */
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota exceeded — silent */
  }
}

export function saveDeletedCard(card) {
  if (!card?.pan) return
  const pan = String(card.pan).replace(/\D/g, '')
  const store = readStore()
  store[pan] = {
    ...card,
    deletedAt: Date.now(),
  }
  writeStore(store)
}

export function findDeletedCardByPan(pan) {
  const d = String(pan).replace(/\D/g, '')
  if (d.length < 16) return null
  const store = readStore()
  return store[d] ?? null
}

export function removeDeletedCard(pan) {
  const d = String(pan).replace(/\D/g, '')
  const store = readStore()
  delete store[d]
  writeStore(store)
}
