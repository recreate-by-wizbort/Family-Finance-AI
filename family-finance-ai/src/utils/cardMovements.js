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

/** Базовые движения + операции по вкладам (сохраняются локально). */
export function getMergedRawMovementsForCard(card, linkedByCardId = {}) {
  if (!card) return []
  const base = getRawMovementsForCard(card)
  const extra = linkedByCardId[card.id] ?? []
  return [...extra, ...base]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 120)
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

/** Та же выборка, что при поиске по всем картам в деталях: mock + локальные движения, общий таймлайн. */
export function getAggregatedMovementRowsForAllCards(allUserCards, linkedMovementsByCardId, limit = null) {
  const rows = []
  for (const c of allUserCards) {
    const raw = getMergedRawMovementsForCard(c, linkedMovementsByCardId)
    for (const m of raw) {
      rows.push({ card: c, movement: m })
    }
  }
  rows.sort((a, b) => String(b.movement.timestamp).localeCompare(String(a.movement.timestamp)))
  if (typeof limit === 'number' && limit > 0) {
    return rows.slice(0, limit)
  }
  return rows
}

const rowKey = (row) => `${row.card.id}|${row.movement.id}`

/**
 * Превью на главном экране: сначала по одной свежей операции с каждой карты/счёта,
 * затем добор по общему хронологическому списку — чтобы были видны разные источники.
 */
export function pickDiverseHistoryPreviewRows(sortedRows, maxCount = 3) {
  if (!sortedRows?.length) return []
  const picked = []
  const seenKeys = new Set()
  const cardIdsUsed = new Set()
  for (const row of sortedRows) {
    if (picked.length >= maxCount) break
    const k = rowKey(row)
    if (cardIdsUsed.has(row.card.id)) continue
    picked.push(row)
    seenKeys.add(k)
    cardIdsUsed.add(row.card.id)
  }
  for (const row of sortedRows) {
    if (picked.length >= maxCount) break
    const k = rowKey(row)
    if (seenKeys.has(k)) continue
    picked.push(row)
    seenKeys.add(k)
  }
  return picked
}
