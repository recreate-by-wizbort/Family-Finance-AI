import { useCallback, useEffect, useState } from 'react'

function formatNum(n, ccy = 'UZS') {
  return Number(n).toLocaleString('ru-RU', {
    minimumFractionDigits: ccy === 'UZS' ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatAccountNumber(value) {
  const d = String(value ?? '').replace(/\D/g, '')
  return d.replace(/(.{4})/g, '$1 ').trim() || '—'
}

export default function AccountsOverviewSheet({ accounts, isOpen, isUnlocked, onClose, onOpenNew, onSelectAccount }) {
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

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
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
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Мои счета</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 space-y-4">
          {accounts.length === 0 ? (
            <p className="text-center text-sm text-[#5c6b73]">У вас пока нет открытых счетов</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((acc) => (
                <li key={acc.id}>
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-left transition-colors hover:border-[#4cd6fb]/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a41] text-[#4cd6fb]">
                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#d6e3ff]">
                          {acc.label?.trim() ? acc.label : `Счёт (${acc.currency})`}
                        </p>
                        <p className="text-[11px] text-[#5c6b73]">
                          № {formatAccountNumber(acc.accountNumber)} · открыт{' '}
                          {new Date(acc.openedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold tabular-nums text-[#d6e3ff]">
                      {isUnlocked ? `${formatNum(acc.amount, acc.currency)} ${acc.currency}` : '••••••'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            className="w-full rounded-xl bg-[#003642] py-3 text-sm font-bold text-[#4cd6fb] transition-opacity hover:opacity-90"
            onClick={onOpenNew}
            type="button"
          >
            Открыть новый счёт
          </button>
        </div>
      </div>
    </div>
  )
}
