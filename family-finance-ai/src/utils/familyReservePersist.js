/** Синхрон с карточкой «Семейный резерв» на странице семьи и пополнениями целей. */
export const FAMILY_RESERVE_INITIAL_UZS = 9_900_000

const KEY = 'ff_family_reserve_balance_uzs'

export function loadFamilyReserveBalance() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) return FAMILY_RESERVE_INITIAL_UZS
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : FAMILY_RESERVE_INITIAL_UZS
  } catch {
    return FAMILY_RESERVE_INITIAL_UZS
  }
}

export function saveFamilyReserveBalance(amountUzs) {
  try {
    localStorage.setItem(KEY, String(Math.max(0, Math.round(Number(amountUzs) || 0))))
  } catch {
    /* ignore */
  }
}

/** Списание с резерва на цель. */
export function debitFamilyReserveForGoal(amountUzs) {
  const bal = loadFamilyReserveBalance()
  const a = Math.round(Number(amountUzs) || 0)
  if (a <= 0 || a > bal) return { ok: false, reason: 'insufficient' }
  saveFamilyReserveBalance(bal - a)
  return { ok: true }
}
