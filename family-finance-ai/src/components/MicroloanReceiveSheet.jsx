import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatGroupedAmountInput,
  parseGroupedAmountString,
} from '../utils/amountInputFormat'
import { PRIMARY_BANK_RECREATE } from '../mockData'
import CardSourceSelect from './CardSourceSelect'

const MIN_UZS = 100_000
const MAX_UZS = 100_000_000

export default function MicroloanReceiveSheet({
  isOpen,
  onClose,
  allUserCards = [],
  onCredited,
}) {
  const [amountStr, setAmountStr] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [error, setError] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  /** Подъём панели при появлении клавиатуры (visualViewport). */
  const [keyboardLiftPx, setKeyboardLiftPx] = useState(0)

  const isFxProduct = useCallback((c) => Boolean(c?.foreignCurrency), [])

  /** Все карты и счета Recreate (как на главной), в т.ч. USD/EUR — для них зачисление недоступно. */
  const recreateBankProducts = useMemo(
    () =>
      allUserCards.filter(
        (c) => String(c.bank ?? '').trim() === String(PRIMARY_BANK_RECREATE).trim(),
      ),
    [allUserCards],
  )

  /** Куда можно зачислить микрозайм в сумах. */
  const recreateUzsTargets = useMemo(
    () => recreateBankProducts.filter((c) => !c.foreignCurrency),
    [recreateBankProducts],
  )

  useEffect(() => {
    if (!isOpen) {
      setAmountStr('')
      setSelectedCardId('')
      setError('')
      setIsClosing(false)
      return
    }
    setSelectedCardId((id) =>
      id && recreateUzsTargets.some((c) => c.id === id)
        ? id
        : (recreateUzsTargets[0]?.id ?? ''),
    )
    setIsClosing(false)
  }, [isOpen, recreateUzsTargets])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  const handlePanelAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape' && !isClosing) requestClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose, isClosing])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setKeyboardLiftPx(0)
      return
    }
    const vv = window.visualViewport
    if (!vv) return undefined
    const sync = () => {
      const ih = window.innerHeight
      const bottomVisible = vv.offsetTop + vv.height
      setKeyboardLiftPx(Math.max(0, Math.round(ih - bottomVisible)))
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [isOpen])

  const handleAmountChange = (e) => {
    setAmountStr(formatGroupedAmountInput(e.target.value))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const picked = recreateBankProducts.find((c) => c.id === selectedCardId)
    if (picked && isFxProduct(picked)) {
      setError('Выберите карту или счёт в UZS — микрозайм зачисляется только в сумах')
      return
    }
    const card = recreateUzsTargets.find((c) => c.id === selectedCardId)
    if (!card) {
      setError('Выберите карту или счёт Bank of Recreate в сумах')
      return
    }
    const amount = parseGroupedAmountString(amountStr)
    if (!Number.isFinite(amount) || amount < MIN_UZS) {
      setError(`Минимальная сумма — ${MIN_UZS.toLocaleString('ru-RU')} UZS`)
      return
    }
    if (amount > MAX_UZS) {
      setError(`Максимальная сумма — ${MAX_UZS.toLocaleString('ru-RU')} UZS`)
      return
    }
    onCredited(card, Math.round(amount))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[145] flex flex-col px-0 pt-0 sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/55 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className="relative z-10 mt-auto w-full max-w-full sm:mx-auto sm:mt-0 sm:max-w-lg"
        style={{
          transform: keyboardLiftPx > 0 ? `translateY(-${keyboardLiftPx}px)` : undefined,
          transition: 'transform 0.18s ease-out',
        }}
      >
        <div
          className={`flex w-full max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-8px))] flex-col overflow-hidden rounded-t-[28px] rounded-b-none border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-h-[min(88vh,720px)] sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
          onAnimationEnd={handlePanelAnimEnd}
          role="dialog"
          aria-modal="true"
          aria-labelledby="microloan-sheet-title"
        >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 id="microloan-sheet-title" className="pr-3 text-lg font-bold leading-tight text-[#d6e3ff]">
            Получение микрозайма
          </h2>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="max-h-[min(48dvh,420px)] shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-4 sm:max-h-[min(52dvh,480px)]">
            <p className="mb-4 text-sm leading-relaxed text-[#bcc9ce]">
              Ставка 24% годовых (фиксированная). Укажите сумму в сумах и выберите счёт или карту{' '}
              <span className="text-[#d6e3ff]">{PRIMARY_BANK_RECREATE}</span>
              . В списке видны все ваши продукты банка; зачислить можно только на счёт или карту в UZS (счета в USD/EUR отображаются серым и недоступны).
            </p>

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4cd6fb]/90">
              Сумма (UZS)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Например, 5 000 000"
              value={amountStr}
              onChange={handleAmountChange}
              className="mb-1 w-full rounded-2xl border border-[#1c2a41] bg-[#0a1628] px-4 py-3 text-sm leading-normal text-[#d6e3ff] outline-none transition-shadow focus:border-[#4cd6fb]/40 focus:ring-2 focus:ring-[#4cd6fb]/20"
            />
          </div>

          <div className="shrink-0 border-t border-[#1c2a41] bg-[#071021] px-5 py-4 pb-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] sm:pb-6">
            {recreateBankProducts.length > 0 ? (
              <CardSourceSelect
                cards={recreateBankProducts}
                value={selectedCardId}
                onChange={setSelectedCardId}
                isOptionDisabled={isFxProduct}
                disabledOptionHint="Только в UZS"
                label="Карта или счёт зачисления"
                labelClassName="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#4cd6fb]/90"
                className="mb-0"
              />
            ) : (
              <p className="rounded-2xl border border-[#ffb4ab]/25 bg-[#ffb4ab]/5 px-4 py-3 text-sm text-[#ffb4ab]">
                Нет карт и счетов {PRIMARY_BANK_RECREATE}. Добавьте продукт банка на главной.
              </p>
            )}

            {error ? (
              <p className="mt-4 text-sm leading-snug text-[#ffb4ab]">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={recreateUzsTargets.length === 0}
              className="mt-8 w-full rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold leading-snug text-[#041329] transition-opacity hover:opacity-90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
            >
              Зачислить на карту
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
