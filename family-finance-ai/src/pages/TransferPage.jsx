import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import AddFavoriteRecipientSheet from '../components/AddFavoriteRecipientSheet'
import CardTransferSheet from '../components/CardTransferSheet'
import UzsAmount from '../components/UzsAmount'
import useExchangeRates from '../hooks/useExchangeRates'
import { computeAllUserCards } from '../utils/buildHomeUserCardsList'
import { loadCardBalanceDeltas, saveCardBalanceDeltas } from '../utils/cardBalanceDeltas'
import { addFavoriteRecipient, loadFavoriteRecipients } from '../utils/favoriteRecipients'
import { loadPrimaryCardId, loadRemovedRowIds } from '../utils/deletedCards'
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
  const [favorites, setFavorites] = useState(() => loadFavoriteRecipients())
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false)
  const [pinnedRecipient, setPinnedRecipient] = useState(null)

  useEffect(() => {
    const syncBalances = () => setCardBalanceDeltas(loadCardBalanceDeltas())
    const syncFav = () => setFavorites(loadFavoriteRecipients())
    const syncAll = () => {
      syncBalances()
      syncFav()
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
        renamedLabels: {},
        userLinkedCards: [],
      }),
    [cardBalanceDeltas],
  )

  const handleTransferComplete = useCallback((cardId, amountUzs, debitInCardCurrency) => {
    const d = debitInCardCurrency ?? amountUzs
    setCardBalanceDeltas((prev) => {
      const next = { ...prev, [cardId]: (prev[cardId] ?? 0) - d }
      saveCardBalanceDeltas(next)
      return next
    })
  }, [])

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
    <div className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto max-w-4xl space-y-10 px-6 pb-32 pt-24">
        <section>
          <h1 className="mb-8 font-headline text-3xl font-extrabold tracking-tight">Переводы</h1>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <button
              type="button"
              onClick={openPhoneTransfer}
              className="group relative min-h-[220px] cursor-pointer overflow-hidden rounded-3xl bg-[#112036] p-8 text-left transition-colors hover:bg-[#1c2a41] md:col-span-7"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined mb-4 block text-4xl text-[#4cd6fb]">smartphone</span>
                <h3 className="mb-2 text-xl font-bold text-[#d6e3ff]">По номеру телефона</h3>
                <p className="max-w-[220px] text-sm text-[#bcc9ce]">Через СБП мгновенно и без комиссии</p>
              </div>
              <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-[#4cd6fb]/10 blur-3xl transition-colors group-hover:bg-[#4cd6fb]/20" />
              <div className="relative z-10 mt-4 flex items-center text-sm font-semibold text-[#4cd6fb]">
                Начать
                <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
              </div>
            </button>

            <div className="flex cursor-pointer flex-col justify-between rounded-3xl bg-[#0d1c32] p-6 transition-colors hover:bg-[#112036] md:col-span-5">
              <div>
                <span className="material-symbols-outlined mb-3 block text-3xl text-[#b9c7e4]">sync_alt</span>
                <h3 className="text-lg font-bold text-[#d6e3ff]">Между своими</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">Карты и счета</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[#bcc9ce]">Без комиссии</span>
                <span className="material-symbols-outlined text-[#bcc9ce]">chevron_right</span>
              </div>
            </div>

            <button
              type="button"
              onClick={openCardTransfer}
              className="flex cursor-pointer items-center gap-5 rounded-3xl bg-[#0d1c32] p-6 text-left transition-colors hover:bg-[#112036] md:col-span-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112036]">
                <span className="material-symbols-outlined text-[#58d6f1]">credit_card</span>
              </div>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">По номеру карты</h3>
                <p className="text-xs text-[#bcc9ce]">Любого банка мира</p>
              </div>
            </button>

            <div className="flex cursor-pointer items-center gap-5 rounded-3xl bg-[#0d1c32] p-6 transition-colors hover:bg-[#112036] md:col-span-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112036]">
                <span className="material-symbols-outlined text-[#4cd6fb]">account_balance</span>
              </div>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">В другой банк</h3>
                <p className="text-xs text-[#bcc9ce]">По реквизитам счета</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold">Избранное</h2>
            <button className="text-sm font-medium text-[#4cd6fb] hover:opacity-80">Все контакты</button>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
            <div className="flex w-24 flex-shrink-0 flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setAddFavoriteOpen(true)}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#3d494d]/30 text-[#bcc9ce] transition-all hover:border-[#4cd6fb]/50 hover:text-[#4cd6fb]"
              >
                <span className="material-symbols-outlined text-3xl">add</span>
              </button>
              <span className="text-center text-[11px] font-medium">Добавить</span>
            </div>

            {favorites.map((person) => {
              const canOpen = favoriteCanTransfer(person)
              return (
                <button
                  key={person.id}
                  type="button"
                  disabled={!canOpen}
                  onClick={() => openFavoriteTransfer(person)}
                  className={`group flex w-24 flex-shrink-0 flex-col items-center gap-3 ${
                    canOpen ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {person.image ? (
                    <img
                      alt={person.name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-[#4cd6fb]"
                      src={person.image}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#27354c] text-xl font-bold text-[#4cd6fb]">
                      {person.initials ?? person.name.slice(0, 1)}
                    </div>
                  )}
                  <span className="text-center text-[11px] font-medium">{person.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-6 font-headline text-xl font-bold">Быстрые платежи</h2>
          <div className="space-y-4">
            <div className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a41]">
                  <span className="material-symbols-outlined text-[#b9c7e4]">bolt</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Мобильная связь</p>
                  <p className="text-xs text-[#bcc9ce]">Мегафон • +7 (921) ***-44-55</p>
                </div>
              </div>
              <UzsAmount as="span" className="font-bold text-[#d6e3ff]" value="500" />
            </div>

            <div className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a41]">
                  <span className="material-symbols-outlined text-[#58d6f1]">home</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">ЖКУ Квартплата</p>
                  <p className="text-xs text-[#bcc9ce]">ЛС №45930211</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#bcc9ce]">chevron_right</span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold">История</h2>
            <span className="material-symbols-outlined cursor-pointer text-[#bcc9ce]">calendar_today</span>
          </div>

          <div className="space-y-8">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#bcc9ce]">Вчера</p>
              <div className="space-y-6">
                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#4cd6fb]">account_balance</span>
                    </div>
                    <div>
                      <p className="font-semibold">Перевод в Сбербанк</p>
                      <p className="text-xs text-[#bcc9ce]">Александр В. • 14:20</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="− 12 400" />
                    </p>
                    <p className="text-[10px] font-medium text-green-400">Исполнено</p>
                  </div>
                </div>

                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#4cd6fb]">person</span>
                    </div>
                    <div>
                      <p className="font-semibold">Между своими</p>
                      <p className="text-xs text-[#bcc9ce]">С Visa Gold на Мир • 09:12</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="5 000" />
                    </p>
                    <p className="text-[10px] text-[#bcc9ce]">Внутренний</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#bcc9ce]">12 Октября</p>
              <div className="space-y-6">
                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#58d6f1]">shopping_bag</span>
                    </div>
                    <div>
                      <p className="font-semibold">Оплата по QR-коду</p>
                      <p className="text-xs text-[#bcc9ce]">Wildberries • 18:45</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="− 2 850" />
                    </p>
                    <p className="text-[10px] font-medium text-green-400">
                      Кэшбэк <UzsAmount as="span" value="28" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      <AddFavoriteRecipientSheet
        isOpen={addFavoriteOpen}
        onClose={() => setAddFavoriteOpen(false)}
        onSaved={(entry) => {
          addFavoriteRecipient(entry)
          setFavorites(loadFavoriteRecipients())
        }}
      />
    </div>
  )
}
