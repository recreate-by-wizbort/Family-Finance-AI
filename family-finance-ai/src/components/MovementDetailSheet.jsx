import { useCallback, useEffect, useMemo, useState } from 'react'
import UzsAmount from './UzsAmount'
import { CATEGORIES } from '../mockData'

function formatFullDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function formatMovementShort(ts) {
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

function getCategoryLabel(m) {
  if (m.category && CATEGORIES[m.category]) {
    return `${CATEGORIES[m.category].emoji} ${CATEGORIES[m.category].label}`
  }
  const desc = m.description ?? ''
  if (/продукт/i.test(desc)) return '🛒 Продукты'
  if (/такси|поезд/i.test(desc)) return '🚕 Транспорт'
  if (/ужин|обед|ресторан|кофе/i.test(desc)) return '🍽️ Рестораны'
  if (/одежд/i.test(desc)) return '👗 Одежда'
  if (/топлив|азс|заправ/i.test(desc)) return '🔧 Авто'
  if (/аптек|здоров/i.test(desc)) return '💊 Здоровье'
  if (/кино|игр|steam/i.test(desc)) return '🎬 Развлечения'
  if (/подписк|spotify|netflix/i.test(desc)) return '📱 Подписки'
  if (/перевод|зачисл|возврат|выплат/i.test(desc)) return '↔️ Перевод'
  if (/вклад/i.test(desc) || /вклад/i.test(m.merchant ?? '')) return '🏦 Вклад'
  if (/бронир|отель|билет/i.test(desc)) return '✈️ Путешествия'
  if (/электрон/i.test(desc)) return '🛍️ Покупки'
  return '🛍️ Покупки'
}

function resolveCategoryKey(m) {
  if (m.category) return m.category
  const desc = (m.description ?? '').toLowerCase()
  if (/продукт/i.test(desc)) return 'groceries'
  if (/такси|поезд/i.test(desc)) return 'transport'
  if (/ужин|обед|ресторан|кофе/i.test(desc)) return 'restaurants'
  if (/одежд/i.test(desc)) return 'clothes'
  if (/топлив|азс|заправ/i.test(desc)) return 'car'
  if (/аптек|здоров/i.test(desc)) return 'health'
  if (/кино|игр|steam/i.test(desc)) return 'entertainment'
  if (/подписк/i.test(desc)) return 'subscriptions'
  if (/перевод|зачисл|возврат|выплат/i.test(desc)) return 'internal'
  if (/вклад/i.test(desc) || /вклад/i.test((m.merchant ?? '').toLowerCase())) return 'internal'
  if (/бронир|отель|билет/i.test(desc)) return 'shopping'
  if (/электрон/i.test(desc)) return 'shopping'
  return 'shopping'
}

/** Детерминированные мок-поля фискализации по id операции */
function mockFiscalMeta(txId) {
  const s = String(txId)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = h >>> 0
  const fiscalReceiptId = String(10000 + (u % 90000))
  const fiscalSign = String(300000000000 + (u % 699999999999))
  const termNum = String(100000000000000 + (u % 89999999999999)).slice(0, 14)
  const terminal = `UZ${termNum}`
  return {
    fiscalReceiptId,
    fiscalSign,
    terminal,
    status: 'Оплачен',
  }
}

export default function MovementDetailSheet({
  card,
  movement,
  allMovements,
  isUnlocked,
  onClose,
  onOpenMovement,
}) {
  const [isClosing, setIsClosing] = useState(false)

  const requestClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onClose()
      return
    }
    setIsClosing((prev) => (prev ? prev : true))
  }, [onClose])

  const fx = movement.amountForeign != null && movement.currency
  const isIn = movement.direction === 'in'
  const fiscal = useMemo(() => mockFiscalMeta(movement.id), [movement.id])

  const similar = useMemo(() => {
    const cat = resolveCategoryKey(movement)
    const merch = String(movement.merchant ?? '').trim()
    return allMovements
      .filter((m) => m.id !== movement.id)
      .filter(
        (m) =>
          String(m.merchant ?? '').trim() === merch || resolveCategoryKey(m) === cat,
      )
      .slice(0, 12)
  }, [allMovements, movement])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    setIsClosing(false)
  }, [movement.id])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isClosing) return
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose, isClosing])

  const handlePanelAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return
    if (!isClosing) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(82dvh,740px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(82dvh,760px)] sm:max-w-lg sm:rounded-3xl sm:border-[#4cd6fb]/20 ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimationEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-detail-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2
            id="movement-detail-title"
            className="font-headline min-w-0 flex-1 truncate pr-3 text-lg font-bold text-[#d6e3ff]"
          >
            Операция
          </h2>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
          {/* Сумма + остаток (остаток рядом с блоком суммы) */}
          <div className="mb-6 rounded-2xl border border-[#1c2a41] bg-[#112036] p-4">
            <p className="text-lg font-bold leading-snug text-[#d6e3ff]">{movement.merchant}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p
                  className={`text-2xl font-extrabold tabular-nums ${
                    isIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
                  }`}
                >
                  {isIn ? '+' : '−'}
                  {isUnlocked ? (
                    fx ? (
                      <span>
                        {formatForeignMovement(movement.amountForeign)}{' '}
                        <span className="text-lg font-bold uppercase text-[#bcc9ce]">
                          {movement.currency}
                        </span>
                      </span>
                    ) : (
                      <UzsAmount as="span" value={formatUzsMovement(movement.amountUzs)} />
                    )
                  ) : (
                    <span className="text-xl">•••••• {fx ? movement.currency : 'UZS'}</span>
                  )}
                </p>
                {isUnlocked ? (
                  <p className="mt-2 text-xs text-[#5c6b73]">
                    Остаток после операции:{' '}
                    <span className="font-semibold tabular-nums text-[#d6e3ff]">
                      {fx ? (
                        <span>
                          {formatForeignMovement(movement.balanceAfter)}{' '}
                          <span className="uppercase text-[#bcc9ce]">{movement.currency}</span>
                        </span>
                      ) : (
                        <UzsAmount as="span" value={formatUzsMovement(movement.balanceAfter)} />
                      )}
                    </span>
                  </p>
                ) : null}
              </div>
              <p className="text-right text-xs text-[#5c6b73]">
                {formatMovementShort(movement.timestamp)}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
            Детали
          </p>
          <div className="mb-6 space-y-3 rounded-2xl border border-[#1c2a41] bg-[#112036] p-4 text-sm">
            <div>
              <span className="text-xs text-[#5c6b73]">Дата</span>
              <p className="mt-0.5 text-[#d6e3ff]">{formatFullDate(movement.timestamp)}</p>
            </div>
            <div>
              <span className="text-xs text-[#5c6b73]">Карта</span>
              <p className="mt-0.5 font-mono text-[#d6e3ff]">•••• {card.last4}</p>
            </div>
            <div>
              <span className="text-xs text-[#5c6b73]">Назначение</span>
              <p className="mt-0.5 text-[#d6e3ff]">{movement.merchant}</p>
            </div>
            <div>
              <span className="text-xs text-[#5c6b73]">Категория</span>
              <p className="mt-0.5 text-[#d6e3ff]">{getCategoryLabel(movement)}</p>
            </div>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
            Фискальные данные
          </p>
          <div className="mb-6 space-y-0 divide-y divide-[#1c2a41] rounded-2xl border border-[#1c2a41] bg-[#112036] px-4 py-1 text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-[#5c6b73]">ID фискального чека</span>
              <span className="font-mono text-right text-[#d6e3ff]">{fiscal.fiscalReceiptId}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-[#5c6b73]">Фискальный признак</span>
              <span className="max-w-[55%] break-all font-mono text-right text-xs text-[#d6e3ff]">
                {fiscal.fiscalSign}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-[#5c6b73]">Терминал</span>
              <span className="font-mono text-right text-[#d6e3ff]">{fiscal.terminal}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-[#5c6b73]">Статус фискализации</span>
              <span className="text-right font-medium text-[#58d6f1]">{fiscal.status}</span>
            </div>
          </div>

          {similar.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                Похожие операции
              </p>
              <p className="mb-3 text-xs text-[#5c6b73]">
                Та же организация или категория — нажмите, чтобы открыть
              </p>
              <ul className="space-y-2">
                {similar.map((m) => {
                  const simIn = m.direction === 'in'
                  const simFx = m.amountForeign != null && m.currency
                  return (
                    <li key={m.id}>
                      <button
                        className="flex w-full items-start justify-between gap-3 rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-left transition-colors hover:border-[#4cd6fb]/30 hover:bg-[#172a44]"
                        onClick={() => onOpenMovement(m)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#d6e3ff]">{m.merchant}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5c6b73]">
                            {formatMovementShort(m.timestamp)}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-sm font-bold tabular-nums ${
                            simIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
                          }`}
                        >
                          {simIn ? '+' : '−'}
                          {isUnlocked ? (
                            simFx ? (
                              <span>
                                {formatForeignMovement(m.amountForeign)}{' '}
                                <span className="text-[0.65em] uppercase text-[#bcc9ce]">
                                  {m.currency}
                                </span>
                              </span>
                            ) : (
                              <UzsAmount as="span" value={formatUzsMovement(m.amountUzs)} />
                            )
                          ) : (
                            <span>••••</span>
                          )}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
