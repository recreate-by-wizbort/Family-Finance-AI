import { useEffect, useState } from 'react'
import {
  getCardExpiryIssue,
  getBankNameFromBin,
  getProcessingSystemFromFirstFour,
  processingSystemRequiresCvv,
  randomUzsBalanceUpTo,
} from '../utils/cardBin'
import { findDeletedCardByPan, removeDeletedCard } from '../utils/deletedCards'
import { DEFAULT_CARDHOLDER_NAME } from '../mockData'

function formatExpiryMmYy(raw) {
  const d = String(raw).replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

function formatPanWithSpaces(digitsRaw) {
  const d = String(digitsRaw).replace(/\D/g, '').slice(0, 16)
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function readFormInput(form, name) {
  const el = form.elements.namedItem(name)
  return el instanceof HTMLInputElement ? el.value : ''
}

export default function AddLinkedCardModal({ isOpen, onClose, onAdd }) {
  const [pan, setPan] = useState('')
  const [expiry, setExpiry] = useState('')
  const [label, setLabel] = useState('')
  const [cvv, setCvv] = useState('')
  const [error, setError] = useState('')
  const [restoreCandidate, setRestoreCandidate] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setPan('')
    setExpiry('')
    setLabel('')
    setCvv('')
    setError('')
    setRestoreCandidate(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (restoreCandidate) {
          setRestoreCandidate(null)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, restoreCandidate])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  const digits = pan.replace(/\D/g, '')
  const firstFour = digits.slice(0, 4)
  const detected = firstFour.length === 4 ? getProcessingSystemFromFirstFour(firstFour) : null
  const needCvv = Boolean(detected && processingSystemRequiresCvv(detected))
  const detectedBank = digits.length >= 6 ? getBankNameFromBin(digits) : null

  const handlePanChange = (e) => {
    setError('')
    const next = e.target.value.replace(/\D/g, '').slice(0, 16)
    setPan(next)

    const sys = next.length >= 4 ? getProcessingSystemFromFirstFour(next.slice(0, 4)) : null
    if (next.length < 4 || !sys || !processingSystemRequiresCvv(sys)) {
      setCvv('')
    }
  }

  const doAdd = (cardData) => {
    onAdd(cardData)
    onClose()
  }

  const handleRestoreYes = () => {
    if (!restoreCandidate) return
    const old = restoreCandidate
    removeDeletedCard(old.pan)
    const { deletedAt, ...cardWithoutMeta } = old
    const id = `user_linked_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    doAdd({ ...cardWithoutMeta, id })
  }

  const handleRestoreNo = () => {
    if (!restoreCandidate) return
    const panDigits = String(restoreCandidate.pan).replace(/\D/g, '')
    removeDeletedCard(panDigits)
    setRestoreCandidate(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')

    const form = e.currentTarget
    const panDigits = readFormInput(form, 'cardPan').replace(/\D/g, '').slice(0, 16)
    const expiryVal = readFormInput(form, 'cardExpiry').trim()
    const labelVal = readFormInput(form, 'cardLabel').trim()
    const cvvDigits = readFormInput(form, 'cardCvv').replace(/\D/g, '').slice(0, 3)

    if (panDigits.length !== 16) {
      setError('Номер карты должен содержать ровно 16 цифр')
      return
    }

    const firstFourSubmit = panDigits.slice(0, 4)
    const system = getProcessingSystemFromFirstFour(firstFourSubmit)
    if (!system) {
      setError('Платёжная система не распознана по первым 4 цифрам. Карту добавить нельзя.')
      return
    }

    const bankResolved = getBankNameFromBin(panDigits)
    if (!bankResolved) {
      setError('Банк не определён по номеру карты. Проверьте правильность введённого номера.')
      return
    }

    if (processingSystemRequiresCvv(system)) {
      if (cvvDigits.length !== 3) {
        setError('Введите 3 цифры кода CVV/CVC с оборота карты')
        return
      }
    }

    if (!expiryVal) {
      setError('Укажите срок действия')
      return
    }
    const expiryIssue = getCardExpiryIssue(expiryVal)
    if (expiryIssue) {
      setError(expiryIssue)
      return
    }

    const deleted = findDeletedCardByPan(panDigits)
    if (deleted) {
      setRestoreCandidate(deleted)
      return
    }

    const id = `user_linked_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const expiryClean = expiryVal.replace(/\s/g, '').replace(/-/g, '/')

    doAdd({
      id,
      pan: panDigits,
      expires: expiryClean,
      bank: bankResolved,
      userLabel: labelVal || 'Новая карта',
      processingSystem: system,
      balanceUzs: randomUzsBalanceUpTo(10_000_000),
      holderName: DEFAULT_CARDHOLDER_NAME,
      ...(processingSystemRequiresCvv(system) ? { cvv: cvvDigits } : {}),
    })
  }

  if (restoreCandidate) {
    const rc = restoreCandidate
    const panMask = `${String(rc.pan).slice(0, 4)} •••• •••• ${String(rc.pan).slice(-4)}`
    const deletedDate = rc.deletedAt
      ? new Date(rc.deletedAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null

    return (
      <div className="fixed inset-0 z-[110] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
        <button
          aria-label="Закрыть"
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setRestoreCandidate(null)}
          type="button"
        />
        <div className="relative z-10 w-full max-w-lg rounded-t-[24px] border border-[#4cd6fb]/25 bg-[#071021] p-5 shadow-2xl sm:rounded-3xl">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4cd6fb]/15 text-[#4cd6fb]">
              <span className="material-symbols-outlined text-[26px]">restore</span>
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">
                Карта найдена в истории
              </h2>
              <p className="mt-1 text-sm text-[#bcc9ce]">
                Карта <span className="font-mono font-semibold text-[#d6e3ff]">{panMask}</span>{' '}
                была ранее удалена
                {deletedDate ? ` (${deletedDate})` : ''}.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-[#1c2a41] bg-[#112036] p-4 text-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#bcc9ce]">
              Сохранённые данные
            </p>
            <div className="space-y-1.5 text-[#d6e3ff]">
              <p>
                <span className="text-[#5c6b73]">Название:</span>{' '}
                {rc.userLabel ?? 'Новая карта'}
              </p>
              <p>
                <span className="text-[#5c6b73]">Банк:</span> {rc.bank}
              </p>
              <p>
                <span className="text-[#5c6b73]">Система:</span> {rc.processingSystem}
              </p>
              <p>
                <span className="text-[#5c6b73]">Срок:</span> {rc.expires}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-[#bcc9ce]">
            Хотите восстановить карту со всеми прежними данными?
          </p>

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-xl border border-[#1c2a41] py-3 text-sm font-semibold text-[#bcc9ce] hover:bg-[#112036]"
              onClick={handleRestoreNo}
              type="button"
            >
              Нет, добавить как новую
            </button>
            <button
              className="flex-1 rounded-xl bg-[#003642] py-3 text-sm font-bold text-[#4cd6fb] hover:opacity-90"
              onClick={handleRestoreYes}
              type="button"
            >
              Да, восстановить
            </button>
          </div>
        </div>
      </div>
    )
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

        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-pan">
              Номер карты
            </label>
            <input
              autoComplete="off"
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 font-mono text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-pan"
              name="cardPan"
              inputMode="numeric"
              maxLength={19}
              onChange={handlePanChange}
              placeholder="16 цифр"
              value={formatPanWithSpaces(pan)}
            />

            {digits.length >= 4 && (
              <div className="mt-1.5 flex items-center gap-2">
                {detected ? (
                  <span className="text-xs text-[#58d6f1]">{detected}</span>
                ) : (
                  <span className="text-xs text-[#ffb4ab]">Платёжная система не распознана</span>
                )}
                {detected && detectedBank ? (
                  <>
                    <span className="text-xs text-[#3a4f5c]">·</span>
                    <span className="text-xs font-medium text-[#4cd6fb]">{detectedBank}</span>
                  </>
                ) : detected && digits.length >= 6 && !detectedBank ? (
                  <>
                    <span className="text-xs text-[#3a4f5c]">·</span>
                    <span className="text-xs text-[#ffb4ab]">банк не определён</span>
                  </>
                ) : null}
              </div>
            )}

            {needCvv ? (
              <div
                className="mt-3 overflow-hidden rounded-xl border border-[#4cd6fb]/35 bg-[#0d1c32] px-4 py-3 shadow-[0_0_28px_-10px_rgba(76,214,251,0.4)]"
                style={{ animation: 'addCardCvvIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) both' }}
              >
                <style>{`
                  @keyframes addCardCvvIn {
                    from { opacity: 0; transform: translateY(-14px) scale(0.98); filter: blur(4px); }
                    to   { opacity: 1; transform: translateY(0) scale(1);        filter: blur(0);   }
                  }
                `}</style>
                <p className="mb-2 text-xs leading-snug text-[#bcc9ce]">
                  Код <span className="font-semibold text-[#58d6f1]">CVV / CVC</span> — три цифры на
                  обороте карты
                </p>
                <label className="sr-only" htmlFor="add-card-cvv">CVV или CVC</label>
                <input
                  autoComplete="off"
                  className="w-full rounded-lg border border-[#1c2a41] bg-[#112036] px-3 py-2.5 font-mono text-center text-lg tracking-[0.35em] text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
                  id="add-card-cvv"
                  name="cardCvv"
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(e) => {
                    setError('')
                    setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))
                  }}
                  placeholder="000"
                  type="text"
                  value={cvv}
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-expiry">
              Срок действия (ММ/ГГ)
            </label>
            <input
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 font-mono text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-expiry"
              name="cardExpiry"
              inputMode="numeric"
              maxLength={5}
              onChange={(e) => {
                setError('')
                setExpiry(formatExpiryMmYy(e.target.value))
              }}
              placeholder="например 12/28"
              value={expiry}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#bcc9ce]" htmlFor="add-card-label">
              Название карты (необязательно)
            </label>
            <input
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              id="add-card-label"
              name="cardLabel"
              onChange={(e) => {
                setError('')
                setLabel(e.target.value)
              }}
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
