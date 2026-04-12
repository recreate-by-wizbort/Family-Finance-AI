/**
 * Геометрия кольцевой диаграммы (как на странице мониторинга / CostPage).
 */

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
  if (isClockwise) return angle
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

/** Полный оборот: одна SVG-дуга 0→360° даёт совпадающие точки и не рисуется — две дуги по 180°. */
function describeFullRingPath(cx, cy, radius, startAngleDeg, isClockwise) {
  const midDeg = (startAngleDeg + 180) % 360
  const pStart = pointOnCircle(cx, cy, radius, startAngleDeg)
  const pMid = pointOnCircle(cx, cy, radius, midDeg)
  const sweepFlag = isClockwise ? 1 : 0
  return `M ${pStart.x} ${pStart.y} A ${radius} ${radius} 0 1 ${sweepFlag} ${pMid.x} ${pMid.y} A ${radius} ${radius} 0 1 ${sweepFlag} ${pStart.x} ${pStart.y}`
}

const MAIN_RING_RADIUS = 99
const MAIN_RING_STROKE_WIDTH = 34
const PERCENT_LABEL_RADIUS = MAIN_RING_RADIUS + 42
const MIN_RING_VISUAL_PERCENT = 13
const RING_DRAW_CLOCKWISE = true
const ICON_ON_SEGMENT_FRACTION = 1

/** @type {typeof MAIN_RING_RADIUS} */
export const RESERVE_DONUT_RING_RADIUS = MAIN_RING_RADIUS
/** @type {typeof MAIN_RING_STROKE_WIDTH} */
export const RESERVE_DONUT_STROKE_WIDTH = MAIN_RING_STROKE_WIDTH
/** @type {typeof PERCENT_LABEL_RADIUS} */
export const RESERVE_DONUT_PERCENT_LABEL_RADIUS = PERCENT_LABEL_RADIUS
export const RESERVE_DONUT_HOLE_SIZE_PX = 164
export const RESERVE_DONUT_ICON_BADGE_DIAMETER = MAIN_RING_STROKE_WIDTH
export const RESERVE_DONUT_ICON_BADGE_GLYPH = Math.min(
  Math.round(MAIN_RING_STROKE_WIDTH * 0.6),
  Math.round(MAIN_RING_STROKE_WIDTH * 0.56),
)

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
  }

  const map = new Map()
  for (const k of Object.keys(layoutByCat)) {
    map.set(k, layoutByCat[k])
  }
  return map
}

/**
 * @param {Array<{ category: string, amount: number, share: number, percent: number, color: string, icon: string }>} segments
 */
export function buildReserveDonutRingMetrics(segments) {
  const ringSegments = (segments || []).filter((segment) => segment.amount > 0)

  if (ringSegments.length === 0) {
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

    const startAngleDeg = toRingAngle(start, RING_DRAW_CLOCKWISE)
    const endAngleDeg = toRingAngle(end, RING_DRAW_CLOCKWISE)
    const span = end - start
    let arcSweepDeg = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360
    /** toRingAngle(100) = 360° и совпадает с 0° → arcSweepDeg становится 0, линия пропадает. */
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
    const rawIconPercent = start + span * ICON_ON_SEGMENT_FRACTION
    const iconPercent =
      span > 1e-9 ? Math.min(Math.max(rawIconPercent, start + 1e-9), end - 1e-9) : start
    const iconAngleDeg = toRingAngle(iconPercent, RING_DRAW_CLOCKWISE)
    const centerPercent = (start + end) / 2
    const centerAngleDeg = toRingAngle(centerPercent, RING_DRAW_CLOCKWISE)
    const iconPoint = pointOnCircle(center, center, MAIN_RING_RADIUS, iconAngleDeg)

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

    const metricsByAngle = [...rawMetrics].sort((a, b) => a.iconAngleDeg - b.iconAngleDeg)
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

export function roundSharePercent(amount, total) {
  if (!total || total <= 0) return 0
  return roundPercent((amount / total) * 100)
}
