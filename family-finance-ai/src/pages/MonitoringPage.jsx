import { useEffect, useMemo, useRef, useState } from 'react'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import UzsAmount from '../components/UzsAmount'
import { CATEGORIES, TRANSACTIONS } from '../mockData.js'
import { getExpensesByCategory, getMonthTransactions, getTotalExpenses } from '../utils.js'
import { isSessionUnlocked } from '../utils/sessionLock'

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
  income: 'payments',
  other: 'more_horiz',
}

const CATEGORY_RING_COLOR_OVERRIDES = {
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
const PERCENT_LABEL_RADIUS = 144
const PERCENT_LABEL_BOX_WIDTH = 66
const RING_BOUNDARY_GAP_PERCENT = 1.1
const RING_SEAM_GAP_PERCENT = 1.4
const RING_DRAW_CLOCKWISE = true
const DONUT_HOLE_SIZE = 164
const SIDE_PREVIEW_SIZE = 204
const SIDE_PREVIEW_OFFSET = -153
const SIDE_RING_MASK = 'radial-gradient(circle, transparent 0 73px, #000 74px 101px, transparent 102px)'
const MONTH_SWITCH_DURATION_MS = 150

export default function MonitoringPage() {
  const isUnlocked = isSessionUnlocked()

  const expenseTransactions = useMemo(
    () => TRANSACTIONS.filter((transaction) => transaction.kind === 'purchase' || transaction.kind === 'subscription'),
    [],
  )

  const monthKeys = useMemo(() => {
    const unique = new Set(expenseTransactions.map((transaction) => transaction.timestamp.slice(0, 7)))
    return Array.from(unique).sort()
  }, [expenseTransactions])

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(Math.max(monthKeys.length - 1, 0))

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
      const transactions = getMonthTransactions(expenseTransactions, monthDate)
      const total = getTotalExpenses(transactions)
      const totalsByCategory = getExpensesByCategory(transactions)

      const segments = Object.entries(totalsByCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          share: (amount / (total || 1)) * 100,
          percent: roundPercent((amount / (total || 1)) * 100),
          label: CATEGORIES[category]?.label || category,
          color: CATEGORY_RING_COLOR_OVERRIDES[category] || CATEGORIES[category]?.color || '#4cd6fb',
          emoji: CATEGORIES[category]?.emoji || '•',
          icon: CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP.other,
        }))
        .sort((a, b) => b.amount - a.amount)

        const metrics = (() => {
          const ringSegments = segments
            .filter((segment) => segment.share >= 4)
            .sort((a, b) => b.share - a.share)

          if (!isUnlocked || ringSegments.length === 0) {
            return []
          }

          const chartSize = 320
          const center = chartSize / 2
          const arcRadius = MAIN_RING_RADIUS
          const boundaryHalfGap = RING_BOUNDARY_GAP_PERCENT / 2
          const seamHalfGap = RING_SEAM_GAP_PERCENT / 2
          let cursor = 0

          const rawMetrics = ringSegments.map((segment, index) => {
            const start = cursor
            const end = Math.min(100, cursor + segment.share)
            cursor = end

            const isFirstSegment = index === 0
            const isLastSegment = index === ringSegments.length - 1
            const startGap = isFirstSegment ? seamHalfGap : boundaryHalfGap
            const endGap = isLastSegment ? seamHalfGap : boundaryHalfGap

            let arcStart = start + startGap
            let arcEnd = end - endGap

            const availableSweep = end - start
            const minSweep = Math.min(0.24, Math.max(0.08, availableSweep * 0.6))

            if (arcEnd - arcStart < minSweep) {
              const middle = start + availableSweep / 2
              arcStart = middle - minSweep / 2
              arcEnd = middle + minSweep / 2
            }

            const centerPercent = arcStart + (arcEnd - arcStart) / 2
            const centerAngleDeg = toRingAngle(centerPercent, RING_DRAW_CLOCKWISE)

            const labelRadius = PERCENT_LABEL_RADIUS
            const iconRadius = MAIN_RING_RADIUS
            const labelPoint = pointOnCircle(center, center, labelRadius, centerAngleDeg)

            const startAngleDeg = toRingAngle(arcStart, RING_DRAW_CLOCKWISE)
            const endAngleDeg = toRingAngle(arcEnd, RING_DRAW_CLOCKWISE)
            const arcSweepDeg = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360
            const iconAngleDeg = RING_DRAW_CLOCKWISE ? endAngleDeg - 0.2 : endAngleDeg + 0.2
            const iconPoint = pointOnCircle(center, center, iconRadius, iconAngleDeg)

            return {
              ...segment,
              startDeg: startAngleDeg,
              endDeg: endAngleDeg,
              centerAngleDeg,
              arcPath: describeArcPath(center, center, arcRadius, startAngleDeg, endAngleDeg, RING_DRAW_CLOCKWISE),
              labelX: labelPoint.x,
              labelY: labelPoint.y,
              adjustedLabelY: labelPoint.y,
              iconX: iconPoint.x,
              iconY: iconPoint.y,
              showPercent: true,
              showArc: arcSweepDeg >= 0.8,
            }
          })

          const MIN_LABEL_GAP = 22
          const rightGroup = rawMetrics.filter(m => m.labelX >= center)
          const leftGroup = rawMetrics.filter(m => m.labelX < center)

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
            group.forEach(m => {
              m.adjustedLabelY = Math.max(8, Math.min(chartSize - 8, m.adjustedLabelY))
            })
          }

          spreadLabels(rightGroup)
          spreadLabels(leftGroup)

          return rawMetrics
        })()

      return {
        key: monthKey,
        label: toMonthLabel(monthKey),
        date: monthDate,
        transactions,
        total,
        segments,
        metrics,
      }
    })
  }, [monthKeys, expenseTransactions, isUnlocked])

  const selectedSnapshot =
    monthSnapshots[selectedMonthIndex] ?? {
      key: '',
      label: 'Месяц',
      date: new Date(),
      transactions: [],
      total: 0,
      segments: [],
      metrics: [],
    }

  const previousSnapshot = monthSnapshots[selectedMonthIndex - 1] ?? null

  const currentMonthTransactions = selectedSnapshot.transactions
  const currentTotal = selectedSnapshot.total
  const previousTotal = previousSnapshot?.total ?? 0
  const monthChange =
    previousTotal > 0 ? roundPercent(((currentTotal - previousTotal) / previousTotal) * 100) : 0

  const chartSegments = selectedSnapshot.segments

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
      setSelectedMonthIndex(targetIndex)
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
  /** Для трат: минус к прошлому месяцу = хорошо (синий), плюс = рост трат (красный). */
  const changeBadgeKind = !isUnlocked ? 'masked' : changeValue.startsWith('-') ? 'down' : 'up'

  const visibleSegments = isUnlocked ? chartSegments : []
  const recentOperations = isUnlocked
    ? [...currentMonthTransactions].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6)
    : []

  const transitionFromSnapshot = ringTransition
    ? monthSnapshots[ringTransition.fromIndex] ?? selectedSnapshot
    : null
  const transitionToSnapshot = ringTransition
    ? monthSnapshots[ringTransition.toIndex] ?? selectedSnapshot
    : null

  const transitionEase = useSwipeNavigation ? 'cubic-bezier(0.78, 0.02, 0.96, 0.32)' : 'linear'
  const sidePreviewShift = ringTransition?.active ? ringTransition.direction * 74 : 0
  const sidePreviewOpacity = ringTransition?.active ? 0.3 : 0.45
  const sidePreviewTransition = `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`

  const renderRingLayer = (snapshot, layerKey, layerStyle) => {
    const layerMetrics = snapshot?.metrics ?? []
    const layerMonthLabel = snapshot?.label ?? 'Месяц'
    const arcRenderMetrics = [...layerMetrics].sort((a, b) => a.startDeg - b.startDeg)
    const maxPercentValue = layerMetrics.reduce((max, segment) => Math.max(max, segment.percent), 0) || 1

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

        {layerMetrics.map((segment) =>
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

        {[...layerMetrics]
          .sort((a, b) => a.centerAngleDeg - b.centerAngleDeg)
          .map((segment) => (
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
                zIndex: Math.round(360 - segment.centerAngleDeg),
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
          <h1 className="mb-2 font-headline text-3xl font-extrabold tracking-tight">Мониторинг</h1>
          <p className="text-sm text-[#bcc9ce]">
            Динамика трат по месяцам с детальной структурой расходов
          </p>
        </section>

        <section className="mb-8 rounded-[32px] bg-[#0d1c32] p-6 md:p-8">
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
                ? renderRingLayer(transitionFromSnapshot, 'ring-outgoing', {
                    transform: ringTransition.active
                      ? `translateX(${ringTransition.direction * 156}px) scale(0.92)`
                      : 'translateX(0px) scale(1)',
                    opacity: ringTransition.active ? 0 : 1,
                    transition: `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`,
                  })
                : null}

              {ringTransition && transitionToSnapshot
                ? renderRingLayer(transitionToSnapshot, 'ring-incoming', {
                    transform: ringTransition.active
                      ? 'translateX(0px) scale(1)'
                      : `translateX(${-ringTransition.direction * 156}px) scale(0.92)`,
                    opacity: ringTransition.active ? 1 : 0,
                    transition: `transform ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}, opacity ${MONTH_SWITCH_DURATION_MS}ms ${transitionEase}`,
                  })
                : null}

              {!ringTransition
                ? renderRingLayer(selectedSnapshot, 'ring-current', {
                    transform: 'translateX(0px) scale(1)',
                    opacity: 1,
                  })
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

            <p className="text-center text-xs uppercase tracking-[0.14em] text-[#869398]">
              Сравнение с предыдущим месяцем
            </p>
          </div>

          {visibleSegments.length > 0 ? (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {visibleSegments.map((segment) => (
                <div
                  key={segment.category}
                  className="flex items-center justify-between gap-3 rounded-full border px-3 py-2"
                  style={{
                    borderColor: `${segment.color}55`,
                    background: `linear-gradient(112deg, ${segment.color}33 0%, rgba(17,32,54,0.92) 62%)`,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-base"
                      style={{ backgroundColor: segment.color }}
                    >
                      {segment.emoji}
                    </span>
                    <span className="truncate text-base font-semibold text-[#d6e3ff]">{segment.label}</span>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value={String(Math.round(segment.amount))} />
                    </p>
                    <p className="text-[11px] font-medium tracking-wide text-[#9fb2c4]">{segment.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[32px] bg-[#0d1c32] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Операции месяца</h2>
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
                      <UzsAmount as="span" value={`- ${Math.round(operation.amountUzs)}`} />
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#112036] p-4 text-sm text-[#869398]">
              Нет операций для выбранного месяца.
            </div>
          )}
        </section>
      </main>

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
