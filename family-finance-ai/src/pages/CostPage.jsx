import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav.jsx'
import SubpageCloseButton, { SUBPAGE_CLOSE_BUTTON_CLASS } from '../components/SubpageCloseButton.jsx'
import AppTopBar from '../components/AppTopBar.jsx'
import MovementDetailSheet from '../components/MovementDetailSheet.jsx'
import UzsAmount from '../components/UzsAmount.jsx'
import {
  ACCOUNTS,
  CATEGORIES,
  FAMILY_MEMBERS,
  LINKED_EXTERNAL_CARDS,
  PRIMARY_BANK_RECREATE,
  TRANSACTIONS,
} from '../mockData.js'
import { last4FromPan } from '../utils/buildHomeUserCardsList.js'
import { getMergedRawMovementsForCard, withBalanceAfter } from '../utils/cardMovements.js'
import { loadDepositCardMovements } from '../utils/depositCardMovements.js'
import { getPaymentCardsTotalUzs } from '../utils.js'
import {
  getIsoWeekStartDate,
  getPeriodLabel,
  groupTransactionsByPeriod,
  PERIOD_FILTER_OPTIONS,
} from '../utils/periodGrouping.js'
import { isMobileDevice } from '../utils/isMobileDevice.js'
import { isSessionUnlocked } from '../utils/sessionLock.js'

function getPeriodEndDate(periodKey, periodMode) {
  if (periodMode === 'year') {
    return new Date(Number(periodKey), 11, 31, 23, 59, 59, 999)
  }
  if (periodMode === 'week') {
    const [yearPart, weekPartRaw] = periodKey.split('-W')
    const start = getIsoWeekStartDate(Number(yearPart), Number(weekPartRaw))
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }
  const [year, month] = periodKey.split('-').map(Number)
  return new Date(year, month, 0, 23, 59, 59, 999)
}

function computeHistoricalBalance(currentBalance, periodEnd, allUserTransactions) {
  const now = new Date()
  if (periodEnd >= now) return currentBalance
  const netInflowAfter = allUserTransactions.reduce((sum, tx) => {
    if (new Date(tx.timestamp) <= periodEnd) return sum
    const amount = Math.abs(Number(tx.amountUzs) || 0)
    if (tx.direction === 'in') return sum + amount
    if (tx.direction === 'out') return sum - amount
    return sum
  }, 0)
  return Math.max(0, currentBalance - netInflowAfter)
}

const HISTORY_SHEET_ANIM_MS = 320
const HISTORY_SHEET_SWIPE_CLOSE_PX = 100

function ruOperationsCountLabel(n) {
  const v = Math.abs(Number(n)) % 100
  const v1 = v % 10
  if (v > 10 && v < 20) return `${n} операций`
  if (v1 === 1) return `${n} операция`
  if (v1 >= 2 && v1 <= 4) return `${n} операции`
  return `${n} операций`
}

function roundPercent(value) {
  return Math.round(value * 10) / 10
}

const FILTER_DROPDOWN_ANIM_MS = 200

function pointOnCircle(cx, cy, radius, angleDeg) {
  const radians = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  }
}

function toRingAngle(percent, isClockwise = true) {
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const angle = (clampedPercent / 100) * 360

  if (isClockwise) {
    return angle
  }

  return (360 - angle) % 360
}

function describeArcPath(cx, cy, radius, startAngle, endAngle, isClockwise = true) {
  const start = pointOnCircle(cx, cy, radius, startAngle)
  const end = pointOnCircle(cx, cy, radius, endAngle)
  const clockwiseSweep = ((endAngle - startAngle) % 360 + 360) % 360
  const sweep = isClockwise ? clockwiseSweep : (360 - clockwiseSweep) % 360
  const normalizedSweep = sweep === 0 ? 360 : sweep
  const largeArcFlag = normalizedSweep > 180 ? 1 : 0
  const sweepFlag = isClockwise ? 1 : 0

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`
}

function describeFullRingPath(cx, cy, radius, startAngleDeg, isClockwise) {
  const midDeg = (startAngleDeg + 180) % 360
  const pStart = pointOnCircle(cx, cy, radius, startAngleDeg)
  const pMid = pointOnCircle(cx, cy, radius, midDeg)
  const sweepFlag = isClockwise ? 1 : 0
  return `M ${pStart.x} ${pStart.y} A ${radius} ${radius} 0 1 ${sweepFlag} ${pMid.x} ${pMid.y} A ${radius} ${radius} 0 1 ${sweepFlag} ${pStart.x} ${pStart.y}`
}

const CATEGORY_ICON_MAP = {
  card_balance: 'credit_card',
  groceries: 'shopping_cart',
  transport: 'directions_bus',
  restaurants: 'lunch_dining',
  subscriptions: 'subscriptions',
  entertainment: 'movie',
  clothes: 'checkroom',
  shopping: 'shopping_bag',
  health: 'favorite',
  car: 'directions_car',
  internal: 'swap_horiz',
  family: 'groups',
  transfer: 'send_money',
  transfer_external: 'credit_card',
  goal_topup: 'savings',
  deposit: 'account_balance',
  deposit_account_fill: 'savings',
  deposit_account_payout: 'account_balance_wallet',
  currency_purchase: 'currency_exchange',
  investments: 'trending_up',
  /** Микрозайм: «проценты» / краткосрочный заём (Material Symbols). */
  microloan: 'percent',
  income: 'trending_up',
  other: 'more_horiz',
}

const CATEGORY_RING_COLOR_OVERRIDES = {
  card_balance: '#4cd6fb',
  restaurants: '#ff8a1f',
  transport: '#3b82f6',
  entertainment: '#f5c51f',
}

const MAIN_RING_RADIUS = 99
const MAIN_RING_STROKE_WIDTH = 34
const ICON_GLYPH_SIZE = Math.round(MAIN_RING_STROKE_WIDTH * 0.6)
/** Единый размер кружка с иконкой на кольце (как у линии / stroke). */
const ICON_BADGE_DIAMETER = MAIN_RING_STROKE_WIDTH
const ICON_BADGE_GLYPH = Math.min(ICON_GLYPH_SIZE, Math.round(ICON_BADGE_DIAMETER * 0.56))
/** Доля пути сегмента (от старта к концу): значок у конца дуги на той же орбите, чуть до стыка со следующим. */
const ICON_ON_SEGMENT_FRACTION = 1
const PERCENT_LABEL_RADIUS = MAIN_RING_RADIUS + 42
const PERCENT_LABEL_BOX_WIDTH = 66
/** Нулевые зазоры между дугами — кольцо замыкается без просветов. */
const RING_BOUNDARY_GAP_PERCENT = 0
const RING_SEAM_GAP_PERCENT = 0
/** Минимальная доля круга для отрисовки сегмента (реальные проценты в подписи не меняются). */
const MIN_RING_VISUAL_PERCENT = 13
const RING_DRAW_CLOCKWISE = true
const DONUT_HOLE_SIZE = 164
const SIDE_PREVIEW_SIZE = 250
const SIDE_PREVIEW_OFFSET = -210
const SIDE_RING_MASK = 'radial-gradient(circle, transparent 0 73px, #000 74px 101px, transparent 102px)'
const MONTH_SWITCH_DURATION_MS = 150

const MONITORING_OWNER_ID = 'user_1'
const MONITORING_PRIMARY_ACCOUNT_ID = 'acc_tbc_main'
const FAMILY_MEMBER_IDS = FAMILY_MEMBERS.map((member) => member.id)

/** Счета, вклады и привязанные карты владельца (как на /home) для фильтра диаграммы. */
function getMonitoringAccountFilterOptions(filterByFamilyMember = false) {
  if (filterByFamilyMember) {
    return [
      { id: 'all_members', label: 'Все участники', kind: 'family_all' },
      ...FAMILY_MEMBERS.map((member) => ({
        id: member.id,
        label: member.name,
        kind: 'family_member',
      })),
    ]
  }

  const rows = [{ id: 'all', label: 'Все счета и карты' }]
  const mine = ACCOUNTS.filter((a) => a.userId === MONITORING_OWNER_ID)

  mine.forEach((acc) => {
    if (acc.type === 'deposit') {
      rows.push({ id: acc.id, label: acc.label, kind: 'deposit' })
      return
    }
    if (acc.card) {
      rows.push({ id: acc.id, label: acc.label, kind: 'account' })
    }
  })

  LINKED_EXTERNAL_CARDS.filter((c) => c.ownerUserId === MONITORING_OWNER_ID).forEach((card) => {
    rows.push({
      id: card.id,
      label: card.userLabel?.trim() || 'Карта',
      kind: 'linked',
    })
  })

  return rows
}

/** Какие accountId учитывать при выборе пункта (у привязанных карт в данных нет отдельного accountId — для банка Recreate берём основной счёт). */
function resolveMonitoringAccountIds(filterId, filterByFamilyMember = false) {
  if (filterByFamilyMember) {
    return null
  }
  if (filterId === 'all') {
    return null
  }
  if (String(filterId).startsWith('ext_card_')) {
    const card = LINKED_EXTERNAL_CARDS.find((c) => c.id === filterId)
    if (card && card.bank === PRIMARY_BANK_RECREATE) {
      return [MONITORING_PRIMARY_ACCOUNT_ID]
    }
    return []
  }
  return [filterId]
}

function resolveMonitoringUserIds(filterId, filterByFamilyMember = false) {
  if (!filterByFamilyMember) {
    return [MONITORING_OWNER_ID]
  }
  if (filterId === 'all_members') {
    return FAMILY_MEMBER_IDS
  }
  return FAMILY_MEMBER_IDS.includes(filterId) ? [filterId] : []
}

/**
 * null — все переводы в аналитике;
 * 'household' — «Без переводов в семье»: скрываем переводы себе (между своими счетами) и внутри семьи;
 * 'others' — «Без перевода другим людям»: скрываем P2P и переводы на «чужие» карты;
 * 'all' — «Без всех переводов»: скрываем любые transfer_*; цели, вклад, валюту и инвестиции оставляем.
 */
function filterMonitoringExpenseTransactions(accountFilterId, transferExclusionMode, filterByFamilyMember = false) {
  const accountIds = resolveMonitoringAccountIds(accountFilterId, filterByFamilyMember)
  const allowedUserIds = resolveMonitoringUserIds(accountFilterId, filterByFamilyMember)

  return TRANSACTIONS.filter((transaction) => {
    if (!allowedUserIds.includes(transaction.userId)) {
      return false
    }
    const purchaseOrSub = transaction.kind === 'purchase' || transaction.kind === 'subscription'
    const savingsOrInvestOut =
      transaction.direction === 'out' &&
      (transaction.kind === 'goal_topup' ||
        transaction.kind === 'deposit_topup' ||
        transaction.kind === 'currency_purchase' ||
        transaction.kind === 'investment_contribution')
    const transferOut =
      transaction.direction === 'out' && String(transaction.kind || '').startsWith('transfer_')
    const transferSelfOrFamily =
      transferOut &&
      (transaction.kind === 'transfer_internal' || transaction.kind === 'transfer_family')
    const transferToOtherPeople =
      transferOut &&
      transaction.kind !== 'transfer_family' &&
      transaction.kind !== 'transfer_internal'

    if (!purchaseOrSub && !savingsOrInvestOut && !transferOut) {
      return false
    }

    if (transferOut) {
      const isDepositAccountFillOut =
        transaction.kind === 'transfer_internal' && transaction.category === 'deposit_account_fill'
      if (!isDepositAccountFillOut) {
        if (transferExclusionMode === 'all') {
          return false
        }
        if (transferExclusionMode === 'household' && transferSelfOrFamily) {
          return false
        }
        if (transferExclusionMode === 'others' && transferToOtherPeople) {
          return false
        }
      }
    }

    if (accountIds == null) {
      return true
    }
    if (accountIds.length === 0) {
      return false
    }
    return accountIds.includes(transaction.accountId)
  })
}

function filterMonitoringAllTransactions(accountFilterId, filterByFamilyMember = false) {
  const accountIds = resolveMonitoringAccountIds(accountFilterId, filterByFamilyMember)
  const allowedUserIds = resolveMonitoringUserIds(accountFilterId, filterByFamilyMember)

  return TRANSACTIONS.filter((transaction) => {
    if (!allowedUserIds.includes(transaction.userId)) {
      return false
    }
    if (accountIds == null) {
      return true
    }
    if (accountIds.length === 0) {
      return false
    }
    return accountIds.includes(transaction.accountId)
  })
}

/**
 * Входящие для аналитики поступлений: те же правила скрытия переводов, что и для расходов
 * (дом / чужие / все), плюс только транзакции владельца и выбранных счетов.
 */
function filterMonitoringIncomeTransactions(accountFilterId, transferExclusionMode, filterByFamilyMember = false) {
  const accountIds = resolveMonitoringAccountIds(accountFilterId, filterByFamilyMember)
  const allowedUserIds = resolveMonitoringUserIds(accountFilterId, filterByFamilyMember)

  return TRANSACTIONS.filter((transaction) => {
    if (!allowedUserIds.includes(transaction.userId)) {
      return false
    }
    if (transaction.direction !== 'in') {
      return false
    }

    const transferIn = String(transaction.kind || '').startsWith('transfer_')
    const transferSelfOrFamilyIn =
      transferIn &&
      (transaction.kind === 'transfer_internal' ||
        transaction.kind === 'transfer_family' ||
        transaction.kind === 'transfer_external_card' ||
        transaction.category === 'internal' ||
        transaction.category === 'family')
    const transferToOtherPeopleIn = transferIn && !transferSelfOrFamilyIn

    if (transferIn) {
      const isDepositAccountPayoutIn =
        transaction.kind === 'transfer_internal' && transaction.category === 'deposit_account_payout'
      if (!isDepositAccountPayoutIn) {
        if (transferExclusionMode === 'all') {
          return false
        }
        if (transferExclusionMode === 'household' && transferSelfOrFamilyIn) {
          return false
        }
        if (transferExclusionMode === 'others' && transferToOtherPeopleIn) {
          return false
        }
      }
    }

    if (accountIds == null) {
      return true
    }
    if (accountIds.length === 0) {
      return false
    }
    return accountIds.includes(transaction.accountId)
  })
}

const MONITORING_CATEGORY_KEYS = new Set(Object.keys(CATEGORIES))

function aggregateMonitoringOutflow(transactions) {
  return (transactions || []).reduce((acc, transaction) => {
    if (transaction.direction !== 'out') {
      return acc
    }
    const amount = Math.abs(Number(transaction.amountUzs) || 0)
    let key
    if (transaction.kind === 'goal_topup') {
      key = 'goal_topup'
    } else if (transaction.kind === 'deposit_topup') {
      key = 'deposit'
    } else if (transaction.kind === 'currency_purchase') {
      key = 'currency_purchase'
    } else if (transaction.kind === 'investment_contribution') {
      key = 'investments'
    } else {
      key = transaction.category || 'other'
      if (key === 'transfer_external') {
        key = 'transfer'
      }
      if (!MONITORING_CATEGORY_KEYS.has(key)) {
        key = 'other'
      }
    }
    acc[key] = (acc[key] || 0) + amount
    return acc
  }, {})
}

function aggregateMonitoringInflow(transactions) {
  return (transactions || []).reduce((acc, transaction) => {
    if (transaction.direction !== 'in') {
      return acc
    }
    const amount = Math.abs(Number(transaction.amountUzs) || 0)
    let key = transaction.category || 'income'
    if (key === 'transfer_external') {
      key = 'transfer'
    }
    if (!MONITORING_CATEGORY_KEYS.has(key)) {
      key = 'income'
    }
    acc[key] = (acc[key] || 0) + amount
    return acc
  }, {})
}

/** Ключ сегмента мониторинга для исходящей операции (логика как в aggregateMonitoringOutflow). */
function monitoringOutflowCategoryKey(transaction) {
  if (transaction.direction !== 'out') return null
  if (transaction.kind === 'goal_topup') {
    return 'goal_topup'
  }
  if (transaction.kind === 'deposit_topup') {
    return 'deposit'
  }
  if (transaction.kind === 'currency_purchase') {
    return 'currency_purchase'
  }
  if (transaction.kind === 'investment_contribution') {
    return 'investments'
  }
  let key = transaction.category || 'other'
  if (key === 'transfer_external') {
    key = 'transfer'
  }
  if (!MONITORING_CATEGORY_KEYS.has(key)) {
    key = 'other'
  }
  return key
}

/** Ключ сегмента мониторинга для входящей операции (логика как в aggregateMonitoringInflow). */
function monitoringInflowCategoryKey(transaction) {
  if (transaction.direction !== 'in') return null
  let key = transaction.category || 'income'
  if (key === 'transfer_external') {
    key = 'transfer'
  }
  if (!MONITORING_CATEGORY_KEYS.has(key)) {
    key = 'income'
  }
  return key
}

/**
 * @param {'monitoring' | 'debit' | 'credit'} mode
 */
function filterTransactionsByMonitoringSegment(transactions, segmentCategory, mode) {
  if (!segmentCategory || segmentCategory === 'card_balance') {
    return []
  }
  const list = transactions || []
  if (mode === 'monitoring') {
    return list.filter(
      (tx) =>
        monitoringOutflowCategoryKey(tx) === segmentCategory ||
        monitoringInflowCategoryKey(tx) === segmentCategory,
    )
  }
  if (mode === 'debit') {
    return list.filter((tx) => monitoringOutflowCategoryKey(tx) === segmentCategory)
  }
  return list.filter((tx) => monitoringInflowCategoryKey(tx) === segmentCategory)
}

function buildMonitoringSegments(totalsByCategory, balanceAmount, options = {}) {
  const { includeCardBalance = true } = options
  const totals = totalsByCategory || {}
  const orderedCategories = Object.keys(totals)
    .filter((key) => totals[key] > 0)
    .sort((a, b) => (totals[b] || 0) - (totals[a] || 0))

  const categoryRows = [
    ...(includeCardBalance
      ? [{ category: 'card_balance', amount: Math.max(0, Number(balanceAmount) || 0) }]
      : []),
    ...orderedCategories.map((category) => ({
      category,
      amount: totals[category] || 0,
    })),
  ].filter((row) => row.amount > 0)

  const total = categoryRows.reduce((sum, row) => sum + row.amount, 0)

  return {
    total,
    segments: categoryRows.map((row) => ({
      category: row.category,
      amount: row.amount,
      share: (row.amount / (total || 1)) * 100,
      percent: roundPercent((row.amount / (total || 1)) * 100),
      label: CATEGORIES[row.category]?.label || row.category,
      color: CATEGORY_RING_COLOR_OVERRIDES[row.category] || CATEGORIES[row.category]?.color || '#4cd6fb',
      emoji: CATEGORIES[row.category]?.emoji || '•',
      icon: CATEGORY_ICON_MAP[row.category] || CATEGORY_ICON_MAP.other,
    })),
  }
}

/** Полоска категорий на карточках мониторинга: доли всегда в сумме 100%, без «пустого» хвоста. */
function normalizeMiniBarFillPercents(segments) {
  const rows = (segments || []).filter((s) => s.amount > 0)
  const totalAmount = rows.reduce((sum, s) => sum + s.amount, 0)
  if (totalAmount <= 0 || rows.length === 0) {
    return [{ category: 'empty', color: '#4cd6fb', fillPct: 100 }]
  }
  const withPct = rows.map((s) => ({
    category: s.category,
    color: s.color,
    fillPct: (s.amount / totalAmount) * 100,
  }))
  const sum = withPct.reduce((a, s) => a + s.fillPct, 0)
  const drift = 100 - sum
  if (Math.abs(drift) > 1e-6 && withPct.length > 0) {
    const last = withPct.length - 1
    withPct[last] = { ...withPct[last], fillPct: withPct[last].fillPct + drift }
  }
  return withPct
}

/** Доли круга для отрисовки: малые категории получают минимум MIN_RING_VISUAL_PERCENT. */
function normalizeRingLayoutPercents(items) {
  const positive = items.filter((it) => it.realShare > 0)
  if (positive.length === 0) {
    return new Map()
  }

  const floors = positive.map((it) => ({
    category: it.category,
    realShare: it.realShare,
    floor: Math.max(it.realShare, MIN_RING_VISUAL_PERCENT),
  }))

  let sumF = floors.reduce((s, x) => s + x.floor, 0)
  const layoutByCat = {}

  if (sumF <= 100 + 1e-6) {
    const remainder = 100 - sumF
    const larges = floors.filter((x) => x.realShare >= MIN_RING_VISUAL_PERCENT)
    if (remainder > 1e-6) {
      if (larges.length > 0) {
        const wSum = larges.reduce((s, x) => s + x.realShare, 0)
        for (const x of floors) {
          layoutByCat[x.category] =
            x.realShare >= MIN_RING_VISUAL_PERCENT
              ? x.floor + remainder * (x.realShare / wSum)
              : x.floor
        }
      } else {
        const add = remainder / floors.length
        for (const x of floors) {
          layoutByCat[x.category] = x.floor + add
        }
      }
    } else {
      for (const x of floors) {
        layoutByCat[x.category] = x.floor
      }
    }
  } else {
    const scale = 100 / sumF
    for (const x of floors) {
      layoutByCat[x.category] = x.floor * scale
    }
  }

  let sumL = Object.values(layoutByCat).reduce((a, b) => a + b, 0)
  if (sumL > 0 && Math.abs(sumL - 100) > 1e-6) {
    const fix = 100 / sumL
    for (const k of Object.keys(layoutByCat)) {
      layoutByCat[k] *= fix
    }
    sumL = 100
  }

  const map = new Map()
  for (const k of Object.keys(layoutByCat)) {
    map.set(k, layoutByCat[k])
  }
  return map
}

function buildRingMetricsFromSegments(segments, isUnlocked) {
  const ringSegments = (segments || []).filter((segment) => segment.amount > 0)

  if (!isUnlocked || ringSegments.length === 0) {
    return []
  }

  const layoutMap = normalizeRingLayoutPercents(
    ringSegments.map((s) => ({ category: s.category, realShare: s.share })),
  )

  const chartSize = 320
  const center = chartSize / 2
  const arcRadius = MAIN_RING_RADIUS
  let cursor = 0

  const rawMetrics = ringSegments.map((segment, index) => {
    const isLastSegment = index === ringSegments.length - 1
    const nominalLayout = layoutMap.get(segment.category) ?? 0
    const layoutShare = isLastSegment ? Math.max(0, 100 - cursor) : nominalLayout
    const start = cursor
    const end = start + layoutShare
    if (!isLastSegment) {
      cursor = end
    }

    const arcStart = start
    const arcEnd = end
    const centerPercent = (arcStart + arcEnd) / 2
    const centerAngleDeg = toRingAngle(centerPercent, RING_DRAW_CLOCKWISE)

    const labelRadius = PERCENT_LABEL_RADIUS
    const iconRadius = MAIN_RING_RADIUS
    const startAngleDeg = toRingAngle(arcStart, RING_DRAW_CLOCKWISE)
    const endAngleDeg = toRingAngle(arcEnd, RING_DRAW_CLOCKWISE)
    const span = arcEnd - arcStart
    let arcSweepDeg = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360
    const isFullCircleLayout = span >= 99.5
    let arcPath
    let showArc
    if (isFullCircleLayout) {
      arcSweepDeg = 360
      arcPath = describeFullRingPath(center, center, arcRadius, startAngleDeg, RING_DRAW_CLOCKWISE)
      showArc = true
    } else {
      arcPath = describeArcPath(center, center, arcRadius, startAngleDeg, endAngleDeg, RING_DRAW_CLOCKWISE)
      showArc = arcSweepDeg > 0.02
    }
    const rawIconPercent = arcStart + span * ICON_ON_SEGMENT_FRACTION
    const iconPercent =
      span > 1e-9
        ? Math.min(Math.max(rawIconPercent, arcStart + 1e-9), arcEnd - 1e-9)
        : arcStart
    const iconAngleDeg = toRingAngle(iconPercent, RING_DRAW_CLOCKWISE)
    const iconPoint = pointOnCircle(center, center, iconRadius, iconAngleDeg)

    return {
      ...segment,
      startDeg: startAngleDeg,
      endDeg: endAngleDeg,
      centerAngleDeg,
      labelAngleDeg: iconAngleDeg,
      iconAngleDeg,
      arcSweepDeg,
      arcPath,
      labelX: center,
      labelY: center,
      adjustedLabelY: center,
      iconX: iconPoint.x,
      iconY: iconPoint.y,
      showPercent: true,
      showArc,
    }
  })

  if (rawMetrics.length > 0) {
    const normalizeAngle = (angle) => ((angle % 360) + 360) % 360
    const shortestAngleDiff = (from, to) => {
      const normalized = ((to - from + 540) % 360) - 180
      return normalized
    }

    const metricsByAngle = [...rawMetrics].sort((a, b) => a.labelAngleDeg - b.labelAngleDeg)
    const minArcGapPx = 18
    const minGapDeg = (minArcGapPx / (2 * Math.PI * PERCENT_LABEL_RADIUS)) * 360

    for (let pass = 0; pass < 18; pass++) {
      for (let i = 0; i < metricsByAngle.length; i++) {
        const current = metricsByAngle[i]
        const next = metricsByAngle[(i + 1) % metricsByAngle.length]
        const delta = (next.labelAngleDeg - current.labelAngleDeg + 360) % 360
        if (delta < minGapDeg) {
          const push = (minGapDeg - delta) / 2
          current.labelAngleDeg = normalizeAngle(current.labelAngleDeg - push)
          next.labelAngleDeg = normalizeAngle(next.labelAngleDeg + push)
        }
      }

      for (const metric of metricsByAngle) {
        metric.labelAngleDeg = normalizeAngle(
          metric.labelAngleDeg + shortestAngleDiff(metric.labelAngleDeg, metric.iconAngleDeg) * 0.2,
        )
      }

      metricsByAngle.sort((a, b) => a.labelAngleDeg - b.labelAngleDeg)
    }

    for (const metric of rawMetrics) {
      const labelPoint = pointOnCircle(center, center, PERCENT_LABEL_RADIUS, metric.labelAngleDeg)
      metric.labelX = labelPoint.x
      metric.labelY = labelPoint.y
      metric.adjustedLabelY = labelPoint.y
    }
  }

  return rawMetrics
}

/** Минимальная «карта» для расчёта остатка и last4 в деталях операции мониторинга. */
function buildMonitoringCardForHistory(accountId) {
  const acc = ACCOUNTS.find((a) => a.id === accountId)
  if (!acc) {
    return {
      id: accountId,
      balanceUzs: 0,
      movementsAccountId: accountId,
      last4: '0000',
    }
  }
  const isFx = acc.currency && acc.currency !== 'UZS'
  const last4 = acc.card ? last4FromPan(acc.card.pan) : '0000'
  return {
    id: acc.id,
    balanceUzs: acc.balanceUzs ?? 0,
    foreignCurrency: isFx ? acc.currency : null,
    balanceForeign: isFx && acc.balanceForeign != null ? acc.balanceForeign : null,
    movementsAccountId: acc.id,
    last4,
  }
}

function OperationsHistorySheet({
  open,
  onClose,
  title,
  periodLabel,
  operations,
  onSelectOperation,
  overlayZIndexClass = 'z-[120]',
}) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const openAnimRafRef = useRef({ outer: 0, inner: 0 })
  const sheetDragStartYRef = useRef(null)
  const sheetDragOffsetRef = useRef(0)

  useEffect(() => {
    if (open) {
      setVisible(true)
      /** Всегда один кадр «закрыто», иначе переход не срабатывает при повторном открытии. */
      setAnimating(false)
      cancelAnimationFrame(openAnimRafRef.current.outer)
      cancelAnimationFrame(openAnimRafRef.current.inner)
      openAnimRafRef.current.outer = requestAnimationFrame(() => {
        openAnimRafRef.current.inner = requestAnimationFrame(() => setAnimating(true))
      })
      return () => {
        cancelAnimationFrame(openAnimRafRef.current.outer)
        cancelAnimationFrame(openAnimRafRef.current.inner)
      }
    }
    setAnimating(false)
    const t = window.setTimeout(() => setVisible(false), HISTORY_SHEET_ANIM_MS)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) {
      setDragOffset(0)
      sheetDragOffsetRef.current = 0
      sheetDragStartYRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!visible || typeof document === 'undefined') {
    return null
  }

  const periodText = /^\d{4}$/.test(String(periodLabel).trim()) ? `${periodLabel} год` : periodLabel

  const sheetDragging = dragOffset > 0
  const sheetTransform = !animating ? 'translateY(100%)' : `translateY(${dragOffset}px)`
  const sheetTransitionMs = sheetDragging ? 0 : HISTORY_SHEET_ANIM_MS

  const onSheetHeaderTouchStart = (e) => {
    if (!animating) return
    sheetDragStartYRef.current = e.touches[0].clientY
  }

  const onSheetHeaderTouchMove = (e) => {
    if (sheetDragStartYRef.current == null || !animating) return
    const y = e.touches[0].clientY
    const dy = y - sheetDragStartYRef.current
    if (dy > 0) {
      sheetDragOffsetRef.current = dy
      setDragOffset(dy)
    }
  }

  const onSheetHeaderTouchEnd = () => {
    if (sheetDragStartYRef.current == null) return
    sheetDragStartYRef.current = null
    const d = sheetDragOffsetRef.current
    if (d >= HISTORY_SHEET_SWIPE_CLOSE_PX) {
      sheetDragOffsetRef.current = 0
      setDragOffset(0)
      onClose()
      return
    }
    sheetDragOffsetRef.current = 0
    setDragOffset(0)
  }

  const sheet = (
    <div className={`fixed inset-0 flex flex-col justify-end overscroll-none ${overlayZIndexClass}`}>
      <div
        aria-hidden
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDuration: `${HISTORY_SHEET_ANIM_MS}ms` }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(85dvh,720px)] min-h-0 w-full flex-col rounded-t-[28px] border-t border-[#3d494d] bg-[#010e24]/98 shadow-[0_-12px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        style={{
          transform: sheetTransform,
          transitionProperty: 'transform',
          transitionDuration: `${sheetTransitionMs}ms`,
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="shrink-0 select-none px-5 pt-4 touch-pan-y"
          onTouchCancel={onSheetHeaderTouchEnd}
          onTouchEnd={onSheetHeaderTouchEnd}
          onTouchMove={onSheetHeaderTouchMove}
          onTouchStart={onSheetHeaderTouchStart}
        >
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 cursor-grab rounded-full bg-[#4cd6fb]/30 active:cursor-grabbing"
          />
          <div className="mb-4 flex min-h-[3.25rem] items-center justify-between gap-3">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-left font-headline text-2xl font-bold leading-tight text-[#d6e3ff] sm:text-3xl">
              <span className="text-[#d6e3ff]">{title}</span>
              <span className="font-semibold text-[#869398]"> — </span>
              <span className="font-semibold text-[#bcc9ce]">{periodText}</span>
            </h3>
            <div className="shrink-0">
              <SubpageCloseButton ariaLabel="Закрыть список операций" onClose={onClose} />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 [-webkit-overflow-scrolling:touch]">
          {operations.length > 0 ? (
            <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-2.5">
              {operations.map((operation) => {
                const categoryMeta = CATEGORIES[operation.category] || {}
                const accent =
                  CATEGORY_RING_COLOR_OVERRIDES[operation.category] ??
                  CATEGORIES[operation.category]?.color ??
                  '#94a3b8'
                const listIcon = CATEGORY_ICON_MAP[operation.category] || CATEGORY_ICON_MAP.other

                return (
                  <button
                    key={operation.id}
                    type="button"
                    className="grid min-h-[2.625rem] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0 rounded-full border py-1 pl-1 pr-1.5 text-left transition-[transform,box-shadow] active:scale-[0.99] sm:min-h-[2.75rem] sm:gap-x-1.5 sm:py-1.5 sm:pl-1.5 sm:pr-2"
                    style={{
                      borderColor: `${accent}50`,
                      background: `linear-gradient(95deg, ${accent}22 0%, rgba(17,32,54,0.9) 42%, rgba(17,28,46,0.94) 100%)`,
                      boxShadow: `inset 0 1px 0 ${accent}18`,
                    }}
                    onClick={() => onSelectOperation?.(operation)}
                  >
                    <span
                      className="relative flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: `${ICON_BADGE_DIAMETER}px`,
                        height: `${ICON_BADGE_DIAMETER}px`,
                        backgroundColor: accent,
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.2) inset`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined pointer-events-none leading-none text-white"
                        style={{
                          fontSize: `${ICON_BADGE_GLYPH}px`,
                          lineHeight: 1,
                          fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
                          textShadow:
                            '0 0 1px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 8px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {listIcon}
                      </span>
                    </span>

                    <span
                      lang="ru"
                      className="min-w-0 hyphens-auto break-words text-left text-[11px] font-medium leading-[1.2] tracking-tight text-[#e8eef9] [overflow-wrap:anywhere] line-clamp-2 sm:text-[12px] md:text-[13px]"
                    >
                      <span className="block leading-[1.15]">{operation.merchant}</span>
                      <span className="mt-0.5 block text-[9px] font-normal leading-[1.15] text-[#869398] sm:text-[10px]">
                        {categoryMeta.label || operation.category}
                      </span>
                    </span>

                    <div
                      className={`shrink-0 justify-self-end whitespace-nowrap text-right text-[10px] font-semibold leading-none tabular-nums sm:text-[11px] md:text-xs ${
                        operation.direction === 'in' ? 'text-[#6ee7a8]' : 'text-[#ffb4ab]'
                      }`}
                    >
                      <span className="mr-0.5 inline-block select-none align-baseline">
                        {operation.direction === 'in' ? '+' : '−'}
                      </span>
                      <UzsAmount
                        as="span"
                        className="inline-flex items-baseline leading-none"
                        compact
                        compactFrom={1_000_000}
                        currencyClassName="inline-block shrink-0 align-baseline font-semibold uppercase tracking-[0.12em] text-[#aab8ce]"
                        value={String(Math.round(operation.amountUzs))}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#112036] p-4 text-sm text-[#869398]">
              Нет операций для выбранного периода.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}

export default function CostPage({
  mode = 'debit',
  embedded = false,
  embeddedInline = false,
  filterByFamilyMember = false,
  externalAccountFilterId = null,
  externalAccountFilterToken = 0,
  /** Родитель даёт `rounded-[32px] bg-[#0d1c32] p-6` — без второй «карточки» внутри. */
  embeddedInlineContained = false,
  onEmbeddedClose,
}) {
  const isUnlocked = isSessionUnlocked()
  const navigate = useNavigate()
  const location = useLocation()
  const isMonitoringMode = mode === 'monitoring'
  const flowMode = mode === 'credit' ? 'credit' : 'debit'

  const accountFilterOptions = useMemo(
    () => getMonitoringAccountFilterOptions(filterByFamilyMember),
    [filterByFamilyMember],
  )
  const [accountFilterId, setAccountFilterId] = useState(filterByFamilyMember ? 'all_members' : 'all')
  /**
   * null — все переводы в аналитике;
   * 'household' — без переводов себе и внутри семьи (по умолчанию);
   * 'others' — без перевода другим людям;
   * 'all' — без всех переводов (только цели/вклад/валюта/инвестиции из «не покупок»).
   */
  const [transferExclusionMode, setTransferExclusionMode] = useState('household')
  const [periodMode, setPeriodMode] = useState('month')
  const [accountFilterMenuOpen, setAccountFilterMenuOpen] = useState(false)
  const [transferFilterMenuOpen, setTransferFilterMenuOpen] = useState(false)
  const [accountFilterMenuMounted, setAccountFilterMenuMounted] = useState(false)
  const [accountFilterMenuEntered, setAccountFilterMenuEntered] = useState(false)
  const [transferFilterMenuMounted, setTransferFilterMenuMounted] = useState(false)
  const [transferFilterMenuEntered, setTransferFilterMenuEntered] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)
  const [categorySheet, setCategorySheet] = useState({
    open: false,
    category: null,
    label: '',
  })
  const [historyDetailMovementId, setHistoryDetailMovementId] = useState(null)
  const linkedDepositMovements = useMemo(() => loadDepositCardMovements(), [])
  const accountFilterDropdownRef = useRef(null)
  const transferFilterDropdownRef = useRef(null)
  /** Прокрутка к кольцу при входе с чата (см. location.state.focusMonitoringDiagram) */
  const monitoringDiagramAnchorRef = useRef(null)

  useEffect(() => {
    let closeTimer
    let enterRaf1
    let enterRaf2
    if (accountFilterMenuOpen) {
      enterRaf1 = requestAnimationFrame(() => {
        setAccountFilterMenuMounted(true)
        enterRaf2 = requestAnimationFrame(() => setAccountFilterMenuEntered(true))
      })
    } else {
      enterRaf1 = requestAnimationFrame(() => {
        setAccountFilterMenuEntered(false)
        closeTimer = window.setTimeout(() => setAccountFilterMenuMounted(false), FILTER_DROPDOWN_ANIM_MS)
      })
    }
    return () => {
      window.clearTimeout(closeTimer)
      if (enterRaf1 != null) cancelAnimationFrame(enterRaf1)
      if (enterRaf2 != null) cancelAnimationFrame(enterRaf2)
    }
  }, [accountFilterMenuOpen])

  useEffect(() => {
    let closeTimer
    let enterRaf1
    let enterRaf2
    if (transferFilterMenuOpen) {
      enterRaf1 = requestAnimationFrame(() => {
        setTransferFilterMenuMounted(true)
        enterRaf2 = requestAnimationFrame(() => setTransferFilterMenuEntered(true))
      })
    } else {
      enterRaf1 = requestAnimationFrame(() => {
        setTransferFilterMenuEntered(false)
        closeTimer = window.setTimeout(() => setTransferFilterMenuMounted(false), FILTER_DROPDOWN_ANIM_MS)
      })
    }
    return () => {
      window.clearTimeout(closeTimer)
      if (enterRaf1 != null) cancelAnimationFrame(enterRaf1)
      if (enterRaf2 != null) cancelAnimationFrame(enterRaf2)
    }
  }, [transferFilterMenuOpen])

  useEffect(() => {
    if (!accountFilterMenuOpen && !transferFilterMenuOpen) {
      return undefined
    }
    const onPointerDown = (event) => {
      const accountEl = accountFilterDropdownRef.current
      const transferEl = transferFilterDropdownRef.current
      if (accountEl && !accountEl.contains(event.target)) {
        setAccountFilterMenuOpen(false)
      }
      if (transferEl && !transferEl.contains(event.target)) {
        setTransferFilterMenuOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountFilterMenuOpen(false)
        setTransferFilterMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountFilterMenuOpen, transferFilterMenuOpen])

  /** База категорий кольца: покупки/подписки при полном исключении переводов. */
  const expenseTransactionsNoTransfers = useMemo(
    () => filterMonitoringExpenseTransactions(accountFilterId, 'all', filterByFamilyMember),
    [accountFilterId, filterByFamilyMember],
  )

  const expenseTransactions = useMemo(
    () => filterMonitoringExpenseTransactions(accountFilterId, transferExclusionMode, filterByFamilyMember),
    [accountFilterId, transferExclusionMode, filterByFamilyMember],
  )

  const incomeTransactions = useMemo(
    () => filterMonitoringIncomeTransactions(accountFilterId, transferExclusionMode, filterByFamilyMember),
    [accountFilterId, transferExclusionMode, filterByFamilyMember],
  )

  const allMonitoringTransactions = useMemo(
    () => filterMonitoringAllTransactions(accountFilterId, filterByFamilyMember),
    [accountFilterId, filterByFamilyMember],
  )

  useEffect(() => {
    const defaultFilter = filterByFamilyMember ? 'all_members' : 'all'
    setAccountFilterId(defaultFilter)
  }, [filterByFamilyMember])

  const [selectedPeriodKey, setSelectedPeriodKey] = useState(null)

  useEffect(() => {
    if (!isMonitoringMode || !externalAccountFilterId) {
      return
    }
    if (!accountFilterOptions.some((option) => option.id === externalAccountFilterId)) {
      return
    }
    setAccountFilterId(externalAccountFilterId)
    setAccountFilterMenuOpen(false)
    setSelectedPeriodKey(null)
  }, [
    accountFilterOptions,
    externalAccountFilterId,
    externalAccountFilterToken,
    isMonitoringMode,
  ])

  const groupedAllMonitoringByPeriod = useMemo(
    () => groupTransactionsByPeriod(allMonitoringTransactions, periodMode),
    [allMonitoringTransactions, periodMode],
  )
  const groupedExpenseByPeriod = useMemo(
    () => groupTransactionsByPeriod(expenseTransactions, periodMode),
    [expenseTransactions, periodMode],
  )
  const groupedExpenseNoTransfersByPeriod = useMemo(
    () => groupTransactionsByPeriod(expenseTransactionsNoTransfers, periodMode),
    [expenseTransactionsNoTransfers, periodMode],
  )
  const groupedIncomeByPeriod = useMemo(
    () => groupTransactionsByPeriod(incomeTransactions, periodMode),
    [incomeTransactions, periodMode],
  )

  const periodKeys = useMemo(() => {
    const unique = new Set([
      ...groupedAllMonitoringByPeriod.keys(),
      ...groupedExpenseByPeriod.keys(),
      ...groupedExpenseNoTransfersByPeriod.keys(),
      ...groupedIncomeByPeriod.keys(),
    ])
    return Array.from(unique).sort()
  }, [
    groupedAllMonitoringByPeriod,
    groupedExpenseByPeriod,
    groupedExpenseNoTransfersByPeriod,
    groupedIncomeByPeriod,
  ])

  const selectedPeriodIndex = useMemo(() => {
    if (periodKeys.length === 0) {
      return 0
    }
    if (selectedPeriodKey == null) {
      return periodKeys.length - 1
    }
    const found = periodKeys.indexOf(selectedPeriodKey)
    return found >= 0 ? found : periodKeys.length - 1
  }, [periodKeys, selectedPeriodKey])

  const useSwipeNavigation = useMemo(() => isMobileDevice(), [])
  const transitionFrameRef = useRef(null)
  const transitionTimeoutRef = useRef(null)
  const [ringTransition, setRingTransition] = useState(null)

  useEffect(() => {
    return () => {
      if (transitionFrameRef.current != null) {
        cancelAnimationFrame(transitionFrameRef.current)
      }

      if (transitionTimeoutRef.current != null) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const periodSnapshots = useMemo(() => {
    return periodKeys.map((periodKey) => {
      const transactions = groupedAllMonitoringByPeriod.get(periodKey) ?? []
      const incomeTransactionsForPeriod = groupedIncomeByPeriod.get(periodKey) ?? []
      const expenseTransactionsForPeriod = groupedExpenseByPeriod.get(periodKey) ?? []
      const transactionsNoTf = groupedExpenseNoTransfersByPeriod.get(periodKey) ?? []

      const totalsCurrent = aggregateMonitoringOutflow(expenseTransactionsForPeriod)
      const totalsNoTf = aggregateMonitoringOutflow(transactionsNoTf)
      const totalsCredit = aggregateMonitoringInflow(incomeTransactionsForPeriod)
      const selectedUserIds = resolveMonitoringUserIds(accountFilterId, filterByFamilyMember)
      const currentBalance = selectedUserIds.reduce(
        (sum, userId) => sum + getPaymentCardsTotalUzs(userId, ACCOUNTS, LINKED_EXTERNAL_CARDS),
        0,
      )
      const periodEnd = getPeriodEndDate(periodKey, periodMode)
      const allUserTxs = TRANSACTIONS.filter((tx) => selectedUserIds.includes(tx.userId))
      const cardBalance = computeHistoricalBalance(currentBalance, periodEnd, allUserTxs)

      const categoryUnion = new Set([
        ...Object.keys(totalsNoTf).filter((k) => totalsNoTf[k] > 0),
        ...Object.keys(totalsCurrent).filter((k) => totalsCurrent[k] > 0),
        'transfer',
        'goal_topup',
        'deposit',
        'currency_purchase',
        'investments',
        'other',
      ])

      const debitRows = buildMonitoringSegments(
        {
          ...Object.fromEntries(Array.from(categoryUnion).map((key) => [key, totalsCurrent[key] || 0])),
          transfer: totalsCurrent.transfer || 0,
          goal_topup: totalsCurrent.goal_topup || 0,
          deposit: totalsCurrent.deposit || 0,
          currency_purchase: totalsCurrent.currency_purchase || 0,
          investments: totalsCurrent.investments || 0,
          other: totalsCurrent.other || 0,
        },
        0,
        { includeCardBalance: false },
      )
      const creditRows = buildMonitoringSegments(totalsCredit, 0, { includeCardBalance: false })
      const monitoringRows = buildMonitoringSegments(
        {
          ...Object.fromEntries(
            Array.from(new Set([...Object.keys(totalsCurrent), ...Object.keys(totalsCredit)]))
              .filter((key) => key !== 'income')
              .map((key) => [key, (totalsCurrent[key] || 0) + (totalsCredit[key] || 0)]),
          ),
        },
        cardBalance,
      )
      const segments = debitRows.segments
      const total = debitRows.total

      const debitMetrics = buildRingMetricsFromSegments(debitRows.segments, isUnlocked)
      const creditMetrics = buildRingMetricsFromSegments(creditRows.segments, isUnlocked)
      const monitoringMetrics = buildRingMetricsFromSegments(monitoringRows.segments, isUnlocked)

      return {
        key: periodKey,
        label: getPeriodLabel(periodKey, periodMode),
        transactions,
        expenseTransactions: expenseTransactionsForPeriod,
        incomeTransactions: incomeTransactionsForPeriod,
        total,
        segments,
        debitTotal: total,
        creditTotal: creditRows.total,
        debitSegments: segments,
        creditSegments: creditRows.segments,
        monitoringSegments: monitoringRows.segments,
        debitMetrics,
        creditMetrics,
        monitoringMetrics,
        metrics: debitMetrics,
      }
    })
  }, [
    periodKeys,
    groupedAllMonitoringByPeriod,
    groupedExpenseByPeriod,
    groupedExpenseNoTransfersByPeriod,
    groupedIncomeByPeriod,
    periodMode,
    isUnlocked,
    accountFilterId,
    filterByFamilyMember,
  ])

  const selectedSnapshot =
    periodSnapshots[selectedPeriodIndex] ?? {
      key: '',
      label: 'Период',
      transactions: [],
      expenseTransactions: [],
      incomeTransactions: [],
      total: 0,
      segments: [],
      debitTotal: 0,
      creditTotal: 0,
      debitSegments: [],
      creditSegments: [],
      monitoringSegments: [],
      debitMetrics: [],
      creditMetrics: [],
      monitoringMetrics: [],
      metrics: [],
    }

  const previousSnapshot = periodSnapshots[selectedPeriodIndex - 1] ?? null

  const currentPeriodTransactions = isMonitoringMode
    ? selectedSnapshot.transactions
    : flowMode === 'debit'
      ? selectedSnapshot.expenseTransactions
      : selectedSnapshot.incomeTransactions
  const currentTotal = isMonitoringMode
    ? selectedSnapshot.creditTotal - selectedSnapshot.debitTotal
    : flowMode === 'credit'
      ? selectedSnapshot.creditTotal
      : selectedSnapshot.debitTotal
  const previousTotal = isMonitoringMode
    ? (previousSnapshot?.creditTotal ?? 0) - (previousSnapshot?.debitTotal ?? 0)
    : flowMode === 'credit'
      ? (previousSnapshot?.creditTotal ?? 0)
      : (previousSnapshot?.debitTotal ?? 0)
  const periodChange =
    previousTotal !== 0 ? roundPercent(((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100) : 0

  const chartSegments = isMonitoringMode
    ? selectedSnapshot.monitoringSegments
    : flowMode === 'credit'
      ? selectedSnapshot.creditSegments
      : selectedSnapshot.debitSegments

  const categorySheetOperations = useMemo(() => {
    if (!categorySheet.open || !categorySheet.category || !isUnlocked) {
      return []
    }
    if (categorySheet.category === 'card_balance') {
      return []
    }
    const pool = isMonitoringMode
      ? selectedSnapshot.transactions
      : flowMode === 'credit'
        ? selectedSnapshot.incomeTransactions
        : selectedSnapshot.expenseTransactions
    const segMode = isMonitoringMode ? 'monitoring' : flowMode === 'credit' ? 'credit' : 'debit'
    const filtered = filterTransactionsByMonitoringSegment(pool, categorySheet.category, segMode)
    return [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [
    categorySheet.open,
    categorySheet.category,
    flowMode,
    isMonitoringMode,
    isUnlocked,
    selectedSnapshot.expenseTransactions,
    selectedSnapshot.incomeTransactions,
    selectedSnapshot.transactions,
  ])

  const isTransitioning = ringTransition != null
  const hasPrevPeriod = selectedPeriodIndex > 0
  const hasNextPeriod = selectedPeriodIndex < periodKeys.length - 1
  const canGoPrev = !isTransitioning && hasPrevPeriod
  const canGoNext = !isTransitioning && hasNextPeriod
  const showDesktopArrows = !useSwipeNavigation

  const startPeriodTransition = (targetIndex) => {
    if (
      ringTransition != null ||
      targetIndex < 0 ||
      targetIndex >= periodKeys.length ||
      targetIndex === selectedPeriodIndex
    ) {
      return
    }

    const direction = targetIndex > selectedPeriodIndex ? -1 : 1
    setRingTransition({
      fromIndex: selectedPeriodIndex,
      toIndex: targetIndex,
      direction,
      active: false,
    })

    if (transitionFrameRef.current != null) {
      cancelAnimationFrame(transitionFrameRef.current)
    }

    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionFrameRef.current = requestAnimationFrame(() => {
        setRingTransition((current) => (current ? { ...current, active: true } : current))
      })
    })

    if (transitionTimeoutRef.current != null) {
      clearTimeout(transitionTimeoutRef.current)
    }

    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedPeriodKey(periodKeys[targetIndex] ?? null)
      setRingTransition(null)
      transitionTimeoutRef.current = null
    }, MONTH_SWITCH_DURATION_MS)
  }

  const goPrevPeriod = () => {
    if (!canGoPrev) {
      return
    }

    startPeriodTransition(selectedPeriodIndex - 1)
  }

  const goNextPeriod = () => {
    if (!canGoNext) {
      return
    }

    startPeriodTransition(selectedPeriodIndex + 1)
  }

  const swipeStartRef = useRef({ x: 0, y: 0, active: false })

  const handleChartTouchStart = (event) => {
    if (!useSwipeNavigation) {
      return
    }

    const touch = event.changedTouches?.[0]

    if (!touch) {
      return
    }

    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      active: true,
    }
  }

  const handleChartTouchEnd = (event) => {
    if (!useSwipeNavigation || !swipeStartRef.current.active) {
      return
    }

    const touch = event.changedTouches?.[0]

    if (!touch) {
      swipeStartRef.current.active = false
      return
    }

    const deltaX = touch.clientX - swipeStartRef.current.x
    const deltaY = touch.clientY - swipeStartRef.current.y
    swipeStartRef.current.active = false

    const horizontalThreshold = 44
    const mostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2

    if (Math.abs(deltaX) < horizontalThreshold || !mostlyHorizontal) {
      return
    }

    if (deltaX < 0 && canGoNext) {
      goNextPeriod()
      return
    }

    if (deltaX > 0 && canGoPrev) {
      goPrevPeriod()
    }
  }

  const periodLabel = selectedSnapshot.label
  const amountValue = isUnlocked ? String(Math.round(currentTotal)) : '•••••••'
  const changeValue = isUnlocked ? `${periodChange >= 0 ? '+' : ''}${periodChange}%` : '•••%'
  const isPositiveChange = !changeValue.startsWith('-')
  const changeBadgeKind = !isUnlocked
    ? 'masked'
    : isMonitoringMode
      ? isPositiveChange
        ? 'down'
        : 'up'
      : flowMode === 'debit'
      ? isPositiveChange
        ? 'up'
        : 'down'
      : isPositiveChange
        ? 'down'
        : 'up'

  const visibleSegments = isUnlocked ? chartSegments : []
  const historyOperations = isUnlocked
    ? [...currentPeriodTransactions]
        .filter((transaction) =>
          isMonitoringMode
            ? transaction.direction === 'out' || transaction.direction === 'in'
            : flowMode === 'debit'
              ? transaction.direction === 'out'
              : transaction.direction === 'in',
        )
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    : []

  const historyMovementDetail = useMemo(() => {
    if (!historyDetailMovementId) return null
    const op = TRANSACTIONS.find((t) => t.id === historyDetailMovementId)
    if (!op) return null
    const card = buildMonitoringCardForHistory(op.accountId)
    const raw = getMergedRawMovementsForCard(card, linkedDepositMovements)
    const allMovements = withBalanceAfter(card, raw)
    const movement = allMovements.find((m) => m.id === op.id) ?? { ...op }
    return { card, movement, allMovements }
  }, [historyDetailMovementId, linkedDepositMovements])

  const historySectionTitle = 'Операции'

  useEffect(() => {
    setHistorySheetOpen(false)
    setCategorySheet({ open: false, category: null, label: '' })
  }, [selectedPeriodIndex])

  useEffect(() => {
    if (!isMonitoringMode || embedded || location.state?.focusMonitoringDiagram !== true) {
      return undefined
    }
    let cancelled = false
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (cancelled) return
        const el = monitoringDiagramAnchorRef.current
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        navigate(
          { pathname: location.pathname, search: location.search, hash: location.hash },
          { replace: true, state: {} },
        )
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [embedded, isMonitoringMode, location.hash, location.key, location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (!historySheetOpen) {
      setHistoryDetailMovementId(null)
    }
  }, [historySheetOpen])

  const debitMiniBar = useMemo(
    () =>
      normalizeMiniBarFillPercents(
        selectedSnapshot.debitSegments.filter((segment) => segment.category !== 'card_balance'),
      ),
    [selectedSnapshot.key, selectedSnapshot.debitSegments],
  )
  const creditMiniBar = useMemo(
    () =>
      normalizeMiniBarFillPercents(
        selectedSnapshot.creditSegments.filter((segment) => segment.category !== 'card_balance'),
      ),
    [selectedSnapshot.key, selectedSnapshot.creditSegments],
  )

  const transitionFromSnapshot = ringTransition
    ? periodSnapshots[ringTransition.fromIndex] ?? selectedSnapshot
    : null
  const transitionToSnapshot = ringTransition
    ? periodSnapshots[ringTransition.toIndex] ?? selectedSnapshot
    : null

  const ringMetricsForSnapshot = (snap) => {
    if (!snap || !isUnlocked) {
      return []
    }
    if (isMonitoringMode) {
      return snap.monitoringMetrics ?? []
    }
    if (flowMode === 'credit') {
      return snap.creditMetrics ?? []
    }
    return snap.debitMetrics ?? []
  }

  /** Ужатый вид только в нижнем листе; на /family — те же отступы, что у полной страницы. */
  const sheetTightEmbed = Boolean(embedded && !embeddedInline)
  const familyShellEmbed = Boolean(embedded && embeddedInline && embeddedInlineContained)

  const transitionEase = useSwipeNavigation ? 'cubic-bezier(0.78, 0.02, 0.96, 0.32)' : 'linear'
  const sidePreviewShift = ringTransition?.active ? ringTransition.direction * 74 : 0
  const sidePreviewOpacity = ringTransition?.active ? 0.3 : 0.45
  const sidePreviewTransition = `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`

  const renderRingLayer = (snapshot, layerKey, layerStyle, layerMetrics) => {
    const layerMetricsResolved = layerMetrics ?? []
    const layerMonthLabel = snapshot?.label ?? 'Период'
    const arcRenderMetrics = [...layerMetricsResolved].sort((a, b) => a.startDeg - b.startDeg)
    const maxPercentValue =
      layerMetricsResolved.reduce((max, segment) => Math.max(max, segment.percent), 0) || 1

    return (
      <div
        key={layerKey}
        className="absolute inset-0"
        style={{
          ...layerStyle,
          willChange: 'transform, opacity',
        }}
      >
        <svg className="absolute inset-0" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="160"
              cy="160"
              r={MAIN_RING_RADIUS}
              fill="none"
              stroke="#15273a"
              strokeOpacity="0.9"
              strokeLinecap="round"
              strokeWidth={MAIN_RING_STROKE_WIDTH}
            />

          {arcRenderMetrics.map((segment) =>
            segment.showArc ? (
              <path
                key={`${layerKey}-arc-${segment.category}`}
                d={segment.arcPath}
                fill="none"
                stroke={segment.color}
                strokeWidth={MAIN_RING_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 10px ${segment.color}33)` }}
              />
            ) : null,
          )}

        </svg>

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#071425]"
          style={{
            height: `${DONUT_HOLE_SIZE}px`,
            width: `${DONUT_HOLE_SIZE}px`,
          }}
        />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span
            className={`font-headline font-extrabold leading-snug text-[#d6e3ff] ${
              periodMode === 'week' ? 'max-w-[12.5rem] text-base sm:text-lg' : 'text-2xl'
            }`}
          >
            {layerMonthLabel}
          </span>
        </div>

        {layerMetricsResolved.map((segment) =>
          segment.showPercent ? (
            <div
              key={`${layerKey}-percent-${segment.category}`}
              className="absolute font-medium tracking-tight text-[#95a2b1]"
              style={{
                left: `${segment.labelX}px`,
                top: `${segment.adjustedLabelY}px`,
                transform: 'translate(-50%, -50%)',
                width: `${PERCENT_LABEL_BOX_WIDTH}px`,
                textAlign: 'center',
                lineHeight: 1,
                fontSize: `calc(clamp(12px, 1.45vw, 17.5px) * ${(1 + Math.min(1, segment.percent / maxPercentValue) * 0.1).toFixed(3)})`,
              }}
            >
              {segment.percent}%
            </div>
          ) : null,
        )}

        {[...layerMetricsResolved]
          .sort((a, b) => {
            const aCard = a.category === 'card_balance'
            const bCard = b.category === 'card_balance'
            if (aCard !== bCard) {
              return aCard ? 1 : -1
            }
            return (a.iconAngleDeg ?? a.endDeg) - (b.iconAngleDeg ?? b.endDeg)
          })
          .map((segment, badgeIndex) => (
            <div
              key={`${layerKey}-badge-${segment.category}`}
              className="absolute flex items-center justify-center rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${segment.iconX}px`,
                top: `${segment.iconY}px`,
                width: `${ICON_BADGE_DIAMETER}px`,
                height: `${ICON_BADGE_DIAMETER}px`,
                backgroundColor: segment.color,
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.12)`,
                zIndex: 30 + badgeIndex,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: `${ICON_BADGE_GLYPH}px`,
                  lineHeight: 1,
                  color: 'rgba(255, 255, 255, 0.98)',
                  textShadow:
                    '0 0 1px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 8px rgba(0, 0, 0, 0.25)',
                  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
                }}
              >
                {segment.icon}
              </span>
            </div>
          ))}
      </div>
    )
  }

  return (
    <div
      className={
        embedded
          ? 'w-full min-w-0 min-h-0 text-[#d6e3ff]'
          : 'min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]'
      }
      style={embedded ? undefined : { minHeight: '100dvh' }}
    >
      {!embedded ? <AppTopBar /> : null}

      <main
        className={
          embeddedInline
            ? embeddedInlineContained
              ? 'mx-auto w-full max-w-full px-0 pb-0 pt-0'
              : 'mx-auto w-full max-w-full px-0 pb-8 pt-0'
            : embedded
              ? 'mx-auto max-w-5xl px-4 pb-8 pt-1'
              : 'mx-auto mt-20 max-w-5xl px-6 pb-32'
        }
      >
        {!isUnlocked ? (
          <div className="mb-6 rounded-2xl border border-[#4cd6fb]/20 bg-[#112036]/80 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#bcc9ce]">
            Аналитика скрыта до разблокировки
          </div>
        ) : null}

        {!embedded ? (
          <section className="mb-8">
            <div className="mb-2 flex items-center justify-between gap-3 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#d6e3ff]">
              <h1 className="min-w-0 flex-1">
                {isMonitoringMode ? 'Мониторинг' : flowMode === 'debit' ? 'Затраты' : 'Поступления'}
              </h1>
              {!isMonitoringMode ? (
                <SubpageCloseButton />
              ) : null}
            </div>
            <p className="text-sm font-normal text-[#bcc9ce]">
              {isMonitoringMode
                ? 'Диаграмма расходов и доходов с категориями, остатком на карте и операциями'
                : flowMode === 'debit'
                  ? 'Динамика трат по месяцам с категориями и историей операций'
                  : 'Динамика поступлений по месяцам с категориями и историей операций'}
            </p>
          </section>
        ) : null}

        {embedded && !embeddedInline && isMonitoringMode && typeof onEmbeddedClose === 'function' ? (
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3 font-headline text-2xl font-extrabold leading-tight tracking-tight text-[#d6e3ff] sm:text-3xl">
              <h2 className="min-w-0 flex-1">Аналитика вкладов</h2>
              <SubpageCloseButton ariaLabel="Закрыть" onClose={onEmbeddedClose} />
            </div>
            <p className="text-sm font-normal text-[#bcc9ce]">
              Диаграмма расходов и доходов с категориями, остатком на карте и операциями
            </p>
          </section>
        ) : null}

        {isMonitoringMode && !embedded ? (
          <section className="mb-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/cost')}
                className="min-w-0 overflow-hidden rounded-2xl bg-[#0d1c32] px-3 py-3 text-left transition hover:bg-[#112036] active:scale-[0.99] sm:px-4 sm:py-3.5"
              >
                <div className="min-w-0 text-xl font-extrabold leading-tight tracking-tight text-[#d6e3ff] sm:text-2xl">
                  <UzsAmount
                    as="span"
                    className="block min-w-0 break-words"
                    compact
                    compactFrom={1_000_000}
                    value={String(Math.round(selectedSnapshot.debitTotal))}
                  />
                </div>
                <div className="mt-2 text-base font-semibold text-[#d6e3ff] sm:text-[1.05rem]">Затраты</div>
                <div className="mt-2.5 flex h-3.5 w-full min-w-0 overflow-hidden rounded-full sm:h-4">
                  {debitMiniBar.map((segment) => (
                    <span
                      key={`mini-debit-${segment.category}`}
                      style={{
                        backgroundColor: segment.color,
                        width: `${segment.fillPct}%`,
                      }}
                    />
                  ))}
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/income')}
                className="min-w-0 overflow-hidden rounded-2xl bg-[#0d1c32] px-3 py-3 text-left transition hover:bg-[#112036] active:scale-[0.99] sm:px-4 sm:py-3.5"
              >
                <div className="min-w-0 text-xl font-extrabold leading-tight tracking-tight text-[#d6e3ff] sm:text-2xl">
                  <UzsAmount
                    as="span"
                    className="block min-w-0 break-words"
                    compact
                    compactFrom={1_000_000}
                    value={String(Math.round(selectedSnapshot.creditTotal))}
                  />
                </div>
                <div className="mt-2 text-base font-semibold text-[#d6e3ff] sm:text-[1.05rem]">Поступления</div>
                <div className="mt-2.5 flex h-3.5 w-full min-w-0 overflow-hidden rounded-full sm:h-4">
                  {creditMiniBar.map((segment) => (
                    <span
                      key={`mini-credit-${segment.category}`}
                      style={{
                        backgroundColor: segment.color,
                        width: `${segment.fillPct}%`,
                      }}
                    />
                  ))}
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl bg-[#0d1c32] px-4 py-4 text-left text-base font-bold text-[#d6e3ff] transition hover:bg-[#112036]"
                onClick={() => navigate('/family')}
              >
                <span>Семейная группа</span>
                <span className="material-symbols-outlined text-[#4cd6fb]">family_restroom</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl bg-[#0d1c32] px-4 py-4 text-left text-base font-bold text-[#d6e3ff] transition hover:bg-[#112036]"
                onClick={() => navigate('/goal')}
              >
                <span>Цель</span>
                <span className="material-symbols-outlined text-[#4cd6fb]">track_changes</span>
              </button>
            </div>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-between rounded-2xl bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] px-4 py-4 text-left text-base font-bold text-[#003642] shadow-[0_12px_30px_rgba(0,180,216,0.24)] transition hover:brightness-110 active:scale-[0.99]"
              onClick={() => navigate('/advice-ai', { state: { from: '/monitoring' } })}
            >
              <span>Ваш персональный помощник AI</span>
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
          </section>
        ) : null}

        <section
          className={
            familyShellEmbed
              ? 'mb-0 bg-transparent p-0'
              : sheetTightEmbed
                ? 'mb-6 rounded-2xl bg-[#0d1c32] p-4 md:p-5'
                : 'mb-8 rounded-[32px] bg-[#0d1c32] p-6 md:p-8'
          }
        >
          {isUnlocked ? (
            <div className="mb-5 grid max-w-[min(100%,26rem)] grid-cols-2 gap-2.5 sm:mb-6">
              <div ref={accountFilterDropdownRef} className="relative min-w-0">
                <label className="sr-only" htmlFor="monitoring-account-filter-trigger">
                  {filterByFamilyMember ? 'Участник семейной группы' : 'Счета и карты'}
                </label>
                <button
                  aria-controls="monitoring-account-filter-listbox"
                  aria-expanded={accountFilterMenuOpen}
                  aria-haspopup="listbox"
                  className="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 rounded-full border border-[#2f3d52] bg-[#151d2e] px-3 text-left text-sm font-medium text-[#d6e3ff] outline-none transition-colors hover:border-[#3d4f6a] focus-visible:border-[#4cd6fb]/40"
                  id="monitoring-account-filter-trigger"
                  type="button"
                  onClick={() => {
                    setAccountFilterMenuOpen((open) => !open)
                    setTransferFilterMenuOpen(false)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {accountFilterOptions.find((o) => o.id === accountFilterId)?.label ??
                      (filterByFamilyMember ? 'Участник' : 'Счёт')}
                  </span>
                  <span
                    aria-hidden
                    className={`material-symbols-outlined shrink-0 text-[#8b9cb0] transition-transform ${
                      accountFilterMenuOpen ? 'rotate-180' : ''
                    }`}
                    style={{ fontSize: '1.125rem' }}
                  >
                    expand_more
                  </span>
                </button>
                {accountFilterMenuMounted ? (
                  <div
                    className={`absolute left-0 top-[calc(100%+0.375rem)] z-50 w-[calc(200%+0.625rem-2.75rem)] max-w-[min(calc(200%+0.625rem-2.75rem),calc(100vw-2rem))] isolate origin-top overflow-hidden rounded-2xl border border-white/12 bg-[#0f1828]/92 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] supports-[backdrop-filter]:bg-[#0f1828]/78 ${
                      accountFilterMenuEntered
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
                    }`}
                  >
                    <ul
                      className="m-0 max-h-[min(20rem,50vh)] list-none overflow-y-auto overscroll-contain py-0"
                      id="monitoring-account-filter-listbox"
                      role="listbox"
                    >
                      {accountFilterOptions.map((option) => {
                        const selected = option.id === accountFilterId
                        return (
                          <li key={option.id} className="m-0 p-0" role="presentation">
                            <button
                              aria-selected={selected}
                              className={`flex w-full items-center px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                                selected
                                  ? 'bg-[#4cd6fb]/22 text-[#eaf8ff]'
                                  : 'text-[#d6e3ff] hover:bg-white/5'
                              }`}
                              role="option"
                              type="button"
                              onClick={() => {
                                setAccountFilterId(option.id)
                                setAccountFilterMenuOpen(false)
                                setSelectedPeriodKey(null)
                              }}
                            >
                              <span className="truncate">{option.label}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div ref={transferFilterDropdownRef} className="relative min-w-0">
                <div
                  className={`flex h-11 w-full min-w-0 items-center rounded-full border text-sm font-medium ${
                    transferExclusionMode != null
                      ? 'border-[#3d556d] bg-[#1a2434] text-[#d6e3ff]'
                      : 'border-[#2f3d52] bg-[#151d2e] text-[#9fb2c4]'
                  }`}
                >
                  <button
                    aria-controls="monitoring-transfer-filter-listbox"
                    aria-expanded={transferFilterMenuOpen}
                    aria-haspopup="listbox"
                    className="flex min-w-0 flex-1 items-center gap-1 pl-3 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#4cd6fb]/30"
                    id="monitoring-transfer-filter-trigger"
                    type="button"
                    onClick={() => {
                      setTransferFilterMenuOpen((open) => !open)
                      setAccountFilterMenuOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {transferExclusionMode === 'all'
                        ? 'Без всех переводов'
                        : transferExclusionMode === 'others'
                          ? 'Без перевода другим людям'
                          : transferExclusionMode === 'household'
                            ? 'Без переводов в семье'
                            : 'С переводами'}
                    </span>
                    <span
                      aria-hidden
                      className={`material-symbols-outlined shrink-0 text-[#8b9cb0] transition-transform ${
                        transferFilterMenuOpen ? 'rotate-180' : ''
                      }`}
                      style={{ fontSize: '1.125rem' }}
                    >
                      expand_more
                    </span>
                  </button>
                  {transferExclusionMode != null ? (
                    <button
                      aria-label="Показать все переводы в аналитике"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] transition-colors hover:bg-white/10 hover:text-white"
                      type="button"
                      onClick={() => {
                        setTransferExclusionMode(null)
                        setTransferFilterMenuOpen(false)
                        setSelectedPeriodKey(null)
                      }}
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">close</span>
                    </button>
                  ) : null}
                </div>
                {transferFilterMenuMounted ? (
                  <div
                    className={`absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(100%,18rem)] isolate origin-top-right overflow-hidden rounded-2xl border border-white/12 bg-[#0f1828]/92 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] supports-[backdrop-filter]:bg-[#0f1828]/78 ${
                      transferFilterMenuEntered
                        ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
                    }`}
                  >
                    <ul
                      className="m-0 max-h-[min(20rem,50vh)] list-none overflow-y-auto overscroll-contain py-0"
                      id="monitoring-transfer-filter-listbox"
                      role="listbox"
                    >
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'household'}
                        className={`flex w-full items-start px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'household'
                            ? 'bg-[#4cd6fb]/22 text-[#eaf8ff]'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('household')
                          setTransferFilterMenuOpen(false)
                          setSelectedPeriodKey(null)
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">Без переводов</span>
                          <span className="block text-[0.92em] opacity-90">в семье</span>
                        </span>
                      </button>
                    </li>
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'others'}
                        className={`flex w-full items-start px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'others'
                            ? 'bg-[#4cd6fb]/22 text-[#eaf8ff]'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('others')
                          setTransferFilterMenuOpen(false)
                          setSelectedPeriodKey(null)
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">Без перевода</span>
                          <span className="block text-[0.92em] opacity-90">другим людям</span>
                        </span>
                      </button>
                    </li>
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'all'}
                        className={`flex w-full items-start px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'all'
                            ? 'bg-[#4cd6fb]/22 text-[#eaf8ff]'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('all')
                          setTransferFilterMenuOpen(false)
                          setSelectedPeriodKey(null)
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">Без всех</span>
                          <span className="block text-[0.92em] opacity-90">переводов</span>
                        </span>
                      </button>
                    </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            ref={isMonitoringMode && !embedded ? monitoringDiagramAnchorRef : undefined}
            id={isMonitoringMode && !embedded ? 'monitoring-diagram' : undefined}
            className={`relative mx-auto max-w-[620px] ${isMonitoringMode && !embedded ? 'scroll-mt-28 sm:scroll-mt-32' : ''}`}
            onTouchEnd={handleChartTouchEnd}
            onTouchStart={handleChartTouchStart}
            style={useSwipeNavigation ? { touchAction: 'pan-y' } : undefined}
          >
            {showDesktopArrows ? (
              <>
                <button
                  aria-label="Предыдущий период"
                  className={`absolute left-0 top-[38%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border transition-all md:-translate-x-1/2 ${
                    canGoPrev
                      ? 'border-[#4cd6fb]/25 bg-[#112036] text-[#4cd6fb] hover:bg-[#1c2a41] active:scale-95'
                      : 'cursor-not-allowed border-[#27354c] bg-[#112036]/40 text-[#546074]'
                  }`}
                  disabled={!canGoPrev}
                  onClick={goPrevPeriod}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <button
                  aria-label="Следующий период"
                  className={`absolute right-0 top-[38%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border transition-all md:translate-x-1/2 ${
                    canGoNext
                      ? 'border-[#4cd6fb]/25 bg-[#112036] text-[#4cd6fb] hover:bg-[#1c2a41] active:scale-95'
                      : 'cursor-not-allowed border-[#27354c] bg-[#112036]/40 text-[#546074]'
                  }`}
                  disabled={!canGoNext}
                  onClick={goNextPeriod}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
              ) : null}

              {hasPrevPeriod ? (
                <div
                  className="pointer-events-none absolute top-1/2 z-0"
                  style={{
                    left: `${SIDE_PREVIEW_OFFSET}px`,
                    height: `${SIDE_PREVIEW_SIZE}px`,
                    width: `${SIDE_PREVIEW_SIZE}px`,
                    transform: `translateY(-50%) translateX(${sidePreviewShift}px)`,
                    opacity: sidePreviewOpacity,
                    transition: sidePreviewTransition,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full bg-[#6d7688]/65"
                    style={{
                      WebkitMask: SIDE_RING_MASK,
                      mask: SIDE_RING_MASK,
                    }}
                  />
                </div>
              ) : null}

              {hasNextPeriod ? (
                <div
                  className="pointer-events-none absolute top-1/2 z-0"
                  style={{
                    right: `${SIDE_PREVIEW_OFFSET}px`,
                    height: `${SIDE_PREVIEW_SIZE}px`,
                    width: `${SIDE_PREVIEW_SIZE}px`,
                    transform: `translateY(-50%) translateX(${sidePreviewShift}px)`,
                    opacity: sidePreviewOpacity,
                    transition: sidePreviewTransition,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full bg-[#6d7688]/65"
                    style={{
                      WebkitMask: SIDE_RING_MASK,
                      mask: SIDE_RING_MASK,
                    }}
                  />
                </div>
              ) : null}

            <div
              className="relative z-10 mx-auto mb-6 h-[320px] w-[320px]"
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(124,214,255,0.18)_0%,_rgba(7,18,34,0.02)_62%,_transparent_100%)] blur-xl" />

              {ringTransition && transitionFromSnapshot
                ? renderRingLayer(
                    transitionFromSnapshot,
                    'ring-outgoing',
                    {
                      transform: ringTransition.active
                        ? `translateX(${ringTransition.direction * 156}px) scale(0.92)`
                        : 'translateX(0px) scale(1)',
                      opacity: ringTransition.active ? 0 : 1,
                      transition: `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`,
                    },
                    ringMetricsForSnapshot(transitionFromSnapshot),
                  )
                : null}

              {ringTransition && transitionToSnapshot
                ? renderRingLayer(
                    transitionToSnapshot,
                    'ring-incoming',
                    {
                      transform: ringTransition.active
                        ? 'translateX(0px) scale(1)'
                        : `translateX(${-ringTransition.direction * 156}px) scale(0.92)`,
                      opacity: ringTransition.active ? 1 : 0,
                      transition: `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`,
                    },
                    ringMetricsForSnapshot(transitionToSnapshot),
                  )
                : null}

              {!ringTransition
                ? renderRingLayer(
                    selectedSnapshot,
                    'ring-current',
                    {
                      transform: 'translateX(0px) scale(1)',
                      opacity: 1,
                    },
                    ringMetricsForSnapshot(selectedSnapshot),
                  )
                : null}
            </div>

            <div className="mb-3 flex min-w-0 flex-wrap items-end justify-center gap-4 sm:gap-5 md:gap-6">
              <h2 className="min-w-0 max-w-full text-center text-4xl font-extrabold leading-none tracking-tight text-[#d6e3ff] sm:text-5xl md:text-5xl lg:text-6xl">
                <UzsAmount
                  as="span"
                  compact
                  compactFrom={1_000_000}
                  currencyPlacement="below"
                  value={amountValue}
                />
              </h2>
              <p
                className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-bold sm:text-base md:px-3 md:py-1.5 md:text-lg ${
                  changeBadgeKind === 'masked'
                    ? 'text-[#9fb2c4]'
                    : changeBadgeKind === 'down'
                      ? 'text-[#58d6f1]'
                      : 'text-[#ffb4ab]'
                }`}
                style={{
                  borderColor:
                    changeBadgeKind === 'masked'
                      ? 'rgba(159, 178, 196, 0.35)'
                      : changeBadgeKind === 'down'
                        ? 'rgba(88, 214, 241, 0.35)'
                        : 'rgba(255, 180, 171, 0.35)',
                  backgroundColor:
                    changeBadgeKind === 'masked'
                      ? 'rgba(159, 178, 196, 0.08)'
                      : changeBadgeKind === 'down'
                        ? 'rgba(88, 214, 241, 0.08)'
                        : 'rgba(255, 180, 171, 0.08)',
                }}
              >
                {changeValue}
              </p>
            </div>

            <div className="mb-3 flex justify-center">
              <div className="inline-grid grid-cols-3 gap-1 rounded-full bg-[#1b2433] p-1">
                {PERIOD_FILTER_OPTIONS.map((option) => {
                  const isActive = option.id === periodMode
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`rounded-full px-9 py-1 text-base font-bold transition ${
                        isActive
                          ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                          : 'text-[#bcc9ce] hover:text-white'
                      }`}
                      onClick={() => {
                        if (periodMode === option.id) {
                          return
                        }
                        setPeriodMode(option.id)
                        setSelectedPeriodKey(null)
                        setRingTransition(null)
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {isMonitoringMode ? (
              <div className="mb-3 grid w-full min-w-0 grid-cols-2 items-stretch gap-2">
                <span className="flex min-w-0 items-center justify-center rounded-full border border-[#58d6f1]/30 bg-[#58d6f1]/10 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[#9cecff] sm:px-3 sm:text-xs">
                  <span className="min-w-0 whitespace-normal break-words">
                    Затраты:{' '}
                    <UzsAmount
                      as="span"
                      compact
                      compactFrom={1_000_000}
                      value={String(Math.round(selectedSnapshot.debitTotal))}
                    />
                  </span>
                </span>
                <span className="flex min-w-0 items-center justify-center rounded-full border border-[#4cd6fb]/30 bg-[#4cd6fb]/10 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[#8de4ff] sm:px-3 sm:text-xs">
                  <span className="min-w-0 whitespace-normal break-words">
                    Поступления:{' '}
                    <UzsAmount
                      as="span"
                      compact
                      compactFrom={1_000_000}
                      value={String(Math.round(selectedSnapshot.creditTotal))}
                    />
                  </span>
                </span>
              </div>
            ) : null}

          </div>

          {visibleSegments.length > 0 ? (
            <div className="mt-8 grid w-full grid-cols-2 gap-1.5 sm:gap-2 md:gap-2.5">
              {visibleSegments.map((segment) => {
                const listIcon = CATEGORY_ICON_MAP[segment.category] || CATEGORY_ICON_MAP.other
                const isCardBalance = segment.category === 'card_balance'
                const categoryClickable = isUnlocked && !isCardBalance

                return (
                  <button
                    key={segment.category}
                    type="button"
                    disabled={!categoryClickable}
                    aria-label={
                      isCardBalance
                        ? 'Остаток на картах — не список операций'
                        : `Операции: ${segment.label}`
                    }
                    className={`grid min-h-[2.625rem] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0 rounded-full border py-1 pl-1 pr-1.5 text-left transition-[transform,opacity] sm:min-h-[2.75rem] sm:gap-x-1.5 sm:py-1.5 sm:pl-1.5 sm:pr-2 ${
                      categoryClickable
                        ? 'cursor-pointer active:scale-[0.99] hover:brightness-110'
                        : 'cursor-default opacity-80'
                    } disabled:pointer-events-none disabled:opacity-60`}
                    style={{
                      borderColor: `${segment.color}50`,
                      background: `linear-gradient(95deg, ${segment.color}22 0%, rgba(17,32,54,0.9) 42%, rgba(17,28,46,0.94) 100%)`,
                      boxShadow: `inset 0 1px 0 ${segment.color}18`,
                    }}
                    onClick={() => {
                      if (!categoryClickable) return
                      setHistorySheetOpen(false)
                      setCategorySheet({
                        open: true,
                        category: segment.category,
                        label: segment.label,
                      })
                    }}
                  >
                    <span
                      className="relative flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: `${ICON_BADGE_DIAMETER}px`,
                        height: `${ICON_BADGE_DIAMETER}px`,
                        backgroundColor: segment.color,
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.2) inset`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined pointer-events-none leading-none text-white"
                        style={{
                          fontSize: `${ICON_BADGE_GLYPH}px`,
                          lineHeight: 1,
                          fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
                          textShadow:
                            '0 0 1px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 8px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {listIcon}
                      </span>
                    </span>

                    <span
                      lang="ru"
                      className="min-w-0 hyphens-auto break-words text-left text-[11px] font-medium leading-[1.2] tracking-tight text-[#e8eef9] [overflow-wrap:anywhere] line-clamp-2 sm:text-[12px] md:text-[13px]"
                    >
                      {segment.category === 'currency_purchase' ? (
                        <>
                          <span className="block leading-[1.15]">Покупка</span>
                          <span className="block leading-[1.15] text-[#bcc9ce]">валюта</span>
                        </>
                      ) : (
                        segment.label
                      )}
                    </span>

                    <div className="shrink-0 justify-self-end whitespace-nowrap text-right text-[10px] font-semibold leading-none tabular-nums text-[#e8eef9] sm:text-[11px] md:text-xs">
                      <UzsAmount
                        as="span"
                        className="inline-flex items-baseline leading-none"
                        compact
                        compactFrom={1_000_000}
                        currencyClassName="inline-block shrink-0 align-baseline font-semibold uppercase tracking-[0.12em] text-[#aab8ce]"
                        value={String(Math.round(segment.amount))}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>

        <section
          className={
            familyShellEmbed
              ? 'mt-8 border-t border-white/10 bg-transparent p-0 pt-8'
              : sheetTightEmbed
                ? 'rounded-2xl bg-[#0d1c32] p-4 md:p-5'
                : 'rounded-[32px] bg-[#0d1c32] p-6 md:p-8'
          }
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 pr-1">
              <h2 className="text-xl font-bold text-[#d6e3ff]">{historySectionTitle}</h2>
              <p className="mt-2 text-sm leading-snug text-[#869398]">
                <span className="text-xs uppercase tracking-[0.14em]">{periodLabel}</span>
                {isUnlocked ? (
                  <>
                    {' '}
                    ·{' '}
                    {historyOperations.length > 0
                      ? ruOperationsCountLabel(historyOperations.length)
                      : 'нет операций'}
                  </>
                ) : (
                  <> · Операции скрыты до разблокировки</>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={!isUnlocked}
              aria-label={isUnlocked ? 'Открыть список операций' : 'Операции недоступны'}
              className={`${SUBPAGE_CLOSE_BUTTON_CLASS} shrink-0 self-center disabled:pointer-events-none disabled:opacity-40`}
              onClick={() => {
                setCategorySheet({ open: false, category: null, label: '' })
                setHistorySheetOpen(true)
              }}
            >
              <span
                className="material-symbols-outlined leading-none text-[#4cd6fb]"
                style={{
                  fontSize: 'clamp(1.625rem, 4.2vw, 1.875rem)',
                  fontVariationSettings: '"FILL" 0, "wght" 600',
                }}
              >
                arrow_forward
              </span>
            </button>
          </div>
        </section>
      </main>

      {!embedded ? <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} /> : null}

      <OperationsHistorySheet
        open={historySheetOpen}
        onClose={() => setHistorySheetOpen(false)}
        title={historySectionTitle}
        periodLabel={periodLabel}
        operations={historyOperations}
        onSelectOperation={(op) => setHistoryDetailMovementId(op.id)}
        overlayZIndexClass="z-[120]"
      />

      <OperationsHistorySheet
        open={categorySheet.open}
        onClose={() => setCategorySheet({ open: false, category: null, label: '' })}
        title={categorySheet.label || 'Категория'}
        periodLabel={periodLabel}
        operations={categorySheetOperations}
        onSelectOperation={(op) => setHistoryDetailMovementId(op.id)}
        overlayZIndexClass="z-[125]"
      />

      {historyMovementDetail ? (
        <MovementDetailSheet
          card={historyMovementDetail.card}
          movement={historyMovementDetail.movement}
          allMovements={historyMovementDetail.allMovements}
          isUnlocked={isUnlocked}
          onClose={() => setHistoryDetailMovementId(null)}
          onOpenMovement={(m) => setHistoryDetailMovementId(m.id)}
          overlayZIndexClass="z-[130]"
        />
      ) : null}
    </div>
  )
}
