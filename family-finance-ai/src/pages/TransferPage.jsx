import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import AddFavoriteRecipientSheet from '../components/AddFavoriteRecipientSheet'
import AllFavoritesContactsSheet from '../components/AllFavoritesContactsSheet'
import AllTransferHistorySheet from '../components/AllTransferHistorySheet'
import BetweenOwnCardsSheet from '../components/BetweenOwnCardsSheet'
import CardTransferSheet from '../components/CardTransferSheet'
import ComingSoonSheet from '../components/ComingSoonSheet'
import MovementDetailSheet from '../components/MovementDetailSheet'
import TransferHistoryRow from '../components/TransferHistoryRow'
import useExchangeRates from '../hooks/useExchangeRates'
import {
  getAggregatedMovementRowsForAllCards,
  getMergedRawMovementsForCard,
  pickDiverseHistoryPreviewRows,
  withBalanceAfter,
} from '../utils/cardMovements'
import { computeAllUserCards } from '../utils/buildHomeUserCardsList'
import { loadCardBalanceDeltas, saveCardBalanceDeltas } from '../utils/cardBalanceDeltas'
import {
  appendDepositCardMovement,
  buildDepositInMovement,
  buildDepositOutMovement,
  loadDepositCardMovements,
} from '../utils/depositCardMovements'
import {
  addFavoriteRecipient,
  dedupeFavoriteRecipientsList,
  loadFavoriteRecipients,
} from '../utils/favoriteRecipients'
import { loadPrimaryCardId, loadRemovedRowIds } from '../utils/deletedCards'
import { loadUserAccounts } from '../utils/accounts'
import { loadCardRenames, loadUserLinkedCards } from '../utils/homeCardsPersist'
import { isSessionUnlocked } from '../utils/sessionLock'

function favoriteCanTransfer(f) {
  if (f.method === 'phone' && String(f.phoneDigits || '').replace(/\D/g, '').length === 9) return true
  if (f.method === 'card' && String(f.cardDigits || '').replace(/\D/g, '').length === 16) return true
  return false
}

export default function TransferPage() {
  const isUnlocked = isSessionUnlocked()
  const rates = useExchangeRates()
  const location = useLocation()
  const [transferOpen, setTransferOpen] = useState(() => Boolean(location.state?.openTransfer))
  const [preselectedId, setPreselectedId] = useState(() => location.state?.preselectedCardId ?? null)
  const [transferInitialTab, setTransferInitialTab] = useState(() =>
    location.state?.transferTab === 'phone' ? 'phone' : 'card',
  )
  const [cardBalanceDeltas, setCardBalanceDeltas] = useState(() => loadCardBalanceDeltas())
  const [linkedMovementsByCardId, setLinkedMovementsByCardId] = useState(() => loadDepositCardMovements())
  const [favorites, setFavorites] = useState(() => loadFavoriteRecipients())
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false)
  const [allContactsOpen, setAllContactsOpen] = useState(false)
  const [historyAllOpen, setHistoryAllOpen] = useState(false)
  const [movementDetailKey, setMovementDetailKey] = useState(null)
  const [pinnedRecipient, setPinnedRecipient] = useState(null)
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonTitle, setComingSoonTitle] = useState('')
  const [betweenOwnOpen, setBetweenOwnOpen] = useState(false)

  const favoritesDisplay = useMemo(() => dedupeFavoriteRecipientsList(favorites), [favorites])
  const favoritesPreview = useMemo(() => favoritesDisplay.slice(0, 2), [favoritesDisplay])
  const previewSlot1 = favoritesPreview[0] ?? null
  const previewSlot2 = favoritesPreview[1] ?? null

  useEffect(() => {
    const syncBalances = () => setCardBalanceDeltas(loadCardBalanceDeltas())
    const syncFav = () => setFavorites(loadFavoriteRecipients())
    const syncMovements = () => setLinkedMovementsByCardId(loadDepositCardMovements())
    const syncAll = () => {
      syncBalances()
      syncFav()
      syncMovements()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') syncAll()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', syncAll)
    window.addEventListener('family-finance-favorites-changed', syncFav)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', syncAll)
      window.removeEventListener('family-finance-favorites-changed', syncFav)
    }
  }, [])

  const allUserCards = useMemo(
    () =>
      computeAllUserCards({
        cardBalanceDeltas,
        removedRowIds: loadRemovedRowIds(),
        primaryCardId: loadPrimaryCardId(),
        renamedLabels: loadCardRenames(),
        userLinkedCards: loadUserLinkedCards(),
        userAccounts: loadUserAccounts(),
      }),
    [cardBalanceDeltas],
  )

  const historyRowsAll = useMemo(
    () => getAggregatedMovementRowsForAllCards(allUserCards, linkedMovementsByCardId),
    [allUserCards, linkedMovementsByCardId],
  )

  const historyPreviewRows = useMemo(
    () => pickDiverseHistoryPreviewRows(historyRowsAll, 3),
    [historyRowsAll],
  )

  const movementDetailModel = useMemo(() => {
    if (!movementDetailKey) return null
    const card = allUserCards.find((c) => c.id === movementDetailKey.cardId)
    if (!card) return null
    const raw = getMergedRawMovementsForCard(card, linkedMovementsByCardId)
    const allMovements = withBalanceAfter(card, raw)
    const movement = allMovements.find((m) => m.id === movementDetailKey.movementId)
    if (!movement) return null
    return { card, movement, allMovements }
  }, [movementDetailKey, allUserCards, linkedMovementsByCardId])

  const openMovementDetail = useCallback((card, movement) => {
    setMovementDetailKey({ cardId: card.id, movementId: movement.id })
  }, [])

  const closeMovementDetail = useCallback(() => setMovementDetailKey(null), [])

  const openComingSoon = useCallback((title) => {
    setComingSoonTitle(title)
    setComingSoonOpen(true)
  }, [])

  useEffect(() => {
    if (movementDetailKey && !movementDetailModel) {
      setMovementDetailKey(null)
    }
  }, [movementDetailKey, movementDetailModel])

  const handleTransferComplete = useCallback(
    (cardId, amountUzs, debitInCardCurrency, sourceCard) => {
      const d = debitInCardCurrency ?? amountUzs
      setCardBalanceDeltas((prev) => {
        const next = { ...prev, [cardId]: (prev[cardId] ?? 0) - d }
        saveCardBalanceDeltas(next)
        return next
      })
      const card =
        sourceCard ?? allUserCards.find((c) => c.id === cardId) ?? { id: cardId }
      const mov = buildDepositOutMovement(card, d, 'Исходящий перевод', 'Перевод')
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, cardId, mov))
    },
    [allUserCards],
  )

  const handleBetweenOwnTransferComplete = useCallback(
    ({ sourceId, destId, sourceCard, destCard, debitSource, creditDest }) => {
      setCardBalanceDeltas((prev) => {
        const next = {
          ...prev,
          [sourceId]: (prev[sourceId] ?? 0) - debitSource,
          [destId]: (prev[destId] ?? 0) + creditDest,
        }
        saveCardBalanceDeltas(next)
        return next
      })
      const movOut = buildDepositOutMovement(
        sourceCard,
        debitSource,
        `На «${destCard.sheetTitle}» · •••• ${destCard.last4}`,
        'Между своими',
      )
      const movIn = buildDepositInMovement(
        destCard,
        creditDest,
        `С «${sourceCard.sheetTitle}» · •••• ${sourceCard.last4}`,
        'Между своими',
      )
      setLinkedMovementsByCardId((prev) => {
        const afterOut = appendDepositCardMovement(prev, sourceId, movOut)
        return appendDepositCardMovement(afterOut, destId, movIn)
      })
    },
    [],
  )

  const openPhoneTransfer = useCallback(() => {
    setPinnedRecipient(null)
    setPreselectedId(null)
    setTransferInitialTab('phone')
    setTransferOpen(true)
  }, [])

  const openCardTransfer = useCallback(() => {
    setPinnedRecipient(null)
    setPreselectedId(null)
    setTransferInitialTab('card')
    setTransferOpen(true)
  }, [])

  const openFavoriteTransfer = useCallback((f) => {
    if (!favoriteCanTransfer(f)) return
    const cardDigits = f.method === 'card' ? String(f.cardDigits || '').replace(/\D/g, '').slice(0, 16) : ''
    const phoneDigits = f.method === 'phone' ? String(f.phoneDigits || '').replace(/\D/g, '').slice(0, 9) : ''
    setPinnedRecipient({
      name: f.name,
      method: f.method,
      ...(f.method === 'card' ? { cardDigits } : {}),
      ...(f.method === 'phone' ? { phoneDigits } : {}),
    })
    setPreselectedId(null)
    setTransferInitialTab(f.method === 'phone' ? 'phone' : 'card')
    setTransferOpen(true)
  }, [])

  useEffect(() => {
    const st = location.state
    if (!st?.openTransfer) return
    setPinnedRecipient(null)
    setTransferOpen(true)
    setPreselectedId(st.preselectedCardId ?? null)
    setTransferInitialTab(st.transferTab === 'phone' ? 'phone' : 'card')
  }, [location.key, location.state?.openTransfer, location.state?.preselectedCardId, location.state?.transferTab])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#041329] pb-32 text-[#d6e3ff]">
      <AppTopBar />

      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 pt-24 transition-[padding] duration-300 ease-out sm:px-5">
        <section className="flex min-h-0 w-full flex-[3] flex-col">
          <h1 className="mb-4 shrink-0 font-headline text-3xl font-extrabold tracking-tight sm:mb-5">
            Переводы
          </h1>
          <div className="grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[repeat(4,minmax(5.25rem,1fr))] gap-3 sm:grid-cols-2 sm:grid-rows-[repeat(2,minmax(5.25rem,1fr))]">
            <button
              type="button"
              onClick={openPhoneTransfer}
              className="flex h-full min-h-[5.25rem] w-full items-center gap-4 rounded-3xl border border-[#1c2a41] bg-[#112036] px-4 py-4 text-left transition-colors enabled:hover:border-[#4cd6fb]/30 enabled:hover:bg-[#1c2a41] sm:px-5 sm:py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1c32] sm:h-[3.25rem] sm:w-[3.25rem]">
                <span className="material-symbols-outlined text-[30px] text-[#4cd6fb] sm:text-[32px]">
                  smartphone
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold leading-tight text-[#d6e3ff] sm:text-lg">Перевод по телефону</h3>
                <p className="mt-1 text-xs leading-snug text-[#bcc9ce] sm:text-sm">
                  Удобно: достаточно номера телефона — без карты получателя
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBetweenOwnOpen(true)}
              className="flex h-full min-h-[5.25rem] w-full items-center gap-4 rounded-3xl border border-[#1c2a41] bg-[#112036] px-4 py-4 text-left transition-colors hover:border-[#4cd6fb]/30 hover:bg-[#1c2a41] sm:px-5 sm:py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1c32] sm:h-[3.25rem] sm:w-[3.25rem]">
                <span className="material-symbols-outlined text-[30px] text-[#4cd6fb] sm:text-[32px]">sync_alt</span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold leading-tight text-[#d6e3ff] sm:text-lg">Между своими</h3>
                <p className="mt-1 text-xs leading-snug text-[#bcc9ce] sm:text-sm">Карты и счета без комиссии</p>
              </div>
            </button>

            <button
              type="button"
              onClick={openCardTransfer}
              className="flex h-full min-h-[5.25rem] w-full items-center gap-4 rounded-3xl border border-[#1c2a41] bg-[#112036] px-4 py-4 text-left transition-colors enabled:hover:border-[#4cd6fb]/30 enabled:hover:bg-[#1c2a41] sm:px-5 sm:py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1c32] sm:h-[3.25rem] sm:w-[3.25rem]">
                <span className="material-symbols-outlined text-[30px] text-[#58d6f1] sm:text-[32px]">
                  credit_card
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold leading-tight text-[#d6e3ff] sm:text-lg">По номеру карты</h3>
                <p className="mt-1 text-xs leading-snug text-[#bcc9ce] sm:text-sm">Любого банка мира</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openComingSoon('В другой банк')}
              className="flex h-full min-h-[5.25rem] w-full items-center gap-4 rounded-3xl border border-[#1c2a41] bg-[#112036] px-4 py-4 text-left transition-colors hover:border-[#4cd6fb]/30 hover:bg-[#1c2a41] sm:px-5 sm:py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1c32] sm:h-[3.25rem] sm:w-[3.25rem]">
                <span className="material-symbols-outlined text-[30px] text-[#4cd6fb] sm:text-[32px]">
                  account_balance
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold leading-tight text-[#d6e3ff] sm:text-lg">В другой банк</h3>
                <p className="mt-1 text-xs leading-snug text-[#bcc9ce] sm:text-sm">По реквизитам счёта</p>
              </div>
            </button>
          </div>
        </section>

        <section className="flex min-h-0 w-full flex-[2] flex-col">
          <div className="mb-4 flex shrink-0 items-center justify-between sm:mb-5">
            <h2 className="font-headline text-xl font-bold sm:text-2xl">Избранное</h2>
            {favoritesDisplay.length > 2 ? (
              <button
                type="button"
                onClick={() => setAllContactsOpen(true)}
                className="shrink-0 text-sm font-medium text-[#4cd6fb] hover:opacity-80"
              >
                Все контакты
              </button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center pb-1">
            <div className="grid w-full grid-cols-3 gap-4 sm:gap-6">
              <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setAddFavoriteOpen(true)}
                  className="flex size-[clamp(3.75rem,16vmin,6.25rem)] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#3d494d]/30 text-[#bcc9ce] transition-all hover:border-[#4cd6fb]/50 hover:text-[#4cd6fb]"
                >
                  <span className="material-symbols-outlined text-[clamp(1.75rem,8vmin,2.5rem)]">add</span>
                </button>
                <span className="text-center text-[11px] font-medium leading-tight sm:text-xs">Добавить</span>
              </div>

              {[previewSlot1, previewSlot2].map((person, idx) => {
                if (!person) {
                  return (
                    <div
                      key={`empty-fav-${idx}`}
                      className="pointer-events-none flex flex-col items-center justify-center gap-3 opacity-0 sm:gap-4"
                      aria-hidden
                    >
                      <div className="size-[clamp(3.75rem,16vmin,6.25rem)] shrink-0 rounded-full" />
                      <span className="text-[11px]">—</span>
                    </div>
                  )
                }
                const canOpen = favoriteCanTransfer(person)
                const avatarClass =
                  'size-[clamp(3.75rem,16vmin,6.25rem)] shrink-0 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-[#4cd6fb]'
                return (
                  <div key={person.id} className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      disabled={!canOpen}
                      onClick={() => openFavoriteTransfer(person)}
                      className={`group flex flex-col items-center gap-3 sm:gap-4 ${
                        canOpen ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      {person.image ? (
                        <img alt={person.name} className={avatarClass} src={person.image} />
                      ) : (
                        <div
                          className="flex size-[clamp(3.75rem,16vmin,6.25rem)] shrink-0 items-center justify-center rounded-full bg-[#27354c] text-[clamp(1.1rem,5vmin,1.5rem)] font-bold text-[#4cd6fb]"
                        >
                          {person.initials ?? person.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="max-w-full truncate px-0.5 text-center text-[11px] font-medium leading-tight sm:text-xs">
                        {person.name}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="w-full shrink-0 pb-4">
          <h2 className="mb-4 font-headline text-xl font-bold sm:mb-5 sm:text-2xl">История</h2>

          {historyRowsAll.length === 0 ? (
            <p className="rounded-2xl bg-[#112036] px-4 py-8 text-center text-sm text-[#bcc9ce]">
              Пока нет операций по картам и счетам
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {historyPreviewRows.map(({ card, movement }) => (
                  <TransferHistoryRow
                    key={`${card.id}-${movement.id}`}
                    card={card}
                    movement={movement}
                    isUnlocked={isUnlocked}
                    onSelect={openMovementDetail}
                  />
                ))}
              </div>
              {historyRowsAll.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setHistoryAllOpen(true)}
                  className="mt-4 w-full rounded-2xl border border-[#1c2a41] bg-[#112036] py-3.5 text-center text-sm font-semibold text-[#4cd6fb] transition-colors hover:border-[#4cd6fb]/30 hover:bg-[#1c2a41]"
                >
                  Все
                </button>
              ) : null}
            </>
          )}
        </section>
      </main>

      <AppBottomNav activeTab="transfers" isUnlocked={isUnlocked} />

      <CardTransferSheet
        isOpen={transferOpen}
        onClose={() => {
          setTransferOpen(false)
          setPinnedRecipient(null)
        }}
        allUserCards={allUserCards}
        preselectedCardId={preselectedId}
        initialTab={transferInitialTab}
        rates={rates}
        pinnedRecipient={pinnedRecipient}
        onAddToFavorites={() => setFavorites(loadFavoriteRecipients())}
        onTransferComplete={handleTransferComplete}
      />

      <BetweenOwnCardsSheet
        isOpen={betweenOwnOpen}
        onClose={() => setBetweenOwnOpen(false)}
        allUserCards={allUserCards}
        rates={rates}
        onComplete={handleBetweenOwnTransferComplete}
      />

      <AddFavoriteRecipientSheet
        isOpen={addFavoriteOpen}
        onClose={() => setAddFavoriteOpen(false)}
        onSaved={(entry) => {
          addFavoriteRecipient(entry)
          setFavorites(loadFavoriteRecipients())
        }}
      />

      <AllFavoritesContactsSheet
        isOpen={allContactsOpen}
        onClose={() => setAllContactsOpen(false)}
        contacts={favoritesDisplay}
        onPickContact={(person) => {
          setAllContactsOpen(false)
          openFavoriteTransfer(person)
        }}
      />

      <AllTransferHistorySheet
        isOpen={historyAllOpen}
        onClose={() => setHistoryAllOpen(false)}
        rows={historyRowsAll}
        isUnlocked={isUnlocked}
        onSelectRow={(card, movement) => {
          setHistoryAllOpen(false)
          openMovementDetail(card, movement)
        }}
      />

      {movementDetailModel ? (
        <MovementDetailSheet
          overlayZIndexClass="z-[135]"
          card={movementDetailModel.card}
          movement={movementDetailModel.movement}
          allMovements={movementDetailModel.allMovements}
          isUnlocked={isUnlocked}
          onClose={closeMovementDetail}
          onOpenMovement={(m) =>
            setMovementDetailKey({
              cardId: movementDetailModel.card.id,
              movementId: m.id,
            })
          }
        />
      ) : null}

      <ComingSoonSheet
        isOpen={comingSoonOpen}
        title={comingSoonTitle}
        onClose={() => setComingSoonOpen(false)}
      />
    </div>
  )
}
