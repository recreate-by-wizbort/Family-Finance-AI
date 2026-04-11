import { useCallback, useEffect, useState } from 'react'

export default function OfferDetailSheet({ offer, onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (offer) setIsClosing(false)
  }, [offer])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return }
    setIsClosing(true)
  }, [onClose])

  const handleAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!offer) return
    const h = (e) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [offer, requestClose])

  useEffect(() => {
    if (!offer) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [offer])

  if (!offer) return null

  return (
    <div className="fixed inset-0 z-[135] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(80dvh,600px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
        onAnimationEnd={handleAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`relative shrink-0 overflow-hidden ${offer.detailHeroClass ?? 'h-44'}`}
        >
          <img
            className={`h-full w-full object-cover ${offer.coverImageClass ?? ''}`}
            alt={offer.imageAlt ?? ''}
            src={offer.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071021] via-[#071021]/20 to-black/25" />
          <button
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <span className={`mb-2 inline-block rounded-full border px-2 py-1 text-[10px] font-bold ${offer.tagClass}`}>{offer.tag}</span>
            <h2 className="text-xl font-bold leading-tight text-[#d6e3ff]">{offer.title}</h2>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <p className="text-sm leading-relaxed text-[#bcc9ce]">{offer.description}</p>
        </div>
      </div>
    </div>
  )
}
