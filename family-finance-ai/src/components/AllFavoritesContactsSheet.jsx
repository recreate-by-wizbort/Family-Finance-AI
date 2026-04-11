import { useCallback, useEffect, useState } from 'react'
import { formatPhoneAfterPrefix } from '../utils/transferRecipientFormat'

function contactSubtitle(person) {
  if (person.method === 'phone' && person.phoneDigits) {
    return `+998 ${formatPhoneAfterPrefix(String(person.phoneDigits).replace(/\D/g, '').slice(0, 9))}`
  }
  if (person.method === 'card' && person.cardDigits) {
    const d = String(person.cardDigits).replace(/\D/g, '')
    if (d.length >= 4) return `Карта · •••• ${d.slice(-4)}`
  }
  return person.method === 'phone' ? 'Телефон' : 'Карта'
}

export default function AllFavoritesContactsSheet({ isOpen, onClose, contacts, onPickContact }) {
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

  const handlePanelAnimEnd = (e) => {
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
    <div className="fixed inset-0 z-[131] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
      />

      <div
        className={`relative z-10 flex max-h-[min(85dvh,560px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-fav-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 id="all-fav-title" className="font-headline text-lg font-bold text-[#d6e3ff]">
            Все контакты
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 pb-6">
          {contacts.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-[#869398]">Нет сохранённых контактов</li>
          ) : (
            contacts.map((person) => {
              const canOpen =
                (person.method === 'phone' && String(person.phoneDigits || '').replace(/\D/g, '').length === 9) ||
                (person.method === 'card' && String(person.cardDigits || '').replace(/\D/g, '').length === 16)
              return (
                <li key={person.id} className="mb-1">
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => {
                      if (!canOpen) return
                      onPickContact?.(person)
                    }}
                    className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors ${
                      canOpen
                        ? 'text-[#d6e3ff] hover:bg-[#112036]'
                        : 'cursor-not-allowed text-[#5c6b73] opacity-60'
                    }`}
                  >
                    {person.image ? (
                      <img
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                        src={person.image}
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#27354c] text-lg font-bold text-[#4cd6fb]">
                        {person.initials ?? person.name?.slice(0, 1) ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{person.name}</p>
                      <p className="truncate text-xs text-[#869398]">{contactSubtitle(person)}</p>
                    </div>
                    {canOpen ? (
                      <span className="material-symbols-outlined shrink-0 text-[#5c6b73]">chevron_right</span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
