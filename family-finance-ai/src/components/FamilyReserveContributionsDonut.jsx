import { useMemo } from 'react'
import UzsAmount from './UzsAmount.jsx'
import {
  buildReserveDonutRingMetrics,
  roundSharePercent,
  RESERVE_DONUT_HOLE_SIZE_PX,
  RESERVE_DONUT_ICON_BADGE_DIAMETER,
  RESERVE_DONUT_ICON_BADGE_GLYPH,
  RESERVE_DONUT_RING_RADIUS,
  RESERVE_DONUT_STROKE_WIDTH,
} from '../utils/reserveDonutRingMetrics'

const PERCENT_LABEL_BOX_WIDTH = 66

/**
 * @param {Array<{ category: string, label: string, amount: number, color: string, icon?: string }>} segments
 */
export default function FamilyReserveContributionsDonut({ segments, centerLabel, totalUzs }) {
  const chartSegments = useMemo(() => {
    const total = segments.reduce((s, x) => s + (Number(x.amount) || 0), 0)
    if (total <= 0) return []
    return segments
      .filter((s) => (Number(s.amount) || 0) > 0)
      .map((s) => {
        const amount = Math.round(Number(s.amount) || 0)
        return {
          category: s.category,
          amount,
          share: (amount / total) * 100,
          percent: roundSharePercent(amount, total),
          color: s.color,
          icon: s.icon || 'pie_chart',
          label: s.label,
        }
      })
  }, [segments])

  const metrics = useMemo(() => buildReserveDonutRingMetrics(chartSegments), [chartSegments])

  const maxPercentValue = useMemo(
    () => metrics.reduce((max, segment) => Math.max(max, segment.percent), 0) || 1,
    [metrics],
  )

  if (metrics.length === 0) {
    return (
      <div className="relative mx-auto mb-5 w-full max-w-[320px]">
        <div className="relative aspect-square w-full overflow-hidden rounded-full">
          <svg className="absolute inset-0" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="160"
              cy="160"
              r={RESERVE_DONUT_RING_RADIUS}
              fill="none"
              stroke="#15273a"
              strokeOpacity="0.9"
              strokeLinecap="round"
              strokeWidth={RESERVE_DONUT_STROKE_WIDTH}
            />
          </svg>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#071425]"
            style={{ height: `${RESERVE_DONUT_HOLE_SIZE_PX}px`, width: `${RESERVE_DONUT_HOLE_SIZE_PX}px` }}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            <span className="font-headline text-lg font-extrabold leading-snug text-[#869398]">Нет данных</span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-[#869398]">За выбранный период операций нет</p>
      </div>
    )
  }

  return (
    <div className="relative mx-auto mb-2 w-full max-w-[320px]">
      <div
        className="relative aspect-square w-full overflow-hidden"
        role="img"
        aria-label="Круговая диаграмма вкладов в семейный резерв"
      >
        <svg className="absolute inset-0" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="160"
            cy="160"
            r={RESERVE_DONUT_RING_RADIUS}
            fill="none"
            stroke="#15273a"
            strokeOpacity="0.9"
            strokeLinecap="round"
            strokeWidth={RESERVE_DONUT_STROKE_WIDTH}
          />
          {metrics.map((segment) =>
            segment.showArc ? (
              <path
                key={`arc-${segment.category}`}
                d={segment.arcPath}
                fill="none"
                stroke={segment.color}
                strokeWidth={RESERVE_DONUT_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 10px ${segment.color}33)` }}
              />
            ) : null,
          )}
        </svg>

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#071425]"
          style={{ height: `${RESERVE_DONUT_HOLE_SIZE_PX}px`, width: `${RESERVE_DONUT_HOLE_SIZE_PX}px` }}
        />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="font-headline text-2xl font-extrabold capitalize leading-snug text-[#d6e3ff]">
            {centerLabel}
          </span>
        </div>

        {metrics.map((segment) =>
          segment.showPercent ? (
            <div
              key={`pct-${segment.category}`}
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

        {[...metrics]
          .sort((a, b) => (a.iconAngleDeg ?? a.endDeg) - (b.iconAngleDeg ?? b.endDeg))
          .map((segment, badgeIndex) => (
            <div
              key={`badge-${segment.category}`}
              className="absolute flex items-center justify-center rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${segment.iconX}px`,
                top: `${segment.iconY}px`,
                width: `${RESERVE_DONUT_ICON_BADGE_DIAMETER}px`,
                height: `${RESERVE_DONUT_ICON_BADGE_DIAMETER}px`,
                backgroundColor: segment.color,
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow:
                  'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.12)',
                zIndex: 30 + badgeIndex,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: `${RESERVE_DONUT_ICON_BADGE_GLYPH}px`,
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

      <p className="mt-4 text-center font-headline text-2xl font-extrabold text-[#d6e3ff]">
        <UzsAmount as="span" className="inline-flex justify-center" compact compactFrom={1_000_000} value={String(Math.round(totalUzs || 0))} />
      </p>
    </div>
  )
}
