import { loadCardBalanceDeltas, saveCardBalanceDeltas } from './cardBalanceDeltas'
import { loadUserAccounts, saveUserAccounts, withdrawFromAccount } from './accounts'
import {
  appendDepositCardMovement,
  buildDepositOutMovement,
  loadDepositCardMovements,
} from './depositCardMovements'

/** Доступно в UZS для списания на семейный резерв (валютные счета — 0). */
export function getSpendableUzsForReserve(row) {
  if (!row || row.foreignCurrency) return 0
  return Math.max(0, Math.round((row.balanceUzs ?? 0) * 100) / 100)
}

/**
 * Списание с той же «карты», что на главной: дельты в localStorage или счёт uacc_*.
 */
export function debitCardForFamilyReserve(row, amountUzs) {
  if (!row || amountUzs <= 0 || row.foreignCurrency) {
    return { ok: false, reason: 'invalid' }
  }
  const spendable = getSpendableUzsForReserve(row)
  if (amountUzs > spendable) return { ok: false, reason: 'insufficient' }

  if (row.isUserOpenedAccount) {
    const list = loadUserAccounts()
    const acc = list.find((a) => a.id === row.id)
    if (!acc || acc.currency !== 'UZS') return { ok: false, reason: 'invalid' }
    if ((acc.amount ?? 0) < amountUzs) return { ok: false, reason: 'insufficient' }
    const next = list.map((a) =>
      a.id === row.id ? withdrawFromAccount(a, amountUzs, 'family-reserve') : a,
    )
    saveUserAccounts(next)
    return { ok: true }
  }

  const deltas = loadCardBalanceDeltas()
  const nextDeltas = { ...deltas, [row.id]: (deltas[row.id] ?? 0) - amountUzs }
  saveCardBalanceDeltas(nextDeltas)

  const movements = loadDepositCardMovements()
  const mov = buildDepositOutMovement(
    row,
    amountUzs,
    'Пополнение семейного резерва',
    'Семейный резерв',
  )
  appendDepositCardMovement(movements, row.id, mov)

  return { ok: true }
}

/** Списание с карты на пополнение финансовой цели (дельты / счёт, движение в истории карты). */
export function debitCardForGoalTopup(row, amountUzs, goalTitle) {
  if (!row || amountUzs <= 0 || row.foreignCurrency) {
    return { ok: false, reason: 'invalid' }
  }
  const spendable = getSpendableUzsForReserve(row)
  if (amountUzs > spendable) return { ok: false, reason: 'insufficient' }

  if (row.isUserOpenedAccount) {
    const list = loadUserAccounts()
    const acc = list.find((a) => a.id === row.id)
    if (!acc || acc.currency !== 'UZS') return { ok: false, reason: 'invalid' }
    if ((acc.amount ?? 0) < amountUzs) return { ok: false, reason: 'insufficient' }
    const next = list.map((a) =>
      a.id === row.id ? withdrawFromAccount(a, amountUzs, `goal:${goalTitle}`) : a,
    )
    saveUserAccounts(next)
    return { ok: true }
  }

  const deltas = loadCardBalanceDeltas()
  const nextDeltas = { ...deltas, [row.id]: (deltas[row.id] ?? 0) - amountUzs }
  saveCardBalanceDeltas(nextDeltas)

  const movements = loadDepositCardMovements()
  const mov = buildDepositOutMovement(
    row,
    amountUzs,
    `Пополнение цели «${goalTitle}»`,
    'Финансовая цель',
  )
  appendDepositCardMovement(movements, row.id, mov)

  return { ok: true }
}
