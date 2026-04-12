const TXN_KEY = 'ff_goal_transactions_v1'
const PRESET_SAVED_KEY = 'ff_preset_goal_saved_v1'

export function getPresetGoalSaved(goalId, defaultSavedUzs) {
  try {
    const raw = localStorage.getItem(PRESET_SAVED_KEY)
    const m = raw ? JSON.parse(raw) : {}
    if (m && typeof m === 'object' && m[goalId] != null) {
      const n = Number(m[goalId])
      return Number.isFinite(n) ? Math.max(0, Math.round(n)) : defaultSavedUzs
    }
  } catch {
    /* fall through */
  }
  return defaultSavedUzs
}

export function addToPresetGoalSaved(goalId, deltaUzs, defaultSavedUzs) {
  const cur = getPresetGoalSaved(goalId, defaultSavedUzs)
  const next = Math.max(0, cur + Math.round(deltaUzs))
  let map = {}
  try {
    const raw = localStorage.getItem(PRESET_SAVED_KEY)
    map = raw && typeof JSON.parse(raw) === 'object' ? JSON.parse(raw) : {}
  } catch {
    map = {}
  }
  map[goalId] = next
  localStorage.setItem(PRESET_SAVED_KEY, JSON.stringify(map))
  return next
}

export function loadGoalTransactionsMap() {
  try {
    const raw = localStorage.getItem(TXN_KEY)
    const o = raw ? JSON.parse(raw) : {}
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

function saveGoalTransactionsMap(map) {
  try {
    localStorage.setItem(TXN_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function appendGoalTransaction(goalId, entry) {
  const all = loadGoalTransactionsMap()
  const list = Array.isArray(all[goalId]) ? all[goalId] : []
  const id = entry.id ?? `gt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  all[goalId] = [{ ...entry, id }, ...list]
  saveGoalTransactionsMap(all)
  return all[goalId]
}
