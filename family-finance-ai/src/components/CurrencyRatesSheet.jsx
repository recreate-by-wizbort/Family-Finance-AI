import { useCallback, useEffect, useState } from 'react'

const CURRENCIES = [
  { code: 'USD', name: 'Доллар США', flag: '🇺🇸', rate: 12198, diff: -30.3 },
  { code: 'EUR', name: 'Евро', flag: '🇪🇺', rate: 14241, diff: -41.5 },
  { code: 'RUB', name: 'Российский рубль', flag: '🇷🇺', rate: 132.5, diff: +0.8 },
  { code: 'KZT', name: 'Казахский тенге', flag: '🇰🇿', rate: 24.3, diff: -0.12 },
  { code: 'KGS', name: 'Кыргызский сом', flag: '🇰🇬', rate: 140.2, diff: +0.5 },
  { code: 'JPY', name: 'Японская иена', flag: '🇯🇵', rate: 84.5, diff: -0.3 },
  { code: 'GBP', name: 'Фунт стерлингов', flag: '🇬🇧', rate: 16520, diff: +15.0 },
  { code: 'ILS', name: 'Израильский шекель', flag: '🇮🇱', rate: 3420, diff: -8.2 },
]

export default function CurrencyRatesSheet({ isOpen, onClose, liveRates }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) setIsClosing(false)
  }, [isOpen])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return }
    setIsClosing(true)
  }, [onClose])

  const handleAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  const merged = CURRENCIES.map((c) => {
    if (c.code === 'USD' && liveRates?.USD) return { ...c, rate: liveRates.USD.rate, diff: liveRates.USD.diff }
    if (c.code === 'EUR' && liveRates?.EUR) return { ...c, rate: liveRates.EUR.rate, diff: liveRates.EUR.diff }
    return c
  })

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(88dvh,680px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
        onAnimationEnd={handleAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Курсы валют</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <p className="mb-4 text-xs text-[#5c6b73]">Курс ЦБ Узбекистана к 1 единице валюты в UZS</p>
          <ul className="space-y-3">
            {merged.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-2xl border border-[#1c2a41] bg-[#112036] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.flag}</span>
                  <div>
                    <p className="text-sm font-bold text-[#d6e3ff]">{c.code}</p>
                    <p className="text-[11px] text-[#5c6b73]">{c.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-[#d6e3ff]">
                    {c.rate.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-[10px] tabular-nums ${c.diff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {c.diff >= 0 ? '+' : ''}{c.diff}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
