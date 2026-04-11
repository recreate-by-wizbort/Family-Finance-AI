import { useEffect, useState } from 'react'
import {
  getProcessingSystemFromFirstFour,
  isCardExpiryValid,
  randomUzsBalanceUpTo,
} from '../utils/cardBin'
import { DEFAULT_CARDHOLDER_NAME } from '../mockData'

export default function AddLinkedCardModal({ isOpen, onClose, onAdd }) {
  const [pan, setPan] = useState('')
  const [expiry, setExpiry] = useState('')
  const [bank, setBank] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setPan('')
    setExpiry('')
    setBank('')
    setLabel('')
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const digits = pan.replace(/\D/g, '')
  const firstFour = digits.slice(0, 4)
  const detected = firstFour.length === 4 ? getProcessingSystemFromFirstFour(firstFour) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (digits.length < 4) {
      setError('Введите минимум первые 4 цифры номера карты')
      return
    }
    const system = getProcessingSystemFromFirstFour(firstFour)
    if (!system) {
      setError('Не удалось определить платёжную систему')
      return
    }
    if (!expiry.trim()) {
      setError('Укажите срок действия')
      return
    }
    if (!isCardExpiryValid(expiry)) {
      setError('Срок действия карты истёк. Укажите актуальную дату.')
      return
    }
    if (!bank.trim()) {
      setError('Укажите название банка')
      return
    }

    let panNorm = digits
    if (panNorm.length < 16) {
      panNorm = panNorm + '0'.repeat(16 - panNorm.length)
    } else {
      panNorm = panNorm.slice(0, 16)
    }
    const id = `user_linked_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const expiryClean = expiry.trim().replace(/\s/g, '').replace(/-/g, '/')

    onAdd({
      id,
      pan: panNorm,
      expires: expiryClean,
      bank: bank.trim(),
      userLabel: label.trim() || 'Новая карта',
      processingSystem: system,
      balanceUzs: randomUzsBalanceUpTo(10_000_000),
      holderName: DEFAULT_CARDHOLDER_NAME,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-[24px] border border-[#4cd6fb]/25 bg-[#071021] p-5 shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-card-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]" id="add-card-title">
            Новая карта
          </h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036]"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-pan">
              Номер карты
            </label>
            <input
              autoComplete="off"
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 font-mono text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-pan"
              inputMode="numeric"
              maxLength={19}
              onChange={(e) => setPan(e.target.value.replace(/\D/g, ''))}
              placeholder="Минимум 4 цифры"
              value={pan}
            />
            {detected ? (
              <p className="mt-1 text-xs text-[#58d6f1]">Платёжная система: {detected}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-expiry">
              Срок действия (ММ/ГГ)
            </label>
            <input
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 font-mono text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-expiry"
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="например 12/28"
              value={expiry}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-bank">
              Банк
            </label>
            <input
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-bank"
              onChange={(e) => setBank(e.target.value)}
              placeholder="Название банка"
              value={bank}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-label">
              Название карты (необязательно)
            </label>
            <input
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Как отображать в списке"
              value={label}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-[#3b121c]/80 px-3 py-2 text-sm text-[#ffb4ab]">{error}</p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 rounded-xl border border-[#1c2a41] py-3 text-sm font-semibold text-[#bcc9ce] hover:bg-[#112036]"
              onClick={onClose}
              type="button"
            >
              Отмена
            </button>
            <button
              className="flex-1 rounded-xl bg-[#003642] py-3 text-sm font-bold text-[#4cd6fb] hover:opacity-90"
              type="submit"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
