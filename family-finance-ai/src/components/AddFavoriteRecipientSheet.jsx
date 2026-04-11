import { useCallback, useEffect, useMemo, useState } from 'react'
import { validateLinkedCardPanForTransfer } from '../utils/cardBin'
import { formatCardNumber, formatPhoneAfterPrefix } from '../utils/transferRecipientFormat'

export default function AddFavoriteRecipientSheet({ isOpen, onClose, onSaved }) {
  const [isClosing, setIsClosing] = useState(false)
  const [tab, setTab] = useState('card')
  const [nameInput, setNameInput] = useState('')
  const [cardInput, setCardInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setIsClosing(false)
    setTab('card')
    setNameInput('')
    setCardInput('')
    setPhoneInput('')
    setError('')
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

  const cardDigits = useMemo(() => cardInput.replace(/\D/g, ''), [cardInput])
  const phoneDigits = useMemo(() => phoneInput.replace(/\D/g, ''), [phoneInput])
  const cardPanCheck = useMemo(() => validateLinkedCardPanForTransfer(cardDigits), [cardDigits])

  const canSave =
    nameInput.trim().length > 0 &&
    ((tab === 'card' && cardPanCheck.ok) || (tab === 'phone' && phoneDigits.length === 9))

  const handleSave = () => {
    setError('')
    if (!nameInput.trim()) {
      setError('Введите имя получателя')
      return
    }
    if (tab === 'card') {
      if (!cardPanCheck.ok) {
        setError(cardPanCheck.message || 'Проверьте номер карты')
        return
      }
      onSaved?.({
        name: nameInput.trim(),
        method: 'card',
        cardDigits,
      })
    } else {
      if (phoneDigits.length !== 9) {
        setError('Введите 9 цифр номера без +998')
        return
      }
      onSaved?.({
        name: nameInput.trim(),
        method: 'phone',
        phoneDigits,
      })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
        type="button"
      />

      <div
        className={`relative z-10 flex max-h-[min(88dvh,640px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-fav-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 id="add-fav-title" className="font-headline text-lg font-bold text-[#d6e3ff]">
            Добавить в избранное
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
              Имя
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Как сохранить контакт"
              className="w-full rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 text-base text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a] focus:border-[#4cd6fb]/70 focus:ring-2 focus:ring-[#4cd6fb]/20"
            />
          </div>

          <div className="mb-5 flex gap-1 rounded-xl bg-[#112036] p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                tab === 'card' ? 'bg-[#4cd6fb]/15 text-[#4cd6fb]' : 'text-[#5c6b73] hover:text-[#bcc9ce]'
              }`}
              onClick={() => setTab('card')}
            >
              Номер карты
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                tab === 'phone' ? 'bg-[#4cd6fb]/15 text-[#4cd6fb]' : 'text-[#5c6b73] hover:text-[#bcc9ce]'
              }`}
              onClick={() => setTab('phone')}
            >
              Телефон
            </button>
          </div>

          {tab === 'card' ? (
            <div className="mb-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                Номер карты
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
                  setCardInput(formatCardNumber(raw))
                }}
                maxLength={19}
                className="w-full rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 text-base tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a] focus:border-[#4cd6fb]/70 focus:ring-2 focus:ring-[#4cd6fb]/20"
              />
              {cardDigits.length === 16 && cardPanCheck.message ? (
                <p className="mt-2 text-sm text-red-400">{cardPanCheck.message}</p>
              ) : null}
            </div>
          ) : (
            <div className="mb-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                Номер телефона
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 focus-within:border-[#4cd6fb]/70 focus-within:ring-2 focus-within:ring-[#4cd6fb]/20">
                <span className="shrink-0 text-base font-semibold text-[#5c6b73]">+998</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="XX XXX XX XX"
                  value={phoneInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setPhoneInput(formatPhoneAfterPrefix(raw))
                  }}
                  maxLength={12}
                  className="w-full bg-transparent text-base tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a]"
                />
              </div>
            </div>
          )}

          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="w-full rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
