import { useCallback, useEffect, useMemo, useState } from 'react'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import AddLinkedCardModal from '../components/AddLinkedCardModal'
import CardDetailsSheet from '../components/CardDetailsSheet'
import OpenDepositModal from '../components/OpenDepositModal'
import DepositDetailSheet from '../components/DepositDetailSheet'
import DepositsOverviewSheet from '../components/DepositsOverviewSheet'
import SpecialOffersAllSheet from '../components/SpecialOffersAllSheet'
import PaymentCardListRow from '../components/PaymentCardListRow'
import UzsAmount from '../components/UzsAmount'
import useExchangeRates from '../hooks/useExchangeRates'
import { ACCOUNTS, LINKED_EXTERNAL_CARDS, PRIMARY_BANK_RECREATE } from '../mockData'
import { isSessionUnlocked } from '../utils/sessionLock'
import {
  loadPrimaryCardId,
  loadRemovedRowIds,
  persistPrimaryCardId,
  persistRemovedRowIds,
  saveDeletedCard,
} from '../utils/deletedCards'
import {
  loadDeposits,
  saveDeposits,
  topUpDeposit,
  withdrawFromDeposit,
  createBuiltInDemoDeposits,
} from '../utils/deposits'
import {
  loadDepositCardMovements,
  appendDepositCardMovement,
  buildDepositOutMovement,
  buildDepositInMovement,
} from '../utils/depositCardMovements'
import { SPECIAL_OFFERS } from '../data/specialOffers'

const HOME_OWNER_ID = 'user_1'
const PRIMARY_ACCOUNT_ID = 'acc_tbc_main'
const TRAILING_LIST_ACCOUNT_ID = 'acc_hamkor_current'

function last4FromPan(pan) {
  const d = String(pan).replace(/\D/g, '')
  return d.slice(-4)
}

function depositCountRu(n) {
  const x = Math.abs(n) % 100
  const y = x % 10
  if (x > 10 && x < 20) return `${n} вкладов`
  if (y > 1 && y < 5) return `${n} вклада`
  if (y === 1) return `${n} вклад`
  return `${n} вкладов`
}

export default function HomePage() {
  const isUnlocked = isSessionUnlocked()
  const rates = useExchangeRates()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [userLinkedCards, setUserLinkedCards] = useState([])
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [primaryCardId, setPrimaryCardId] = useState(loadPrimaryCardId)
  const [renamedLabels, setRenamedLabels] = useState({})
  const [removedRowIds, setRemovedRowIds] = useState(loadRemovedRowIds)
  const [deposits, setDeposits] = useState(loadDeposits)
  const [openDepositOpen, setOpenDepositOpen] = useState(false)
  const [depositsOverviewOpen, setDepositsOverviewOpen] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [cardBalanceDeltas, setCardBalanceDeltas] = useState({})
  const [linkedMovementsByCardId, setLinkedMovementsByCardId] = useState(loadDepositCardMovements)
  const [specialOfferIndex, setSpecialOfferIndex] = useState(0)
  const [specialOffersAllOpen, setSpecialOffersAllOpen] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('seedDeposits') !== '1') return
    const cur = loadDeposits()
    if (cur.length > 0) return
    const d = createBuiltInDemoDeposits()
    saveDeposits(d)
    setDeposits(d)
    const next = new URLSearchParams(window.location.search)
    next.delete('seedDeposits')
    const q = next.toString()
    window.history.replaceState(
      {},
      '',
      q ? `${window.location.pathname}?${q}` : window.location.pathname,
    )
  }, [])

  useEffect(() => {
    if (SPECIAL_OFFERS.length <= 1) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    const id = window.setInterval(() => {
      setSpecialOfferIndex((i) => (i + 1) % SPECIAL_OFFERS.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [])

  const handleAddLinkedCard = useCallback((card) => {
    setUserLinkedCards((prev) => [...prev, card])
  }, [])

  const handleCloseAddCard = useCallback(() => {
    setAddCardOpen(false)
  }, [])

  const handleRenameCard = useCallback((cardId, newName) => {
    setRenamedLabels((prev) => ({ ...prev, [cardId]: newName }))
    setSelectedCard((prev) =>
      prev && prev.id === cardId ? { ...prev, sheetTitle: newName } : prev,
    )
  }, [])

  const handleDeleteCard = useCallback(
    (card) => {
      if (!card || (card.kind !== 'linked' && card.kind !== 'account')) return
      const id = card.id
      const label = renamedLabels[id] ?? card.sheetTitle
      const bankName =
        card.bank ??
        (typeof card.detailLine === 'string' ? card.detailLine.split(' · ')[1] : '') ??
        ''
      saveDeletedCard({
        pan: card.pan,
        userLabel: label,
        bank: bankName,
        expires: card.expires,
        processingSystem: card.processingSystem,
        holderName: card.holderName,
        balanceUzs: card.balanceUzs,
      })
      if (card.kind === 'linked') {
        const isUserAdded = userLinkedCards.some((c) => c.id === id)
        if (isUserAdded) {
          setUserLinkedCards((prev) => prev.filter((c) => c.id !== id))
        } else {
          setRemovedRowIds((prev) => {
            if (prev.includes(id)) return prev
            const next = [...prev, id]
            persistRemovedRowIds(next)
            return next
          })
        }
      } else {
        setRemovedRowIds((prev) => {
          if (prev.includes(id)) return prev
          const next = [...prev, id]
          persistRemovedRowIds(next)
          return next
        })
      }
    },
    [renamedLabels, userLinkedCards],
  )

  const handleSetPrimary = useCallback((cardId) => {
    setPrimaryCardId(cardId)
    persistPrimaryCardId(cardId)
  }, [])

  const applyCardDelta = useCallback((cardId, deltaInCardCurrency) => {
    setCardBalanceDeltas((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] ?? 0) + deltaInCardCurrency,
    }))
  }, [])

  const handleDepositCreated = useCallback(
    (deposit, card, amountInCardCurrency) => {
      setDeposits((prev) => {
        const next = [...prev, deposit]
        saveDeposits(next)
        return next
      })
      applyCardDelta(card.id, -amountInCardCurrency)
      const m = buildDepositOutMovement(card, amountInCardCurrency, 'Открытие вклада')
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, m))
      setOpenDepositOpen(false)
      setDepositsOverviewOpen(true)
    },
    [applyCardDelta],
  )

  const handleOpenDepositsEntry = useCallback(() => {
    if (deposits.length === 0) {
      setOpenDepositOpen(true)
    } else {
      setDepositsOverviewOpen(true)
    }
  }, [deposits.length])

  const handleDepositTopUp = useCallback(
    (deposit, depositAmount, card, amountInCardCurrency) => {
      setDeposits((prev) => {
        const next = prev.map((d) =>
          d.id === deposit.id ? topUpDeposit(d, depositAmount, card.id) : d,
        )
        saveDeposits(next)
        return next
      })
      applyCardDelta(card.id, -amountInCardCurrency)
      const mov = buildDepositOutMovement(card, amountInCardCurrency, 'Пополнение вклада')
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, mov))
      setSelectedDeposit((prev) =>
        prev?.id === deposit.id
          ? topUpDeposit(deposit, depositAmount, card.id)
          : prev,
      )
    },
    [applyCardDelta],
  )

  const handleDepositWithdraw = useCallback(
    (deposit, withdrawAmount, card, amountToCard) => {
      setDeposits((prev) => {
        const next = prev.map((d) =>
          d.id === deposit.id ? withdrawFromDeposit(d, withdrawAmount, card.id) : d,
        )
        saveDeposits(next)
        return next
      })
      applyCardDelta(card.id, amountToCard)
      const mov = buildDepositInMovement(card, amountToCard, 'Снятие со вклада')
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, mov))
      setSelectedDeposit((prev) =>
        prev?.id === deposit.id
          ? withdrawFromDeposit(deposit, withdrawAmount, card.id)
          : prev,
      )
    },
    [applyCardDelta],
  )

  const { primaryBank, primaryLinkedItems, otherLinkedBase, accountItems } =
    useMemo(() => {
      const primary = ACCOUNTS.find((a) => a.id === PRIMARY_ACCOUNT_ID)
      const bank = primary?.bank ?? PRIMARY_BANK_RECREATE

      const myAccounts = ACCOUNTS.filter((a) => a.userId === HOME_OWNER_ID)
      const myLinked = LINKED_EXTERNAL_CARDS.filter((c) => c.ownerUserId === HOME_OWNER_ID)

      const primaryLinked = []
      const otherLinked = []
      const accounts = []

      const accountRowFromAcc = (acc) => {
        const last4 = last4FromPan(acc.card.pan)
        const isFx = acc.currency && acc.currency !== 'UZS'
        return {
          id: acc.id,
          kind: 'account',
          bank: acc.bank,
          sheetTitle: acc.label,
          detailLine: `${last4} · ${acc.bank}`,
          balanceUzs: acc.balanceUzs ?? 0,
          foreignCurrency: isFx ? acc.currency : null,
          balanceForeign: isFx && acc.balanceForeign != null ? acc.balanceForeign : null,
          processingSystem: acc.card.processingSystem,
          pan: acc.card.pan,
          last4,
          expires: acc.card.expires,
          holderName: acc.card.holderName,
          movementsAccountId: acc.id,
          linkedMovementsCardId: null,
        }
      }

      myAccounts.forEach((acc) => {
        if (acc.type === 'deposit' || !acc.card || acc.bank !== bank) {
          return
        }
        if (acc.id === TRAILING_LIST_ACCOUNT_ID) {
          return
        }
        accounts.push(accountRowFromAcc(acc))
      })

      const trailingAcc = myAccounts.find((a) => a.id === TRAILING_LIST_ACCOUNT_ID)
      if (trailingAcc?.card && trailingAcc.type !== 'deposit' && trailingAcc.bank === bank) {
        accounts.push(accountRowFromAcc(trailingAcc))
      }

      myLinked.forEach((card) => {
        const balanceUzs = typeof card.balanceUzs === 'number' ? card.balanceUzs : 0
        const last4 = last4FromPan(card.pan)
        const label = card.userLabel?.trim() || 'Карта'
        const row = {
          id: card.id,
          kind: 'linked',
          sheetTitle: label,
          bank: card.bank,
          detailLine: `${last4} · ${card.bank}`,
          balanceUzs,
          processingSystem: card.processingSystem,
          pan: card.pan,
          last4,
          expires: card.expires,
          holderName: card.holderName,
          movementsAccountId: null,
          linkedMovementsCardId: card.id,
        }
        if (card.bank === bank) {
          primaryLinked.push(row)
        } else {
          otherLinked.push(row)
        }
      })

      return {
        primaryBank: bank,
        primaryLinkedItems: primaryLinked,
        otherLinkedBase: otherLinked,
        accountItems: accounts,
      }
    }, [])

  const otherLinkedItems = useMemo(() => {
    const extra = userLinkedCards.map((c) => ({
      id: c.id,
      kind: 'linked',
      sheetTitle: renamedLabels[c.id] ?? c.userLabel?.trim() ?? 'Новая карта',
      bank: c.bank,
      detailLine: `${last4FromPan(c.pan)} · ${c.bank}`,
      balanceUzs: c.balanceUzs,
      processingSystem: c.processingSystem,
      pan: c.pan,
      last4: last4FromPan(c.pan),
      expires: c.expires,
      holderName: c.holderName,
      movementsAccountId: null,
      linkedMovementsCardId: c.id,
    }))
    return [...otherLinkedBase, ...extra]
  }, [otherLinkedBase, userLinkedCards, renamedLabels])

  const visibleOrderedIds = useMemo(() => {
    const skip = (id) => removedRowIds.includes(id)
    const p = primaryLinkedItems.filter((i) => !skip(i.id)).map((i) => i.id)
    const o = otherLinkedItems.filter((i) => !skip(i.id)).map((i) => i.id)
    const a = accountItems.filter((i) => !skip(i.id)).map((i) => i.id)
    return [...p, ...o, ...a]
  }, [primaryLinkedItems, otherLinkedItems, accountItems, removedRowIds])

  const resolvedPrimaryId = useMemo(() => {
    if (visibleOrderedIds.length === 0) return null
    if (primaryCardId != null && visibleOrderedIds.includes(primaryCardId)) return primaryCardId
    return visibleOrderedIds[0]
  }, [visibleOrderedIds, primaryCardId])

  useEffect(() => {
    persistPrimaryCardId(resolvedPrimaryId)
    if (resolvedPrimaryId !== primaryCardId) {
      setPrimaryCardId(resolvedPrimaryId)
    }
  }, [resolvedPrimaryId, primaryCardId])

  const sortedPrimaryLinked = useMemo(() => {
    const items = primaryLinkedItems
      .filter((item) => !removedRowIds.includes(item.id))
      .map((item) => ({
        ...item,
        sheetTitle: renamedLabels[item.id] ?? item.sheetTitle,
      }))
    if (resolvedPrimaryId) {
      const idx = items.findIndex((i) => i.id === resolvedPrimaryId)
      if (idx > 0) {
        const [el] = items.splice(idx, 1)
        items.unshift(el)
      }
    }
    return items
  }, [primaryLinkedItems, removedRowIds, renamedLabels, resolvedPrimaryId])

  const sortedOtherLinked = useMemo(() => {
    const items = otherLinkedItems
      .filter((item) => !removedRowIds.includes(item.id))
      .map((item) => ({
        ...item,
        sheetTitle: renamedLabels[item.id] ?? item.sheetTitle,
      }))
    if (resolvedPrimaryId) {
      const idx = items.findIndex((i) => i.id === resolvedPrimaryId)
      if (idx > 0) {
        const [el] = items.splice(idx, 1)
        items.unshift(el)
      }
    }
    return items
  }, [otherLinkedItems, removedRowIds, renamedLabels, resolvedPrimaryId])

  const sortedAccountItems = useMemo(() => {
    const items = accountItems
      .filter((item) => !removedRowIds.includes(item.id))
      .map((item) => ({
        ...item,
        sheetTitle: renamedLabels[item.id] ?? item.sheetTitle,
      }))
    if (resolvedPrimaryId) {
      const idx = items.findIndex((i) => i.id === resolvedPrimaryId)
      if (idx > 0) {
        const [el] = items.splice(idx, 1)
        items.unshift(el)
      }
    }
    return items
  }, [accountItems, removedRowIds, renamedLabels, resolvedPrimaryId])

  const allUserCards = useMemo(() => {
    const applyDelta = (c) => {
      const d = cardBalanceDeltas[c.id]
      if (!d) return c
      if (c.foreignCurrency) {
        return { ...c, balanceForeign: (c.balanceForeign ?? 0) + d }
      }
      return { ...c, balanceUzs: (c.balanceUzs ?? 0) + d }
    }
    return [
      ...sortedPrimaryLinked.map(applyDelta),
      ...sortedOtherLinked.map(applyDelta),
      ...sortedAccountItems.map(applyDelta),
    ]
  }, [sortedPrimaryLinked, sortedOtherLinked, sortedAccountItems, cardBalanceDeltas])

  const cardsOnlyTotalUzs = useMemo(() => {
    let sum = 0
    const allCardItems = [...sortedPrimaryLinked, ...sortedOtherLinked]
    for (const card of allCardItems) {
      const delta = cardBalanceDeltas[card.id] ?? 0
      sum += (card.balanceUzs ?? 0) + delta
    }
    return Math.round(sum * 100) / 100
  }, [sortedPrimaryLinked, sortedOtherLinked, cardBalanceDeltas])

  const totalPaymentUzsRounded = cardsOnlyTotalUzs

  const balanceValue = isUnlocked ? String(Math.round(totalPaymentUzsRounded)) : '••••••'
  const spendingValue = isUnlocked ? '- 142 500' : '- ••••••'
  const usdValue = isUnlocked ? rates.USD.rate.toLocaleString('ru-RU') : '•••'
  const eurValue = isUnlocked ? rates.EUR.rate.toLocaleString('ru-RU') : '•••'
  const usdDiff = rates.USD.diff
  const eurDiff = rates.EUR.diff

  return (
    <div
      className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]"
      style={{ minHeight: '100dvh' }}
    >
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6">
        {!isUnlocked ? (
          <div className="mb-6 rounded-2xl border border-[#4cd6fb]/20 bg-[#112036]/80 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#bcc9ce]">
            Данные скрыты до разблокировки
          </div>
        ) : null}

        <section className="mb-10">
          <div className="main-card-gradient relative overflow-hidden rounded-3xl p-8 shadow-2xl">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#003642]/70">
                  Баланс карт
                </p>
                <h2 className="text-4xl font-extrabold tracking-tight text-[#003642] md:text-5xl">
                  <UzsAmount
                    as="span"
                    compact
                    compactFrom={1000}
                    value={balanceValue}
                  />
                </h2>
              </div>
              <div className="mt-12 flex items-center justify-between">
                <div className="flex -space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-sm text-[#003642]">
                      credit_card
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-sm text-[#003642]">
                      account_balance_wallet
                    </span>
                  </div>
                </div>
                <button
                  aria-expanded={detailsOpen}
                  className="flex items-center gap-2 rounded-full bg-[#003642] pl-5 pr-7 py-2 text-sm font-bold text-[#4cd6fb] transition-all hover:opacity-90 active:scale-95"
                  onClick={() => setDetailsOpen((open) => !open)}
                  type="button"
                >
                  Детали
                  <span
                    className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                      detailsOpen ? 'rotate-180' : ''
                    }`}
                  >
                    keyboard_arrow_down
                  </span>
                </button>
              </div>
            </div>
          </div>

          {detailsOpen ? (
            <div className="mt-4 space-y-6 rounded-3xl border border-[#4cd6fb]/15 bg-[#0a1628]/90 p-5 shadow-xl backdrop-blur-sm">
              {sortedPrimaryLinked.length > 0 ? (
                <div>
                  <h3 className="mb-3 break-words text-xs font-bold uppercase leading-snug tracking-[0.2em] text-[#4cd6fb]/90">
                    Карты {primaryBank}
                  </h3>
                  <ul className="space-y-3">
                    {sortedPrimaryLinked.map((item) => (
                      <PaymentCardListRow
                        key={item.id}
                        isUnlocked={isUnlocked}
                        item={item}
                        onSelect={setSelectedCard}
                        isPrimary={item.id === resolvedPrimaryId}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#bcc9ce]">
                  Другие карты
                </h3>
                {sortedOtherLinked.length > 0 ? (
                  <ul className="space-y-3">
                    {sortedOtherLinked.map((item) => (
                      <PaymentCardListRow
                        key={item.id}
                        isUnlocked={isUnlocked}
                        item={item}
                        onSelect={setSelectedCard}
                        isPrimary={item.id === resolvedPrimaryId}
                      />
                    ))}
                  </ul>
                ) : null}
                <button
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#4cd6fb]/35 bg-[#112036]/40 py-3.5 text-sm font-semibold text-[#4cd6fb] transition-colors hover:border-[#4cd6fb]/55 hover:bg-[#112036]"
                  onClick={() => setAddCardOpen(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Добавить карту
                </button>
              </div>

              {sortedAccountItems.length > 0 ? (
                <div>
                  <h3 className="mb-3 break-words text-xs font-bold uppercase leading-snug tracking-[0.2em] text-[#58d6f1]/90">
                    Счета {primaryBank}
                  </h3>
                  <ul className="space-y-3">
                    {sortedAccountItems.map((item) => (
                      <PaymentCardListRow
                        key={item.id}
                        isUnlocked={isUnlocked}
                        item={item}
                        onSelect={setSelectedCard}
                        isPrimary={item.id === resolvedPrimaryId}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            className="rounded-2xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#1c2a41]"
            onClick={handleOpenDepositsEntry}
            type="button"
          >
            <div className="flex flex-col gap-2">
              <span className="material-symbols-outlined text-2xl text-[#4cd6fb]">savings</span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">
                  {deposits.length === 0 ? 'Открыть вклад' : 'Вклады'}
                </h3>
                <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">
                  {deposits.length === 0 ? 'До 20% годовых' : depositCountRu(deposits.length)}
                </p>
              </div>
            </div>
          </button>

          <div className="rounded-2xl bg-[#112036] px-4 py-3 transition-colors hover:bg-[#1c2a41]">
            <div className="flex flex-col gap-2">
              <span className="material-symbols-outlined text-2xl text-[#58d6f1]">campaign</span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">Акции</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Кэшбэк до 30%</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#112036] px-4 py-3 transition-colors hover:bg-[#1c2a41]">
            <div className="flex flex-col gap-2">
              <span className="material-symbols-outlined text-2xl text-[#4cd6fb]">
                health_and_safety
              </span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">Страхование</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Защита активов</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#112036] px-4 py-3 transition-colors hover:bg-[#1c2a41]">
            <div className="flex flex-col gap-2">
              <span className="material-symbols-outlined text-2xl text-[#58d6f1]">local_offer</span>
              <div>
                <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">Предложения</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Для вас</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-10 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#d6e3ff]">Специальные предложения</h2>
            <button
              className="text-sm font-medium text-[#4cd6fb]"
              onClick={() => setSpecialOffersAllOpen(true)}
              type="button"
            >
              Все
            </button>
          </div>

          <div className="relative overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${specialOfferIndex * 100}%)` }}
            >
              {SPECIAL_OFFERS.map((o) => (
                <div
                  key={o.id}
                  className="relative flex h-40 min-w-full shrink-0 flex-col justify-end overflow-hidden bg-[#0d1c32] p-6"
                >
                  <img
                    className="absolute inset-0 h-full w-full object-cover opacity-40"
                    alt={o.imageAlt}
                    src={o.image}
                  />
                  <div className="relative z-10">
                    <span
                      className={`mb-2 inline-block rounded-full border px-2 py-1 text-[10px] font-bold ${o.tagClass}`}
                    >
                      {o.tag}
                    </span>
                    <h4 className="text-lg font-bold leading-tight text-[#d6e3ff]">{o.title}</h4>
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {SPECIAL_OFFERS.map((o, i) => (
                <span
                  key={o.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === specialOfferIndex ? 'w-6 bg-[#4cd6fb]' : 'w-1.5 bg-[#4cd6fb]/35'
                  }`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[#d6e3ff]">Виджеты мониторинга</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#112036] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c2a41] text-[#4cd6fb]">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <h4 className="font-bold">Аналитика трат</h4>
                  <p className="text-sm text-[#bcc9ce]">За последние 30 дней</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#ffb4ab]">
                  <UzsAmount as="span" value={spendingValue} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#bcc9ce]">на 12% больше</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[#112036] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c2a41] text-[#58d6f1]">
                  <span className="material-symbols-outlined">currency_exchange</span>
                </div>
                <div>
                  <h4 className="font-bold">Курсы валют</h4>
                  <p className="text-sm text-[#bcc9ce]">USD/UZS · EUR/UZS</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-[#bcc9ce]">USD</p>
                  <p className="font-bold">{usdValue}</p>
                  <p className={`text-[10px] ${usdDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {usdDiff >= 0 ? '+' : ''}
                    {usdDiff}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#bcc9ce]">EUR</p>
                  <p className="font-bold">{eurValue}</p>
                  <p className={`text-[10px] ${eurDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {eurDiff >= 0 ? '+' : ''}
                    {eurDiff}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="home" isUnlocked={isUnlocked} />

      <AddLinkedCardModal
        isOpen={addCardOpen}
        onAdd={handleAddLinkedCard}
        onClose={handleCloseAddCard}
      />

      <CardDetailsSheet
        allUserCards={allUserCards}
        card={selectedCard}
        isOpen={selectedCard != null}
        isUnlocked={isUnlocked}
        linkedMovementsByCardId={linkedMovementsByCardId}
        onClose={() => setSelectedCard(null)}
        onRename={handleRenameCard}
        onDelete={handleDeleteCard}
        onSelectCard={setSelectedCard}
        onSetPrimary={handleSetPrimary}
        isPrimary={selectedCard != null && selectedCard.id === resolvedPrimaryId}
      />

      <SpecialOffersAllSheet
        isOpen={specialOffersAllOpen}
        offers={SPECIAL_OFFERS}
        onClose={() => setSpecialOffersAllOpen(false)}
      />

      <OpenDepositModal
        isOpen={openDepositOpen}
        onClose={() => setOpenDepositOpen(false)}
        allUserCards={allUserCards}
        rates={rates}
        onDepositCreated={handleDepositCreated}
      />

      <DepositsOverviewSheet
        deposits={deposits}
        isOpen={depositsOverviewOpen}
        isUnlocked={isUnlocked}
        onClose={() => setDepositsOverviewOpen(false)}
        onOpenNewDeposit={() => setOpenDepositOpen(true)}
        onSelectDeposit={(dep) => setSelectedDeposit(dep)}
      />

      {selectedDeposit ? (
        <DepositDetailSheet
          deposit={selectedDeposit}
          allUserCards={allUserCards}
          rates={rates}
          onClose={() => setSelectedDeposit(null)}
          onTopUp={handleDepositTopUp}
          onWithdraw={handleDepositWithdraw}
        />
      ) : null}
    </div>
  )
}
