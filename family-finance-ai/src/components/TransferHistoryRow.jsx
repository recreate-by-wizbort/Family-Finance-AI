import UzsAmount from './UzsAmount'
import { formatForeignBalanceShort } from '../utils/balanceDisplay'

function formatMovementCardDateTime(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function TransferHistoryRow({ card: c, movement: m, isUnlocked, onSelect }) {
  const isIn = m.direction === 'in'
  const fx = m.amountForeign != null && m.currency
  const when = formatMovementCardDateTime(m.timestamp)
  const desc = m.description && String(m.description).trim()
  const midLine = desc ? `${desc} · ${when}` : when

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0d1c32] ${
            isIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isIn ? 'south_west' : 'north_east'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#d6e3ff]">{m.merchant}</p>
          <p className="line-clamp-2 text-xs leading-snug text-[#bcc9ce]">{midLine}</p>
          <p className="mt-0.5 text-[10px] text-[#4cd6fb]/90">
            {c.sheetTitle}
            <span className="text-[#5c6b73]"> · •••• {c.last4}</span>
          </p>
        </div>
      </div>
      <div
        className={`shrink-0 text-right text-sm font-bold tabular-nums ${
          isIn ? 'text-[#58d6f1]' : 'text-[#d6e3ff]'
        }`}
      >
        {isUnlocked ? (
          fx ? (
            <span>
              {isIn ? '+' : '−'}
              <span className="tabular-nums">
                {formatForeignBalanceShort(m.amountForeign, m.currency)}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-baseline justify-end gap-0.5">
              <span>{isIn ? '+' : '−'}</span>
              <UzsAmount
                as="span"
                compact
                compactFrom={1000}
                currencyPlacement="below"
                currencyClassName="text-[#9fb2c4]"
                value={String(Math.round(Math.abs(m.amountUzs ?? 0)))}
              />
            </span>
          )
        ) : (
          <span>
            {isIn ? '+' : '−'} •••••• {fx ? m.currency : 'UZS'}
          </span>
        )}
      </div>
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(c, m)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-[#112036] p-4 text-left transition-colors hover:border-[#4cd6fb]/25 hover:bg-[#172a44] sm:p-5"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#112036] p-4 sm:p-5">
      {content}
    </div>
  )
}
