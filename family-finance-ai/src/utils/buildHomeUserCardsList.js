import { ACCOUNTS, LINKED_EXTERNAL_CARDS, PRIMARY_BANK_RECREATE } from '../mockData'
import { loadPrimaryCardId, loadRemovedRowIds } from './deletedCards'

export const HOME_OWNER_ID = 'user_1'
export const PRIMARY_ACCOUNT_ID = 'acc_tbc_main'
export const TRAILING_LIST_ACCOUNT_ID = 'acc_hamkor_current'

export function last4FromPan(pan) {
  const d = String(pan).replace(/\D/g, '')
  return d.slice(-4)
}

function buildStaticRows() {
  const primary = ACCOUNTS.find((a) => a.id === PRIMARY_ACCOUNT_ID)
  const bank = primary?.bank ?? PRIMARY_BANK_RECREATE

  const myAccounts = ACCOUNTS.filter((a) => a.userId === HOME_OWNER_ID)
  const myLinked = LINKED_EXTERNAL_CARDS.filter((c) => c.ownerUserId === HOME_OWNER_ID)

  const primaryLinked = []
  const otherLinked = []
  const accounts = []

  const accountRowFromAcc = (acc) => {
    const last4 = last4FromPan(acc.card.pan)
    const isFx = acc.currency && acc.currency !== 'UZS'
    return {
      id: acc.id,
      kind: 'account',
      bank: acc.bank,
      sheetTitle: acc.label,
      detailLine: `${last4} · ${acc.bank}`,
      balanceUzs: acc.balanceUzs ?? 0,
      foreignCurrency: isFx ? acc.currency : null,
      balanceForeign: isFx && acc.balanceForeign != null ? acc.balanceForeign : null,
      processingSystem: acc.card.processingSystem,
      pan: acc.card.pan,
      last4,
      expires: acc.card.expires,
      holderName: acc.card.holderName,
      movementsAccountId: acc.id,
      linkedMovementsCardId: null,
    }
  }

  myAccounts.forEach((acc) => {
    if (acc.type === 'deposit' || !acc.card || acc.bank !== bank) {
      return
    }
    if (acc.id === TRAILING_LIST_ACCOUNT_ID) {
      return
    }
    accounts.push(accountRowFromAcc(acc))
  })

  const trailingAcc = myAccounts.find((a) => a.id === TRAILING_LIST_ACCOUNT_ID)
  if (trailingAcc?.card && trailingAcc.type !== 'deposit' && trailingAcc.bank === bank) {
    accounts.push(accountRowFromAcc(trailingAcc))
  }

  myLinked.forEach((card) => {
    const balanceUzs = typeof card.balanceUzs === 'number' ? card.balanceUzs : 0
    const last4 = last4FromPan(card.pan)
    const label = card.userLabel?.trim() || 'Карта'
    const row = {
      id: card.id,
      kind: 'linked',
      sheetTitle: label,
      bank: card.bank,
      detailLine: `${last4} · ${card.bank}`,
      balanceUzs,
      processingSystem: card.processingSystem,
      pan: card.pan,
      last4,
      expires: card.expires,
      holderName: card.holderName,
      movementsAccountId: null,
      linkedMovementsCardId: card.id,
    }
    if (card.bank === bank) {
      primaryLinked.push(row)
    } else {
      otherLinked.push(row)
    }
  })

  return {
    primaryBank: bank,
    primaryLinkedItems: primaryLinked,
    otherLinkedBase: otherLinked,
    accountItems: accounts,
  }
}

let staticRowsCache = null
function getStaticRows() {
  if (!staticRowsCache) staticRowsCache = buildStaticRows()
  return staticRowsCache
}

function mapUserLinkedToRows(userLinkedCards, renamedLabels) {
  return userLinkedCards.map((c) => ({
    id: c.id,
    kind: 'linked',
    sheetTitle: renamedLabels[c.id] ?? c.userLabel?.trim() ?? 'Новая карта',
    bank: c.bank,
    detailLine: `${last4FromPan(c.pan)} · ${c.bank}`,
    balanceUzs: c.balanceUzs,
    processingSystem: c.processingSystem,
    pan: c.pan,
    last4: last4FromPan(c.pan),
    expires: c.expires,
    holderName: c.holderName,
    movementsAccountId: null,
    linkedMovementsCardId: c.id,
  }))
}

function applyCardBalanceDelta(c, cardBalanceDeltas) {
  if (!c) return c
  const d = cardBalanceDeltas[c.id]
  if (!d) return c
  if (c.foreignCurrency) {
    return { ...c, balanceForeign: (c.balanceForeign ?? 0) + d }
  }
  return { ...c, balanceUzs: (c.balanceUzs ?? 0) + d }
}

/**
 * Тот же список карт/счетов, что на главной: порядок, скрытые строки, дельты баланса.
 */
export function computeAllUserCards({
  cardBalanceDeltas = {},
  removedRowIds: removedRowIdsArg,
  primaryCardId: primaryCardIdArg,
  renamedLabels = {},
  userLinkedCards = [],
}) {
  const { primaryLinkedItems, otherLinkedBase, accountItems } = getStaticRows()
  const removedRowIds = removedRowIdsArg ?? loadRemovedRowIds()
  const primaryCardId = primaryCardIdArg !== undefined ? primaryCardIdArg : loadPrimaryCardId()

  const otherLinkedItems = [...otherLinkedBase, ...mapUserLinkedToRows(userLinkedCards, renamedLabels)]

  const skip = (id) => removedRowIds.includes(id)
  const visibleOrderedIds = [
    ...primaryLinkedItems.filter((i) => !skip(i.id)).map((i) => i.id),
    ...otherLinkedItems.filter((i) => !skip(i.id)).map((i) => i.id),
    ...accountItems.filter((i) => !skip(i.id)).map((i) => i.id),
  ]

  let resolvedPrimaryId = null
  if (visibleOrderedIds.length > 0) {
    if (primaryCardId != null && visibleOrderedIds.includes(primaryCardId)) {
      resolvedPrimaryId = primaryCardId
    } else {
      resolvedPrimaryId = visibleOrderedIds[0]
    }
  }

  const sortBlock = (items) => {
    const mapped = items
      .filter((item) => !removedRowIds.includes(item.id))
      .map((item) => ({
        ...item,
        sheetTitle: renamedLabels[item.id] ?? item.sheetTitle,
      }))
    if (resolvedPrimaryId) {
      const idx = mapped.findIndex((i) => i.id === resolvedPrimaryId)
      if (idx > 0) {
        const [el] = mapped.splice(idx, 1)
        mapped.unshift(el)
      }
    }
    return mapped
  }

  const sortedPrimaryLinked = sortBlock(primaryLinkedItems)
  const sortedOtherLinked = sortBlock(otherLinkedItems)
  const sortedAccountItems = sortBlock(accountItems)

  return [
    ...sortedPrimaryLinked.map((c) => applyCardBalanceDelta(c, cardBalanceDeltas)),
    ...sortedOtherLinked.map((c) => applyCardBalanceDelta(c, cardBalanceDeltas)),
    ...sortedAccountItems.map((c) => applyCardBalanceDelta(c, cardBalanceDeltas)),
  ]
}
