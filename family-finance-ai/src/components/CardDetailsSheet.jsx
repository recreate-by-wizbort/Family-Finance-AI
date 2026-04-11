import { useEffect, useMemo, useState } from 'react'
import UzsAmount from './UzsAmount'
import MovementDetailSheet from './MovementDetailSheet'
import { getRawMovementsForCard, withBalanceAfter } from '../utils/cardMovements'

function formatPanGroups(pan) {
  const d = String(pan).replace(/\D/g, '')
  return d.replace(/(.{4})/g, '$1 ').trim()
}

function formatMovementDate(ts) {
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function formatUzsMovement(amount) {
  return Number(amount)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

function formatForeignMovement(amount) {
  return Number(amount)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

export default function CardDetailsSheet({
  card,
  isOpen,
  onClose,
  isUnlocked,
  onRename,
  onDelete,
  onSetPrimary,
  isPrimary,
  /** Все карты/счёта пользователя — для поиска операций сразу по всем */
  allUserCards = [],
  onSelectCard,
}) {
  const [tab, setTab] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState(null)
  const [movementSearchQuery, setMovementSearchQuery] = useState('')
  const [pendingOpenAfterCardSwitch, setPendingOpenAfterCardSwitch] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setTab('all')
      setMenuOpen(false)
      setRenaming(false)
      setConfirmDelete(false)
      setSelectedMovement(null)
      setMovementSearchQuery('')
      setPendingOpenAfterCardSwitch(null)
      return
    }
    setMenuOpen(false)
    setRenaming(false)
    setConfirmDelete(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !card?.id) return
    setTab('all')
    setSelectedMovement(null)
    setMovementSearchQuery('')
  }, [card?.id, isOpen])

  useEffect(() => {
    if (!pendingOpenAfterCardSwitch || !card) return
    if (card.id === pendingOpenAfterCardSwitch.cardId) {
      setSelectedMovement(pendingOpenAfterCardSwitch.movement)
      setPendingOpenAfterCardSwitch(null)
    }
  }, [card, pendingOpenAfterCardSwitch])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (menuOpen) { setMenuOpen(false); return }
        if (confirmDelete) { setConfirmDelete(false); return }
        if (renaming) { setRenaming(false); return }
        if (selectedMovement) { setSelectedMovement(null); return }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, menuOpen, confirmDelete, renaming, selectedMovement])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = () => setMenuOpen(false)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [menuOpen])

  const movements = useMemo(() => getRawMovementsForCard(card), [card])

  const movementsWithBalance = useMemo(
    () => (card ? withBalanceAfter(card, movements) : []),
    [movements, card],
  )

  const globalSearchRows = useMemo(() => {
    const q = movementSearchQuery.trim().toLowerCase()
    if (!q || !allUserCards.length) return []
    const rows = []
    for (const c of allUserCards) {
      const raw = getRawMovementsForCard(c)
      const withBal = withBalanceAfter(c, raw)
      for (const m of withBal) {
        const hay = [
          m.merchant,
          m.description,
          m.id,
          c.sheetTitle,
          c.last4,
          m.amountUzs != null ? formatUzsMovement(m.amountUzs) : '',
          m.amountUzs != null ? String(m.amountUzs) : '',
          m.amountForeign != null ? formatForeignMovement(m.amountForeign) : '',
          m.amountForeign != null ? String(m.amountForeign) : '',
          m.currency,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (hay.includes(q)) rows.push({ card: c, movement: m })
      }
    }
    rows.sort((a, b) =>
      String(b.movement.timestamp).localeCompare(String(a.movement.timestamp)),
    )
    return rows.slice(0, 100)
  }, [allUserCards, movementSearchQuery])

  const filtered = useMemo(() => {
    if (tab === 'in') return movementsWithBalance.filter((m) => m.direction === 'in')
    if (tab === 'out') return movementsWithBalance.filter((m) => m.direction === 'out')
    return movementsWithBalance
  }, [movementsWithBalance, tab])

  const filteredGlobalSearch = useMemo(() => {
    if (tab === 'in') return globalSearchRows.filter((r) => r.movement.direction === 'in')
    if (tab === 'out') return globalSearchRows.filter((r) => r.movement.direction === 'out')
    return globalSearchRows
  }, [globalSearchRows, tab])

  const searchActive = movementSearchQuery.trim().length > 0 && allUserCards.length > 0

  const handlePickMovementRow = (targetCard, m) => {
    setMovementSearchQuery('')
    if (targetCard.id !== card.id) {
      if (!onSelectCard) return
      setPendingOpenAfterCardSwitch({ cardId: targetCard.id, movement: m })
      onSelectCard(targetCard)
    } else {
      setSelectedMovement(m)
    }
  }

  if (!isOpen || !card) return null

  const panDisplay = isUnlocked ? formatPanGroups(card.pan) : `•••• •••• •••• ${card.last4}`
  const expiryDisplay = isUnlocked ? card.expires : '••/••'
  const canManage = Boolean(onRename || onDelete || onSetPrimary)

  const handleStartRename = () => {
    setRenameValue(card.sheetTitle ?? '')
    setRenaming(true)
    setMenuOpen(false)
  }

  const handleSaveRename = () => {
    const v = renameValue.trim()
    if (v && onRename) {
      onRename(card.id, v)
    }
    setRenaming(false)
  }

  const handleDelete = () => {
    setMenuOpen(false)
    setConfirmDelete(true)
  }

  const handleConfirmDelete = () => {
    if (onDelete) onDelete(card)
    setConfirmDelete(false)
    onClose()
  }

  const canDelete = card.kind === 'linked' || card.kind === 'account'

  const handleSetPrimary = () => {
    if (onSetPrimary) onSetPrimary(card.id)
    setMenuOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className="animate-sheet-backdrop-in absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="card-sheet-title"
        aria-modal="true"
        className="animate-sheet-panel-in relative z-10 flex h-[min(82dvh,680px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(82dvh,700px)] sm:max-w-lg sm:rounded-3xl"
        role="dialog"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2
            className="font-headline pr-4 text-lg font-bold leading-snug text-[#d6e3ff]"
            id="card-sheet-title"
          >
            {card.sheetTitle}
            {isPrimary ? (
              <span className="ml-2 inline-block rounded-full bg-[#4cd6fb]/15 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-[#4cd6fb]">
                ОСНОВНАЯ
              </span>
            ) : null}
          </h2>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-6 pt-4">
          {/* Card details */}
          <section className="relative mb-4 shrink-0 rounded-2xl border border-[#4cd6fb]/15 bg-[#112036] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">
              Реквизиты карты
            </p>

            {/* 3-dot menu */}
            {canManage ? (
              <div className="absolute right-3 top-3">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#bcc9ce] transition-colors hover:bg-[#1c2a41] hover:text-[#4cd6fb]"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((v) => !v)
                  }}
                  type="button"
                  aria-label="Действия с картой"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 top-9 z-20 min-w-[200px] overflow-hidden rounded-xl border border-[#1c2a41] bg-[#0d1c32] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onRename ? (
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#d6e3ff] transition-colors hover:bg-[#112036]"
                        onClick={handleStartRename}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#4cd6fb]">edit</span>
                        Переименовать
                      </button>
                    ) : null}
                    {onSetPrimary && !isPrimary ? (
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#d6e3ff] transition-colors hover:bg-[#112036]"
                        onClick={handleSetPrimary}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#58d6f1]">star</span>
                        Сделать основной
                      </button>
                    ) : null}
                    {onDelete && canDelete ? (
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#ffb4ab] transition-colors hover:bg-[#112036]"
                        onClick={handleDelete}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Удалить карту
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[#bcc9ce]">Номер карты</dt>
                <dd className="mt-1 break-all font-mono text-base tracking-wider text-[#d6e3ff]">
                  {panDisplay}
                </dd>
              </div>
              <div className="flex flex-wrap gap-8">
                <div>
                  <dt className="text-xs text-[#bcc9ce]">Срок действия</dt>
                  <dd className="mt-1 font-mono text-[#d6e3ff]">{expiryDisplay}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#bcc9ce]">Владелец</dt>
                  <dd className="mt-1 text-[#d6e3ff]">{isUnlocked ? card.holderName : '•••••• ••••••'}</dd>
                </div>
              </div>
            </dl>
          </section>

          {/* Rename dialog */}
          {renaming ? (
            <div className="mb-4 shrink-0 rounded-2xl border border-[#4cd6fb]/30 bg-[#0d1c32] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#bcc9ce]">
                Новое название карты
              </p>
              <input
                autoFocus
                className="mb-3 w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-2.5 text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename()
                }}
                maxLength={40}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#1c2a41] py-2 text-xs font-semibold text-[#bcc9ce] hover:bg-[#112036]"
                  onClick={() => setRenaming(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#003642] py-2 text-xs font-bold text-[#4cd6fb] hover:opacity-90"
                  onClick={handleSaveRename}
                  type="button"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : null}

          {/* Delete confirmation */}
          {confirmDelete ? (
            <div className="mb-4 shrink-0 rounded-2xl border border-[#ffb4ab]/40 bg-[#3b121c]/60 p-4">
              <p className="mb-3 text-sm font-semibold text-[#ffb4ab]">
                Удалить карту «{card.sheetTitle}»?
              </p>
              <p className="mb-4 text-xs text-[#bcc9ce]">
                Это действие нельзя отменить. Карта будет удалена из списка.
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-[#1c2a41] py-2 text-xs font-semibold text-[#bcc9ce] hover:bg-[#112036]"
                  onClick={() => setConfirmDelete(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button
                  className="flex-1 rounded-xl bg-[#7f1d1d] py-2 text-xs font-bold text-[#ffb4ab] hover:opacity-90"
                  onClick={handleConfirmDelete}
                  type="button"
                >
                  Да, удалить
                </button>
              </div>
            </div>
          ) : null}

          {/* Movements */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="mb-2 shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/90">
              Движения по карте
            </p>
            {allUserCards.length > 0 ? (
              <div className="relative mb-2 shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5c6b73]">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  aria-label="Поиск операций по всем картам"
                  className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] py-2.5 pl-10 pr-3 text-sm text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/40"
                  placeholder="Поиск по всем картам и счетам"
                  type="search"
                  value={movementSearchQuery}
                  onChange={(e) => setMovementSearchQuery(e.target.value)}
                />
              </div>
            ) : null}
            <div className="mb-2 shrink-0 flex gap-1 rounded-xl bg-[#0d1c32] p-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'in', label: 'Приходы' },
                { id: 'out', label: 'Расходы' },
              ].map((t) => (
                <button
                  key={t.id}
                  className={
                    tab === t.id
                      ? 'flex-1 rounded-lg bg-[#112036] py-2 text-xs font-bold text-[#4cd6fb]'
                      : 'flex-1 rounded-lg py-2 text-xs font-medium text-[#bcc9ce] hover:text-[#d6e3ff]'
                  }
                  onClick={() => setTab(t.id)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 max-h-[min(32dvh,280px)] flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] sm:max-h-[300px]">
              <ul className="space-y-2 pb-1">
                {searchActive ? (
                  filteredGlobalSearch.length === 0 ? (
                    <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                      Ничего не найдено
                    </li>
                  ) : (
                    filteredGlobalSearch.map(({ card: c, movement: m }) => {
                      const isIn = m.direction === 'in'
                      const fx = m.amountForeign != null && m.currency
                      return (
                        <li key={`${c.id}-${m.id}`}>
                          <button
                            className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#172a44]"
                            onClick={() => handlePickMovementRow(c, m)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#d6e3ff]">{m.merchant}</p>
                              <p className="truncate text-xs text-[#bcc9ce]">{m.description}</p>
                              <p className="mt-0.5 text-[10px] text-[#4cd6fb]/90">
                                {c.sheetTitle}
                                <span className="text-[#5c6b73]"> · •••• {c.last4}</span>
                              </p>
                              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5c6b73]">
                                {formatMovementDate(m.timestamp)}
                              </p>
                            </div>
                            <p
                              className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                                isIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
                              }`}
                            >
                              {isIn ? '+' : '−'}
                              {isUnlocked ? (
                                fx ? (
                                  <span>
                                    {formatForeignMovement(m.amountForeign)}{' '}
                                    <span className="text-[0.65em] font-bold uppercase text-[#bcc9ce]">
                                      {m.currency}
                                    </span>
                                  </span>
                                ) : (
                                  <UzsAmount as="span" value={formatUzsMovement(m.amountUzs)} />
                                )
                              ) : (
                                <span> •••••• {fx ? m.currency : 'UZS'}</span>
                              )}
                            </p>
                          </button>
                        </li>
                      )
                    })
                  )
                ) : filtered.length === 0 ? (
                  <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                    Нет операций в этом разделе
                  </li>
                ) : (
                  filtered.map((m) => {
                    const isIn = m.direction === 'in'
                    const fx = m.amountForeign != null && m.currency
                    return (
                      <li key={m.id}>
                        <button
                          className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#172a44]"
                          onClick={() => setSelectedMovement(m)}
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#d6e3ff]">{m.merchant}</p>
                            <p className="truncate text-xs text-[#bcc9ce]">{m.description}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-[#5c6b73]">
                              {formatMovementDate(m.timestamp)}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-right text-sm font-bold tabular-nums ${
                              isIn ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'
                            }`}
                          >
                            {isIn ? '+' : '−'}
                            {isUnlocked ? (
                              fx ? (
                                <span>
                                  {formatForeignMovement(m.amountForeign)}{' '}
                                  <span className="text-[0.65em] font-bold uppercase text-[#bcc9ce]">
                                    {m.currency}
                                  </span>
                                </span>
                              ) : (
                                <UzsAmount as="span" value={formatUzsMovement(m.amountUzs)} />
                              )
                            ) : (
                              <span> •••••• {fx ? m.currency : 'UZS'}</span>
                            )}
                          </p>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>

      {selectedMovement ? (
        <MovementDetailSheet
          card={card}
          movement={selectedMovement}
          allMovements={movementsWithBalance}
          isUnlocked={isUnlocked}
          onClose={() => setSelectedMovement(null)}
          onOpenMovement={(m) => setSelectedMovement(m)}
        />
      ) : null}
    </div>
  )
}
