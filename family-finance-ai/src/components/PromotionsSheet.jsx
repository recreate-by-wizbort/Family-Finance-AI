import { useCallback, useEffect, useRef, useState } from 'react'
import { BANK_PROMOTIONS, PARTNER_PROMOTIONS } from '../data/specialOffers'
import OfferDetailSheet from './OfferDetailSheet'

export default function PromotionsSheet({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)
  const [promoIdx, setPromoIdx] = useState(0)
  const [detail, setDetail] = useState(null)
  const promoTouchRef = useRef({ startX: 0, startY: 0 })
  const promoTimerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setPromoIdx(0)
      setDetail(null)
    }
  }, [isOpen])

  const resetPromoTimer = useCallback(() => {
    if (promoTimerRef.current) clearInterval(promoTimerRef.current)
    if (!isOpen || BANK_PROMOTIONS.length <= 1) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    promoTimerRef.current = setInterval(() => {
      setPromoIdx((i) => (i + 1) % BANK_PROMOTIONS.length)
    }, 4000)
  }, [isOpen])

  useEffect(() => {
    resetPromoTimer()
    return () => {
      if (promoTimerRef.current) clearInterval(promoTimerRef.current)
    }
  }, [resetPromoTimer])

  const handlePromoTouchStart = useCallback((e) => {
    promoTouchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }
  }, [])

  const handlePromoTouchEnd = useCallback(
    (e) => {
      const dx = e.changedTouches[0].clientX - promoTouchRef.current.startX
      const dy = e.changedTouches[0].clientY - promoTouchRef.current.startY
      if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return
      if (dx < 0) {
        setPromoIdx((i) => (i + 1) % BANK_PROMOTIONS.length)
      } else {
        setPromoIdx((i) => (i - 1 + BANK_PROMOTIONS.length) % BANK_PROMOTIONS.length)
      }
      resetPromoTimer()
    },
    [resetPromoTimer],
  )

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  const handleAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
        <button
          aria-label="Закрыть"
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
          onClick={requestClose}
          type="button"
        />
        <div
          className={`relative z-10 flex h-[min(90dvh,800px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
          onAnimationEnd={handleAnimEnd}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
            <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Акции</h2>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
              onClick={requestClose}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">Предложения от банка</h3>
            <div
              className="relative mb-6 overflow-hidden rounded-2xl touch-pan-y"
              onTouchStart={handlePromoTouchStart}
              onTouchEnd={handlePromoTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${promoIdx * 100}%)` }}
              >
                {BANK_PROMOTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDetail(p)}
                    className="relative flex h-36 min-w-full shrink-0 flex-col justify-end overflow-hidden bg-[#0d1c32] p-5 text-left"
                  >
                    <img className="absolute inset-0 h-full w-full object-cover opacity-35" alt={p.imageAlt} src={p.image} />
                    <div className="relative z-10">
                      <span className={`mb-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.tagClass}`}>
                        {p.tag}
                      </span>
                      <h4 className="text-base font-bold leading-tight text-[#d6e3ff]">{p.title}</h4>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {BANK_PROMOTIONS.map((p, i) => (
                  <span
                    key={p.id}
                    className={`h-1.5 rounded-full transition-all ${i === promoIdx ? 'w-5 bg-[#4cd6fb]' : 'w-1.5 bg-[#4cd6fb]/35'}`}
                  />
                ))}
              </div>
            </div>

            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#58d6f1]/80">От партнёров</h3>
            <ul className="space-y-3">
              {PARTNER_PROMOTIONS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(p)}
                    className="relative flex min-h-[100px] w-full flex-col justify-end overflow-hidden rounded-2xl bg-[#0d1c32] p-4 text-left transition-colors hover:bg-[#112036]"
                  >
                    <img className="absolute inset-0 h-full w-full object-cover opacity-25" alt={p.imageAlt} src={p.image} />
                    <div className="relative z-10">
                      <span className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.tagClass}`}>
                        {p.tag}
                      </span>
                      <h4 className="text-sm font-bold leading-tight text-[#d6e3ff]">{p.title}</h4>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <OfferDetailSheet offer={detail} onClose={() => setDetail(null)} />
    </>
  )
}
