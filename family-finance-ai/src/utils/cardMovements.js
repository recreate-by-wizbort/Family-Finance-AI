import {
  FOREIGN_ACCOUNT_MOVEMENTS,
  STANDALONE_CARD_MOVEMENTS,
  TRANSACTIONS,
} from '../mockData'

export function getRawMovementsForCard(card) {
  if (!card) return []
  let raw = []
  if (card.foreignCurrency && FOREIGN_ACCOUNT_MOVEMENTS[card.id]) {
    raw = FOREIGN_ACCOUNT_MOVEMENTS[card.id] ?? []
  } else if (card.movementsAccountId) {
    raw = TRANSACTIONS.filter((t) => t.accountId === card.movementsAccountId)
  } else if (card.linkedMovementsCardId) {
    raw = STANDALONE_CARD_MOVEMENTS[card.linkedMovementsCardId] ?? []
  }
  return raw
    .slice()
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 100)
}

export function withBalanceAfter(card, movements) {
  const balance = card.foreignCurrency ? (card.balanceForeign ?? 0) : (card.balanceUzs ?? 0)
  let running = balance
  return movements.map((m) => {
    const row = { ...m, balanceAfter: running }
    const amt = card.foreignCurrency ? (m.amountForeign ?? m.amountUzs ?? 0) : (m.amountUzs ?? 0)
    if (m.direction === 'in') {
      running -= amt
    } else {
      running += amt
    }
    return row
  })
}
