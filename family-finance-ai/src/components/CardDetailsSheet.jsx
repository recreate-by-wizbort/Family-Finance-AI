import { useEffect, useMemo, useState } from 'react'
import UzsAmount from './UzsAmount'
import {
  FOREIGN_ACCOUNT_MOVEMENTS,
  STANDALONE_CARD_MOVEMENTS,
  TRANSACTIONS,
} from '../mockData'

function formatPanGroups(pan) {
  const d = String(pan).replace(/\D/g, '')
  return d.replace(/(.{4})/g, '$1 ').trim()
}

function formatMovementDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function formatUzsMovement(amount) {
  return Number(amount)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

function formatForeignMovement(amount) {
  return Number(amount)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

export default function CardDetailsSheet({ card, isOpen, onClose, isUnlocked }) {
  const [tab, setTab] = useState('all')

  useEffect(() => {
    if (!isOpen) return
    setTab('all')
  }, [isOpen, card?.id])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const movements = useMemo(() => {
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
  }, [card])

  const filtered = useMemo(() => {
    if (tab === 'in') return movements.filter((m) => m.direction === 'in')
    if (tab === 'out') return movements.filter((m) => m.direction === 'out')
    return movements
  }, [movements, tab])

  if (!isOpen || !card) return null

  const panDisplay = isUnlocked ? formatPanGroups(card.pan) : `•••• •••• •••• ${card.last4}`
  const expiryDisplay = isUnlocked ? card.expires : '••/••'

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="card-sheet-title"
        aria-modal="true"
        className="relative z-10 flex h-[min(85dvh,640px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(85dvh,680px)] sm:max-w-lg sm:rounded-3xl"
        role="dialog"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2
            className="font-headline pr-4 text-lg font-bold leading-snug text-[#d6e3ff]"
            id="card-sheet-title"
          >
            {card.sheetTitle}
          </h2>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-6 pt-4">
          <section className="mb-4 shrink-0 rounded-2xl border border-[#4cd6fb]/15 bg-[#112036] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">
              Реквизиты карты
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[#bcc9ce]">Номер карты</dt>
                <dd className="mt-1 break-all font-mono text-base tracking-wider text-[#d6e3ff]">
                  {panDisplay}
                </dd>
              </div>
              <div className="flex flex-wrap gap-8">
                <div>
                  <dt className="text-xs text-[#bcc9ce]">Срок действия</dt>
                  <dd className="mt-1 font-mono text-[#d6e3ff]">{expiryDisplay}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#bcc9ce]">Владелец</dt>
                  <dd className="mt-1 text-[#d6e3ff]">{isUnlocked ? card.holderName : '•••••• ••••••'}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="mb-2 shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
              Движения по карте
            </p>
            <div className="mb-2 shrink-0 flex gap-1 rounded-xl bg-[#0d1c32] p-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'in', label: 'Приходы' },
                { id: 'out', label: 'Расходы' },
              ].map((t) => (
                <button
                  key={t.id}
                  className={
                    tab === t.id
                      ? 'flex-1 rounded-lg bg-[#112036] py-2 text-xs font-bold text-[#4cd6fb]'
                      : 'flex-1 rounded-lg py-2 text-xs font-medium text-[#bcc9ce] hover:text-[#d6e3ff]'
                  }
                  onClick={() => setTab(t.id)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 max-h-[280px] flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <ul className="space-y-2 pb-1">
                {filtered.length === 0 ? (
                  <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                    Нет операций в этом разделе
                  </li>
                ) : (
                  filtered.map((m) => {
                    const isIn = m.direction === 'in'
                    const fx = m.amountForeign != null && m.currency
                    return (
                      <li
                        key={m.id}
                        className="flex items-start justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#d6e3ff]">{m.merchant}</p>
                          <p className="truncate text-xs text-[#bcc9ce]">{m.description}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-[#5c6b73]">
                            {formatMovementDate(m.timestamp)}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                            isIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
                          }`}
                        >
                          {isIn ? '+' : '−'}
                          {isUnlocked ? (
                            fx ? (
                              <span>
                                {formatForeignMovement(m.amountForeign)}{' '}
                                <span className="text-[0.65em] font-bold uppercase text-[#bcc9ce]">
                                  {m.currency}
                                </span>
                              </span>
                            ) : (
                              <UzsAmount as="span" value={formatUzsMovement(m.amountUzs)} />
                            )
                          ) : (
                            <span> •••••• {fx ? m.currency : 'UZS'}</span>
                          )}
                        </p>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
