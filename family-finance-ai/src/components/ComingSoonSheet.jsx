import { useCallback, useEffect, useState } from 'react'

export default function ComingSoonSheet({ isOpen, onClose, title = '' }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) setIsClosing(false)
  }, [isOpen])

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
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-6">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-coming-soon-backdrop-out' : 'animate-coming-soon-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-[#4cd6fb]/20 bg-[#071021] p-8 shadow-2xl ${isClosing ? 'animate-coming-soon-panel-out' : 'animate-coming-soon-panel-in'}`}
        onAnimationEnd={handleAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
          onClick={requestClose}
          type="button"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#112036]">
            <span className="material-symbols-outlined text-4xl text-[#4cd6fb]">construction</span>
          </div>
          {title ? <h3 className="mb-2 text-lg font-bold text-[#d6e3ff]">{title}</h3> : null}
          <p className="text-2xl font-extrabold text-[#4cd6fb]">Coming Soon</p>
          <p className="mt-3 text-sm text-[#bcc9ce]">Функция находится в разработке и скоро будет доступна</p>
        </div>
      </div>
    </div>
  )
}
