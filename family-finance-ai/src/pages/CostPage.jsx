import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav.jsx'
import AppTopBar from '../components/AppTopBar.jsx'
import UzsAmount from '../components/UzsAmount.jsx'
import {
  ACCOUNTS,
  CATEGORIES,
  LINKED_EXTERNAL_CARDS,
  PRIMARY_BANK_RECREATE,
  TRANSACTIONS,
} from '../mockData.js'
import { getMonthTransactions, getPaymentCardsTotalUzs } from '../utils.js'
import { isSessionUnlocked } from '../utils/sessionLock.js'

function toMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  return monthLabel[0].toUpperCase() + monthLabel.slice(1)
}

function toMonthDate(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function roundPercent(value) {
  return Math.round(value * 10) / 10
}

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

function isMobileDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const ua = navigator.userAgent || ''
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry/i.test(ua)
  const ipadDesktopUA = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1

  return mobileUA || ipadDesktopUA
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
  currency_purchase: 'currency_exchange',
  investments: 'trending_up',
  /** Микрозайм: «проценты» / краткосрочный заём (Material Symbols). */
  microloan: 'percent',
  income: 'savings',
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
const PERCENT_LABEL_RADIUS = 144
const PERCENT_LABEL_BOX_WIDTH = 66
/** Нулевые зазоры между дугами — кольцо замыкается без просветов. */
const RING_BOUNDARY_GAP_PERCENT = 0
const RING_SEAM_GAP_PERCENT = 0
/** Минимальная доля круга для отрисовки сегмента (реальные проценты в подписи не меняются). */
const MIN_RING_VISUAL_PERCENT = 6.5
const RING_DRAW_CLOCKWISE = true
const DONUT_HOLE_SIZE = 164
const SIDE_PREVIEW_SIZE = 204
const SIDE_PREVIEW_OFFSET = -153
const SIDE_RING_MASK = 'radial-gradient(circle, transparent 0 73px, #000 74px 101px, transparent 102px)'
const MONTH_SWITCH_DURATION_MS = 150

const MONITORING_OWNER_ID = 'user_1'
const MONITORING_PRIMARY_ACCOUNT_ID = 'acc_tbc_main'

/** Счета, вклады и привязанные карты владельца (как на /home) для фильтра диаграммы. */
function getMonitoringAccountFilterOptions() {
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
function resolveMonitoringAccountIds(filterId) {
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

/**
 * null — все переводы в аналитике;
 * 'household' — «Без переводов в семье»: скрываем переводы себе (между своими счетами) и внутри семьи;
 * 'others' — «Без перевода другим людям»: скрываем P2P и переводы на «чужие» карты;
 * 'all' — «Без всех переводов»: скрываем любые transfer_*; цели, вклад, валюту и инвестиции оставляем.
 */
function filterMonitoringExpenseTransactions(accountFilterId, transferExclusionMode) {
  const accountIds = resolveMonitoringAccountIds(accountFilterId)

  return TRANSACTIONS.filter((transaction) => {
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

    if (accountIds == null) {
      return true
    }
    if (accountIds.length === 0) {
      return false
    }
    return accountIds.includes(transaction.accountId)
  })
}

function filterMonitoringAllTransactions(accountFilterId) {
  const accountIds = resolveMonitoringAccountIds(accountFilterId)

  return TRANSACTIONS.filter((transaction) => {
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
    const labelPoint = pointOnCircle(center, center, labelRadius, centerAngleDeg)

    const startAngleDeg = toRingAngle(arcStart, RING_DRAW_CLOCKWISE)
    const endAngleDeg = toRingAngle(arcEnd, RING_DRAW_CLOCKWISE)
    const arcSweepDeg = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360
    const span = arcEnd - arcStart
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
      iconAngleDeg,
      arcSweepDeg,
      arcPath: describeArcPath(center, center, arcRadius, startAngleDeg, endAngleDeg, RING_DRAW_CLOCKWISE),
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      adjustedLabelY: labelPoint.y,
      iconX: iconPoint.x,
      iconY: iconPoint.y,
      showPercent: true,
      showArc: arcSweepDeg > 0.02,
    }
  })

  const MIN_LABEL_GAP = 22
  const rightGroup = rawMetrics.filter((m) => m.labelX >= center)
  const leftGroup = rawMetrics.filter((m) => m.labelX < center)

  function spreadLabels(group) {
    if (group.length <= 1) return
    group.sort((a, b) => a.adjustedLabelY - b.adjustedLabelY)
    for (let pass = 0; pass < 12; pass++) {
      let stable = true
      for (let i = 1; i < group.length; i++) {
        const gap = group[i].adjustedLabelY - group[i - 1].adjustedLabelY
        if (gap < MIN_LABEL_GAP) {
          const push = (MIN_LABEL_GAP - gap) / 2
          group[i - 1].adjustedLabelY -= push
          group[i].adjustedLabelY += push
          stable = false
        }
      }
      if (stable) break
    }
    group.forEach((m) => {
      m.adjustedLabelY = Math.max(8, Math.min(chartSize - 8, m.adjustedLabelY))
    })
  }

  spreadLabels(rightGroup)
  spreadLabels(leftGroup)

  return rawMetrics
}

export default function CostPage({ mode = 'debit' }) {
  const isUnlocked = isSessionUnlocked()
  const navigate = useNavigate()
  const isMonitoringMode = mode === 'monitoring'
  const flowMode = mode === 'credit' ? 'credit' : 'debit'

  const accountFilterOptions = useMemo(() => getMonitoringAccountFilterOptions(), [])
  const [accountFilterId, setAccountFilterId] = useState('all')
  /**
   * null — все переводы в аналитике;
   * 'household' — без переводов себе и внутри семьи (по умолчанию);
   * 'others' — без перевода другим людям;
   * 'all' — без всех переводов (только цели/вклад/валюта/инвестиции из «не покупок»).
   */
  const [transferExclusionMode, setTransferExclusionMode] = useState('household')
  const [accountFilterMenuOpen, setAccountFilterMenuOpen] = useState(false)
  const [transferFilterMenuOpen, setTransferFilterMenuOpen] = useState(false)
  const accountFilterDropdownRef = useRef(null)
  const transferFilterDropdownRef = useRef(null)

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
    () => filterMonitoringExpenseTransactions(accountFilterId, 'all'),
    [accountFilterId],
  )

  const expenseTransactions = useMemo(
    () => filterMonitoringExpenseTransactions(accountFilterId, transferExclusionMode),
    [accountFilterId, transferExclusionMode],
  )

  const allMonitoringTransactions = useMemo(
    () => filterMonitoringAllTransactions(accountFilterId),
    [accountFilterId],
  )

  const monthKeys = useMemo(() => {
    const unique = new Set([
      ...allMonitoringTransactions.map((t) => t.timestamp.slice(0, 7)),
      ...expenseTransactions.map((t) => t.timestamp.slice(0, 7)),
      ...expenseTransactionsNoTransfers.map((t) => t.timestamp.slice(0, 7)),
    ])
    return Array.from(unique).sort()
  }, [allMonitoringTransactions, expenseTransactions, expenseTransactionsNoTransfers])

  /** null = последний доступный месяц в текущем наборе monthKeys */
  const [selectedMonthKey, setSelectedMonthKey] = useState(null)

  const selectedMonthIndex = useMemo(() => {
    if (monthKeys.length === 0) {
      return 0
    }
    if (selectedMonthKey == null) {
      return monthKeys.length - 1
    }
    const found = monthKeys.indexOf(selectedMonthKey)
    return found >= 0 ? found : monthKeys.length - 1
  }, [monthKeys, selectedMonthKey])

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

  const monthSnapshots = useMemo(() => {
    return monthKeys.map((monthKey) => {
      const monthDate = toMonthDate(monthKey)
      const transactions = getMonthTransactions(allMonitoringTransactions, monthDate)
      const expenseTransactionsForMonth = getMonthTransactions(expenseTransactions, monthDate)
      const transactionsNoTf = getMonthTransactions(expenseTransactionsNoTransfers, monthDate)

      const totalsCurrent = aggregateMonitoringOutflow(expenseTransactionsForMonth)
      const totalsNoTf = aggregateMonitoringOutflow(transactionsNoTf)
      const totalsCredit = aggregateMonitoringInflow(transactions)
      const cardBalance = getPaymentCardsTotalUzs(
        MONITORING_OWNER_ID,
        ACCOUNTS,
        LINKED_EXTERNAL_CARDS,
      )

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
            Array.from(new Set([...Object.keys(totalsCurrent), ...Object.keys(totalsCredit)])).map(
              (key) => [key, (totalsCurrent[key] || 0) + (totalsCredit[key] || 0)],
            ),
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
        key: monthKey,
        label: toMonthLabel(monthKey),
        date: monthDate,
        transactions,
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
    monthKeys,
    allMonitoringTransactions,
    expenseTransactions,
    expenseTransactionsNoTransfers,
    isUnlocked,
  ])

  const selectedSnapshot =
    monthSnapshots[selectedMonthIndex] ?? {
      key: '',
      label: 'Месяц',
      date: new Date(),
      transactions: [],
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

  const previousSnapshot = monthSnapshots[selectedMonthIndex - 1] ?? null

  const currentMonthTransactions = selectedSnapshot.transactions
  const currentTotal = isMonitoringMode
    ? selectedSnapshot.debitTotal - selectedSnapshot.creditTotal
    : flowMode === 'credit'
      ? selectedSnapshot.creditTotal
      : selectedSnapshot.debitTotal
  const previousTotal = isMonitoringMode
    ? (previousSnapshot?.debitTotal ?? 0) - (previousSnapshot?.creditTotal ?? 0)
    : flowMode === 'credit'
      ? (previousSnapshot?.creditTotal ?? 0)
      : (previousSnapshot?.debitTotal ?? 0)
  const monthChange =
    previousTotal !== 0 ? roundPercent(((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100) : 0

  const chartSegments = isMonitoringMode
    ? selectedSnapshot.monitoringSegments
    : flowMode === 'credit'
      ? selectedSnapshot.creditSegments
      : selectedSnapshot.debitSegments

  const isTransitioning = ringTransition != null
  const hasPrevMonth = selectedMonthIndex > 0
  const hasNextMonth = selectedMonthIndex < monthKeys.length - 1
  const canGoPrev = !isTransitioning && hasPrevMonth
  const canGoNext = !isTransitioning && hasNextMonth
  const showDesktopArrows = !useSwipeNavigation

  const startMonthTransition = (targetIndex) => {
    if (
      ringTransition != null ||
      targetIndex < 0 ||
      targetIndex >= monthKeys.length ||
      targetIndex === selectedMonthIndex
    ) {
      return
    }

    const direction = targetIndex > selectedMonthIndex ? -1 : 1
    setRingTransition({
      fromIndex: selectedMonthIndex,
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
      setSelectedMonthKey(monthKeys[targetIndex] ?? null)
      setRingTransition(null)
      transitionTimeoutRef.current = null
    }, MONTH_SWITCH_DURATION_MS)
  }

  const goPrevMonth = () => {
    if (!canGoPrev) {
      return
    }

    startMonthTransition(selectedMonthIndex - 1)
  }

  const goNextMonth = () => {
    if (!canGoNext) {
      return
    }

    startMonthTransition(selectedMonthIndex + 1)
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
      goNextMonth()
      return
    }

    if (deltaX > 0 && canGoPrev) {
      goPrevMonth()
    }
  }

  const monthLabel = selectedSnapshot.label
  const amountValue = isUnlocked ? String(Math.round(currentTotal)) : '•••••••'
  const changeValue = isUnlocked ? `${monthChange >= 0 ? '+' : ''}${monthChange}%` : '•••%'
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
  const recentOperations = isUnlocked
    ? [...currentMonthTransactions]
        .filter((transaction) =>
          isMonitoringMode
            ? transaction.direction === 'out' || transaction.direction === 'in'
            : flowMode === 'debit'
              ? transaction.direction === 'out'
              : transaction.direction === 'in',
        )
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6)
    : []

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
    ? monthSnapshots[ringTransition.fromIndex] ?? selectedSnapshot
    : null
  const transitionToSnapshot = ringTransition
    ? monthSnapshots[ringTransition.toIndex] ?? selectedSnapshot
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

  const transitionEase = useSwipeNavigation ? 'cubic-bezier(0.78, 0.02, 0.96, 0.32)' : 'linear'
  const sidePreviewShift = ringTransition?.active ? ringTransition.direction * 74 : 0
  const sidePreviewOpacity = ringTransition?.active ? 0.3 : 0.45
  const sidePreviewTransition = `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`

  const renderRingLayer = (snapshot, layerKey, layerStyle, layerMetrics) => {
    const layerMetricsResolved = layerMetrics ?? []
    const layerMonthLabel = snapshot?.label ?? 'Месяц'
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

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-headline text-2xl font-extrabold text-[#d6e3ff]">{layerMonthLabel}</span>
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
          .sort((a, b) => (a.iconAngleDeg ?? a.endDeg) - (b.iconAngleDeg ?? b.endDeg))
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
    <div className="min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6 pb-32">
        {!isUnlocked ? (
          <div className="mb-6 rounded-2xl border border-[#4cd6fb]/20 bg-[#112036]/80 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#bcc9ce]">
            Аналитика скрыта до разблокировки
          </div>
        ) : null}

        <section className="mb-8">
          <div className="mb-2 flex items-start justify-between gap-3 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#d6e3ff]">
            <h1 className="min-w-0 flex-1">
              {isMonitoringMode ? 'Мониторинг' : flowMode === 'debit' ? 'Затраты' : 'Поступления'}
            </h1>
            {!isMonitoringMode ? (
              <button
                aria-label="Закрыть и вернуться к мониторингу"
                className="flex h-[1cap] w-[1cap] min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#4cd6fb]/55 bg-[#112036] text-[#d6e3ff] shadow-[0_0_0_1px_rgba(76,214,251,0.15),0_4px_16px_rgba(76,214,251,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#58d6f1] hover:bg-[#1c2a41] hover:shadow-[0_0_0_1px_rgba(88,214,241,0.3),0_6px_22px_rgba(76,214,251,0.32)] active:scale-95"
                type="button"
                onClick={() => navigate('/monitoring')}
              >
                <span
                  className="material-symbols-outlined leading-none text-[#4cd6fb]"
                  style={{
                    fontSize: 'min(0.62cap, 1.35rem)',
                    fontVariationSettings: '"FILL" 0, "wght" 600',
                  }}
                >
                  close
                </span>
              </button>
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

        {isMonitoringMode ? (
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
              >
                <span>Семейная группа</span>
                <span className="material-symbols-outlined text-[#4cd6fb]">family_restroom</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl bg-[#0d1c32] px-4 py-4 text-left text-base font-bold text-[#d6e3ff] transition hover:bg-[#112036]"
              >
                <span>Цель</span>
                <span className="material-symbols-outlined text-[#4cd6fb]">track_changes</span>
              </button>
            </div>
          </section>
        ) : null}

        <section className="mb-8 rounded-[32px] bg-[#0d1c32] p-6 md:p-8">
          {isUnlocked ? (
            <div className="mb-5 grid max-w-[min(100%,26rem)] grid-cols-2 gap-2.5 sm:mb-6">
              <div ref={accountFilterDropdownRef} className="relative min-w-0">
                <label className="sr-only" htmlFor="monitoring-account-filter-trigger">
                  Счета и карты
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
                    {accountFilterOptions.find((o) => o.id === accountFilterId)?.label ?? 'Счёт'}
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
                {accountFilterMenuOpen ? (
                  <ul
                    className="absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-[min(20rem,50vh)] w-[min(100%,18rem)] overflow-y-auto rounded-2xl border border-white/12 bg-[#0f1828]/92 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-[#0f1828]/78"
                    id="monitoring-account-filter-listbox"
                    role="listbox"
                  >
                    {accountFilterOptions.map((option) => {
                      const selected = option.id === accountFilterId
                      return (
                        <li key={option.id} role="presentation">
                          <button
                            aria-selected={selected}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                              selected
                                ? 'bg-amber-500/35 text-white'
                                : 'text-[#d6e3ff] hover:bg-white/5'
                            }`}
                            role="option"
                            type="button"
                            onClick={() => {
                              setAccountFilterId(option.id)
                              setAccountFilterMenuOpen(false)
                              setSelectedMonthKey(null)
                            }}
                          >
                            {selected ? (
                              <span
                                aria-hidden
                                className="material-symbols-outlined shrink-0 text-lg text-amber-200"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                              >
                                check
                              </span>
                            ) : (
                              <span aria-hidden className="inline-block w-6 shrink-0" />
                            )}
                            <span className="truncate">{option.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
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
                        setSelectedMonthKey(null)
                      }}
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">close</span>
                    </button>
                  ) : null}
                </div>
                {transferFilterMenuOpen ? (
                  <ul
                    className="absolute right-0 top-[calc(100%+0.375rem)] z-50 m-0 w-[min(100%,18rem)] list-none overflow-hidden rounded-2xl border border-white/12 bg-[#0f1828]/92 p-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-[#0f1828]/78"
                    id="monitoring-transfer-filter-listbox"
                    role="listbox"
                  >
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'household'}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'household'
                            ? 'bg-amber-500/35 text-white'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('household')
                          setTransferFilterMenuOpen(false)
                          setSelectedMonthKey(null)
                        }}
                      >
                        {transferExclusionMode === 'household' ? (
                          <span
                            aria-hidden
                            className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-amber-200"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            check
                          </span>
                        ) : (
                          <span aria-hidden className="inline-block w-6 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block">Без переводов</span>
                          <span className="block text-[0.92em] opacity-90">в семье</span>
                        </span>
                      </button>
                    </li>
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'others'}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'others'
                            ? 'bg-amber-500/35 text-white'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('others')
                          setTransferFilterMenuOpen(false)
                          setSelectedMonthKey(null)
                        }}
                      >
                        {transferExclusionMode === 'others' ? (
                          <span
                            aria-hidden
                            className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-amber-200"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            check
                          </span>
                        ) : (
                          <span aria-hidden className="inline-block w-6 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block">Без перевода</span>
                          <span className="block text-[0.92em] opacity-90">другим людям</span>
                        </span>
                      </button>
                    </li>
                    <li className="m-0 p-0" role="presentation">
                      <button
                        aria-selected={transferExclusionMode === 'all'}
                        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm leading-snug transition-colors ${
                          transferExclusionMode === 'all'
                            ? 'bg-amber-500/35 text-white'
                            : 'text-[#d6e3ff] hover:bg-white/5'
                        }`}
                        role="option"
                        type="button"
                        onClick={() => {
                          setTransferExclusionMode('all')
                          setTransferFilterMenuOpen(false)
                          setSelectedMonthKey(null)
                        }}
                      >
                        {transferExclusionMode === 'all' ? (
                          <span
                            aria-hidden
                            className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-amber-200"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            check
                          </span>
                        ) : (
                          <span aria-hidden className="inline-block w-6 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block">Без всех</span>
                          <span className="block text-[0.92em] opacity-90">переводов</span>
                        </span>
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            className="relative mx-auto max-w-[620px]"
            onTouchEnd={handleChartTouchEnd}
            onTouchStart={handleChartTouchStart}
            style={useSwipeNavigation ? { touchAction: 'pan-y' } : undefined}
          >
            {showDesktopArrows ? (
              <>
                <button
                  aria-label="Предыдущий месяц"
                  className={`absolute left-0 top-[38%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border transition-all md:-translate-x-1/2 ${
                    canGoPrev
                      ? 'border-[#4cd6fb]/25 bg-[#112036] text-[#4cd6fb] hover:bg-[#1c2a41] active:scale-95'
                      : 'cursor-not-allowed border-[#27354c] bg-[#112036]/40 text-[#546074]'
                  }`}
                  disabled={!canGoPrev}
                  onClick={goPrevMonth}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <button
                  aria-label="Следующий месяц"
                  className={`absolute right-0 top-[38%] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border transition-all md:translate-x-1/2 ${
                    canGoNext
                      ? 'border-[#4cd6fb]/25 bg-[#112036] text-[#4cd6fb] hover:bg-[#1c2a41] active:scale-95'
                      : 'cursor-not-allowed border-[#27354c] bg-[#112036]/40 text-[#546074]'
                  }`}
                  disabled={!canGoNext}
                  onClick={goNextMonth}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </>
              ) : null}

              {hasPrevMonth ? (
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

              {hasNextMonth ? (
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

            <div className="mb-3 flex min-w-0 flex-wrap items-end justify-center gap-2 sm:gap-2.5 md:gap-3">
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

            {isMonitoringMode ? (
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-[#4cd6fb]/30 bg-[#4cd6fb]/10 px-3 py-1 text-xs font-semibold text-[#8de4ff]">
                  Дебит:{' '}
                  <UzsAmount as="span" compact compactFrom={1_000_000} value={String(Math.round(selectedSnapshot.debitTotal))} />
                </span>
                <span className="rounded-full border border-[#58d6f1]/30 bg-[#58d6f1]/10 px-3 py-1 text-xs font-semibold text-[#9cecff]">
                  Кредит:{' '}
                  <UzsAmount as="span" compact compactFrom={1_000_000} value={String(Math.round(selectedSnapshot.creditTotal))} />
                </span>
              </div>
            ) : null}

          </div>

          {visibleSegments.length > 0 ? (
            <div className="mt-8 grid w-full grid-cols-2 gap-1.5 sm:gap-2 md:gap-2.5">
              {visibleSegments.map((segment) => {
                const listIcon = CATEGORY_ICON_MAP[segment.category] || CATEGORY_ICON_MAP.other

                return (
                  <div
                    key={segment.category}
                    className="grid min-h-[2.625rem] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0 rounded-full border py-1 pl-1 pr-1.5 sm:min-h-[2.75rem] sm:gap-x-1.5 sm:py-1.5 sm:pl-1.5 sm:pr-2"
                    style={{
                      borderColor: `${segment.color}50`,
                      background: `linear-gradient(95deg, ${segment.color}22 0%, rgba(17,32,54,0.9) 42%, rgba(17,28,46,0.94) 100%)`,
                      boxShadow: `inset 0 1px 0 ${segment.color}18`,
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
                        currencyClassName="ml-0.5 inline-block shrink-0 align-baseline text-[0.52em] font-semibold uppercase tracking-wide text-[#aab8ce] sm:text-[0.55em]"
                        value={String(Math.round(segment.amount))}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-[32px] bg-[#0d1c32] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {isMonitoringMode
                ? 'История трат и пополнений'
                : flowMode === 'debit'
                  ? 'История трат'
                  : 'История пополнений'}
            </h2>
            <span className="text-xs uppercase tracking-[0.14em] text-[#869398]">{monthLabel}</span>
          </div>

          {recentOperations.length > 0 ? (
            <div className="space-y-3">
              {recentOperations.map((operation) => {
                const categoryMeta = CATEGORIES[operation.category] || {}

                return (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between rounded-2xl bg-[#112036] px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-[#d6e3ff]">{operation.merchant}</p>
                      <p className="text-xs text-[#869398]">
                        {categoryMeta.label || operation.category} · MCC {operation.mcc}
                      </p>
                    </div>
                    <p className="font-semibold text-[#d6e3ff]">
                      <UzsAmount
                        as="span"
                        compact
                        compactFrom={1_000_000}
                        value={`${operation.direction === 'in' ? '+' : '-'} ${Math.round(operation.amountUzs)}`}
                      />
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#112036] p-4 text-sm text-[#869398]">
              Нет операций для выбранного периода.
            </div>
          )}
        </section>
      </main>

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
