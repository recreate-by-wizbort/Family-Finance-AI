import { useCallback, useEffect, useState } from 'react'
import OfferDetailSheet from './OfferDetailSheet'

export default function SpecialOffersAllSheet({ isOpen, onClose, offers }) {
  const [isClosing, setIsClosing] = useState(false)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (isOpen) { setIsClosing(false); setDetail(null) }
  }, [isOpen])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return }
    setIsClosing(true)
  }, [onClose])

  const handlePanelAnimEnd = (e) => {
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
          className={`relative z-10 flex h-[min(88dvh,760px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(88dvh,780px)] sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
          onAnimationEnd={handlePanelAnimEnd}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
            <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Специальные предложения</h2>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
              onClick={requestClose}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
            <ul className="space-y-4">
              {offers.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(o)}
                    className="relative flex w-full min-h-[140px] flex-col justify-end overflow-hidden rounded-3xl bg-[#0d1c32] p-6 text-left transition-colors hover:bg-[#112036]"
                  >
                    <img
                      className={`absolute inset-0 h-full w-full object-cover opacity-40 ${o.coverImageClass ?? ''}`}
                      alt={o.imageAlt}
                      src={o.image}
                    />
                    <div className="relative z-10">
                      <span className={`mb-2 inline-block rounded-full border px-2 py-1 text-[10px] font-bold ${o.tagClass}`}>{o.tag}</span>
                      <h3 className="text-lg font-bold leading-tight text-[#d6e3ff]">{o.title}</h3>
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
