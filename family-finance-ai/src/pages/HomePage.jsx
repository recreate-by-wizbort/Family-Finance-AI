import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import AddLinkedCardModal from '../components/AddLinkedCardModal'
import CardDetailsSheet from '../components/CardDetailsSheet'
import OpenDepositModal from '../components/OpenDepositModal'
import DepositDetailSheet from '../components/DepositDetailSheet'
import DepositsOverviewSheet from '../components/DepositsOverviewSheet'
import SpecialOffersAllSheet from '../components/SpecialOffersAllSheet'
import OpenAccountModal from '../components/OpenAccountModal'
import AccountsOverviewSheet from '../components/AccountsOverviewSheet'
import AccountDetailSheet from '../components/AccountDetailSheet'
import ComingSoonSheet from '../components/ComingSoonSheet'
import CurrencyRatesSheet from '../components/CurrencyRatesSheet'
import PromotionsSheet from '../components/PromotionsSheet'
import OfferDetailSheet from '../components/OfferDetailSheet'
import MicroloanReceiveSheet from '../components/MicroloanReceiveSheet'
import CardTopUpSheet from '../components/CardTopUpSheet'
import AccountWithdrawSheet from '../components/AccountWithdrawSheet'
import CardTransferSheet from '../components/CardTransferSheet'
import PaymentCardListRow from '../components/PaymentCardListRow'
import UzsAmount from '../components/UzsAmount'
import useExchangeRates from '../hooks/useExchangeRates'
import { isSessionUnlocked } from '../utils/sessionLock'
import { computeHomeCardSections } from '../utils/buildHomeUserCardsList'
import { loadCardRenames, loadUserLinkedCards, saveCardRenames, saveUserLinkedCards } from '../utils/homeCardsPersist'
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
  loadUserAccounts,
  saveUserAccounts,
  topUpAccount,
  withdrawFromAccount,
} from '../utils/accounts'
import {
  loadDepositCardMovements,
  appendDepositCardMovement,
  buildDepositOutMovement,
  buildDepositInMovement,
} from '../utils/depositCardMovements'
import { SPECIAL_OFFERS } from '../data/specialOffers'
import { loadCardBalanceDeltas, saveCardBalanceDeltas } from '../utils/cardBalanceDeltas'

function depositCountRu(n) {
  const x = Math.abs(n) % 100
  const y = x % 10
  if (x > 10 && x < 20) return `${n} вкладов`
  if (y > 1 && y < 5) return `${n} вклада`
  if (y === 1) return `${n} вклад`
  return `${n} вкладов`
}

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isUnlocked = isSessionUnlocked()
  const rates = useExchangeRates()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [userLinkedCards, setUserLinkedCards] = useState(() => loadUserLinkedCards())
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [primaryCardId, setPrimaryCardId] = useState(loadPrimaryCardId)
  const [renamedLabels, setRenamedLabels] = useState(() => loadCardRenames())
  const [removedRowIds, setRemovedRowIds] = useState(loadRemovedRowIds)
  const [deposits, setDeposits] = useState(loadDeposits)
  const [openDepositOpen, setOpenDepositOpen] = useState(false)
  const [depositsOverviewOpen, setDepositsOverviewOpen] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [cardBalanceDeltas, setCardBalanceDeltas] = useState(() => loadCardBalanceDeltas())
  const [linkedMovementsByCardId, setLinkedMovementsByCardId] = useState(loadDepositCardMovements)
  const [specialOfferIndex, setSpecialOfferIndex] = useState(0)
  const [specialOffersAllOpen, setSpecialOffersAllOpen] = useState(false)
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonTitle, setComingSoonTitle] = useState('')
  const [currencyRatesOpen, setCurrencyRatesOpen] = useState(false)
  const [promotionsOpen, setPromotionsOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [cardTopUpTarget, setCardTopUpTarget] = useState(null)
  const [accountWithdrawTarget, setAccountWithdrawTarget] = useState(null)
  const [cardTransferOpen, setCardTransferOpen] = useState(false)
  const [cardTransferPreselected, setCardTransferPreselected] = useState(null)
  const [userAccounts, setUserAccounts] = useState(loadUserAccounts)
  const [openAccountOpen, setOpenAccountOpen] = useState(false)
  const [accountsOverviewOpen, setAccountsOverviewOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [microloanReceiveOpen, setMicroloanReceiveOpen] = useState(false)
  const [specialOffersFocusId, setSpecialOffersFocusId] = useState(null)
  const offersTouchRef = useRef({ startX: 0, startY: 0 })
  const offersTimerRef = useRef(null)

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
    const sp = new URLSearchParams(location.search)
    const action = sp.get('open')
    if (!action) return
    if (action === 'deposit') setOpenDepositOpen(true)
    else if (action === 'promotions') setPromotionsOpen(true)
    else if (action === 'offers') {
      setSpecialOffersAllOpen(true)
      const oid = sp.get('offer')
      if (oid) setSpecialOffersFocusId(oid)
    } else if (action === 'deposits') setDepositsOverviewOpen(true)
    else if (action === 'accounts') setAccountsOverviewOpen(true)
    sp.delete('open')
    sp.delete('offer')
    const q = sp.toString()
    window.history.replaceState({}, '', q ? `${window.location.pathname}?${q}` : window.location.pathname)
  }, [location.search])

  useEffect(() => {
    saveCardBalanceDeltas(cardBalanceDeltas)
  }, [cardBalanceDeltas])

  useEffect(() => {
    saveUserLinkedCards(userLinkedCards)
  }, [userLinkedCards])

  useEffect(() => {
    saveCardRenames(renamedLabels)
  }, [renamedLabels])

  useEffect(() => {
    const sync = () => {
      setCardBalanceDeltas(loadCardBalanceDeltas())
      setUserAccounts(loadUserAccounts())
      setUserLinkedCards(loadUserLinkedCards())
      setRenamedLabels(loadCardRenames())
      setLinkedMovementsByCardId(loadDepositCardMovements())
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const resetOffersTimer = useCallback(() => {
    if (offersTimerRef.current) clearInterval(offersTimerRef.current)
    if (SPECIAL_OFFERS.length <= 1) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    offersTimerRef.current = setInterval(() => {
      setSpecialOfferIndex((i) => (i + 1) % SPECIAL_OFFERS.length)
    }, 4000)
  }, [])

  useEffect(() => {
    resetOffersTimer()
    return () => { if (offersTimerRef.current) clearInterval(offersTimerRef.current) }
  }, [resetOffersTimer])

  const handleOffersTouchStart = useCallback((e) => {
    offersTouchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }
  }, [])

  const handleOffersTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - offersTouchRef.current.startX
    const dy = e.changedTouches[0].clientY - offersTouchRef.current.startY
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) {
      setSpecialOfferIndex((i) => (i + 1) % SPECIAL_OFFERS.length)
    } else {
      setSpecialOfferIndex((i) => (i - 1 + SPECIAL_OFFERS.length) % SPECIAL_OFFERS.length)
    }
    resetOffersTimer()
  }, [resetOffersTimer])

  const openComingSoon = useCallback((title) => {
    setComingSoonTitle(title)
    setComingSoonOpen(true)
  }, [])

  const handleCardTopUp = useCallback((card) => {
    setCardTopUpTarget(card)
  }, [])

  const handleCardWithdraw = useCallback((card) => {
    if (card.kind === 'account') {
      setAccountWithdrawTarget(card)
      return
    }
    setSelectedCard(null)
    navigate('/transfers', {
      state: { unlocked: true, openTransfer: true, preselectedCardId: card.id, transferTab: 'card' },
    })
  }, [navigate])

  const handleAddLinkedCard = useCallback((card) => {
    setUserLinkedCards((prev) => [...prev, card])
  }, [])

  const handleCloseAddCard = useCallback(() => {
    setAddCardOpen(false)
  }, [])

  const handleRenameCard = useCallback((cardId, newName) => {
    if (String(cardId).startsWith('uacc_')) {
      setUserAccounts((prev) => {
        const next = prev.map((a) => (a.id === cardId ? { ...a, label: newName } : a))
        saveUserAccounts(next)
        return next
      })
      setSelectedAccount((prev) =>
        prev?.id === cardId ? { ...prev, label: newName } : prev,
      )
    }
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
      if (!String(id).startsWith('uacc_')) {
        saveDeletedCard({
          pan: card.pan,
          userLabel: label,
          bank: bankName,
          expires: card.expires,
          processingSystem: card.processingSystem,
          holderName: card.holderName,
          balanceUzs: card.balanceUzs,
        })
      }
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
      } else if (String(id).startsWith('uacc_')) {
        setUserAccounts((prev) => {
          const next = prev.filter((a) => a.id !== id)
          saveUserAccounts(next)
          return next
        })
        setSelectedAccount((prev) => (prev?.id === id ? null : prev))
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

  const openMicroloanReceive = useCallback(() => {
    setMicroloanReceiveOpen(true)
  }, [])

  const handleMicroloanCredited = useCallback(
    (card, amountUzs) => {
      const isUserUzsAccount = String(card.id).startsWith('uacc_') && !card.foreignCurrency
      if (isUserUzsAccount) {
        setUserAccounts((prev) => {
          const next = prev.map((a) =>
            a.id === card.id ? topUpAccount(a, amountUzs, 'microloan') : a,
          )
          saveUserAccounts(next)
          return next
        })
      } else {
        applyCardDelta(card.id, amountUzs)
      }
      const mov = buildDepositInMovement(
        card,
        amountUzs,
        'Зачисление микрозайма (24% годовых)',
        'Микрозайм 24%',
      )
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, mov))
      setMicroloanReceiveOpen(false)
    },
    [applyCardDelta],
  )

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

  const handleOpenAccountsEntry = useCallback(() => {
    if (userAccounts.length === 0) {
      setOpenAccountOpen(true)
    } else {
      setAccountsOverviewOpen(true)
    }
  }, [userAccounts.length])

  const handleAccountCreated = useCallback((acc, card, amountInCardCurrency) => {
    setUserAccounts((prev) => {
      const next = [...prev, acc]
      saveUserAccounts(next)
      return next
    })
    applyCardDelta(card.id, -amountInCardCurrency)
    const movOut = buildDepositOutMovement(card, amountInCardCurrency, 'Открытие счёта')
    const destShape =
      acc.currency === 'UZS' ? { id: acc.id } : { id: acc.id, foreignCurrency: acc.currency }
    const movIn = buildDepositInMovement(
      destShape,
      acc.amount,
      'Начальное пополнение',
      'Открытие счёта',
    )
    setLinkedMovementsByCardId((prev) => {
      const p = appendDepositCardMovement(prev, card.id, movOut)
      return appendDepositCardMovement(p, acc.id, movIn)
    })
    setOpenAccountOpen(false)
    setAccountsOverviewOpen(true)
    setSelectedAccount(acc)
  }, [applyCardDelta])

  const handleAccountTopUp = useCallback((account, amount, card, amountInCardCurrency) => {
    setUserAccounts((prev) => {
      const next = prev.map((a) => a.id === account.id ? topUpAccount(a, amount, card.id) : a)
      saveUserAccounts(next)
      return next
    })
    applyCardDelta(card.id, -amountInCardCurrency)
    const mov = buildDepositOutMovement(card, amountInCardCurrency, 'Пополнение счёта')
    setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, mov))
    setSelectedAccount((prev) => prev?.id === account.id ? topUpAccount(account, amount, card.id) : prev)
  }, [applyCardDelta])

  const handleAccountWithdraw = useCallback((account, amount, card, amountToCard) => {
    setUserAccounts((prev) => {
      const next = prev.map((a) => a.id === account.id ? withdrawFromAccount(a, amount, card.id) : a)
      saveUserAccounts(next)
      return next
    })
    applyCardDelta(card.id, amountToCard)
    const mov = buildDepositInMovement(card, amountToCard, 'Снятие со счёта')
    setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, card.id, mov))
    setSelectedAccount((prev) => prev?.id === account.id ? withdrawFromAccount(account, amount, card.id) : prev)
  }, [applyCardDelta])

  const handleCardTopUpComplete = useCallback((sourceId, sourceType, amount) => {
    const target = cardTopUpTarget
    const isUserUzsAccount = target?.id?.startsWith('uacc_') && !target.foreignCurrency
    if (isUserUzsAccount) {
      setUserAccounts((prev) => {
        const next = prev.map((a) =>
          a.id === target.id ? topUpAccount(a, amount, sourceId) : a,
        )
        saveUserAccounts(next)
        return next
      })
    } else if (target) {
      applyCardDelta(target.id, amount)
    }
    applyCardDelta(sourceId, -amount)
    const movIn = buildDepositInMovement(
      target,
      amount,
      `Пополнение с ${sourceType === 'deposit' ? 'вклада' : 'карты'}`,
      target.kind === 'account' ? 'Пополнение счёта' : 'Пополнение',
    )
    setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, target.id, movIn))
    const destPhrase =
      target.kind === 'account'
        ? `счёт «${target.sheetTitle}»`
        : `карту «${target.sheetTitle}»`
    const movOut = buildDepositOutMovement({ id: sourceId }, amount, `Перевод на ${destPhrase}`)
    setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, sourceId, movOut))
    setCardTopUpTarget(null)
  }, [cardTopUpTarget, applyCardDelta])

  const handleAccountWithdrawComplete = useCallback(
    ({ accountRow, destCard, debitFromAccount, creditToDest }) => {
      if (String(accountRow.id).startsWith('uacc_')) {
        setUserAccounts((prev) => {
          const next = prev.map((a) =>
            a.id === accountRow.id ? withdrawFromAccount(a, debitFromAccount, destCard.id) : a,
          )
          saveUserAccounts(next)
          return next
        })
        setCardBalanceDeltas((prev) => ({
          ...prev,
          [destCard.id]: (prev[destCard.id] ?? 0) + creditToDest,
        }))
      } else {
        setCardBalanceDeltas((prev) => ({
          ...prev,
          [accountRow.id]: (prev[accountRow.id] ?? 0) - debitFromAccount,
          [destCard.id]: (prev[destCard.id] ?? 0) + creditToDest,
        }))
      }
      const movOut = buildDepositOutMovement(
        accountRow,
        debitFromAccount,
        `На «${destCard.sheetTitle}» · •••• ${destCard.last4}`,
        'Снятие со счёта',
      )
      const movIn = buildDepositInMovement(
        destCard,
        creditToDest,
        `Со счёта «${accountRow.sheetTitle}»`,
        'Пополнение со счёта',
      )
      setLinkedMovementsByCardId((prev) => {
        const withOut = appendDepositCardMovement(prev, accountRow.id, movOut)
        return appendDepositCardMovement(withOut, destCard.id, movIn)
      })
      setAccountWithdrawTarget(null)
    },
    [],
  )

  const {
    primaryBank,
    sortedPrimaryLinked,
    sortedOtherLinked,
    sortedAccountItems,
    allUserCards,
    resolvedPrimaryId,
  } = useMemo(
    () =>
      computeHomeCardSections({
        cardBalanceDeltas,
        removedRowIds,
        primaryCardId,
        renamedLabels,
        userLinkedCards,
        userAccounts,
      }),
    [
      cardBalanceDeltas,
      removedRowIds,
      primaryCardId,
      renamedLabels,
      userLinkedCards,
      userAccounts,
    ],
  )

  useEffect(() => {
    persistPrimaryCardId(resolvedPrimaryId)
    if (resolvedPrimaryId !== primaryCardId) {
      setPrimaryCardId(resolvedPrimaryId)
    }
  }, [resolvedPrimaryId, primaryCardId])

  const handleTransferComplete = useCallback(
    (cardId, amountUzs, debitInCardCurrency, sourceCard) => {
      const d = debitInCardCurrency ?? amountUzs
      applyCardDelta(cardId, -d)
      const card =
        sourceCard ?? allUserCards.find((c) => c.id === cardId) ?? { id: cardId }
      const mov = buildDepositOutMovement(card, d, 'Исходящий перевод', 'Перевод')
      setLinkedMovementsByCardId((prev) => appendDepositCardMovement(prev, cardId, mov))
    },
    [applyCardDelta, allUserCards],
  )

  const cardsOnlyTotalUzs = useMemo(() => {
    let sum = 0
    for (const card of [...sortedPrimaryLinked, ...sortedOtherLinked]) {
      sum += card.balanceUzs ?? 0
    }
    return Math.round(sum * 100) / 100
  }, [sortedPrimaryLinked, sortedOtherLinked])

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
                  <UzsAmount as="span" currencyClassName="!text-inherit" value={balanceValue} />
                </h2>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openComingSoon('Оплата по QR')}
                    className="flex h-10 items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 backdrop-blur-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm text-[#003642]">qr_code_scanner</span>
                    <span className="text-[11px] font-semibold text-[#003642]">QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openComingSoon('Оплата по NFC')}
                    className="flex h-10 items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 backdrop-blur-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm text-[#003642]">contactless</span>
                    <span className="text-[11px] font-semibold text-[#003642]">NFC</span>
                  </button>
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
                  <h3 className="mb-1.5 break-words text-xs font-bold uppercase leading-snug tracking-[0.2em] text-[#4cd6fb]/90">
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
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#bcc9ce]">
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
                  <h3 className="mb-1.5 break-words text-xs font-bold uppercase leading-snug tracking-[0.2em] text-[#58d6f1]/90">
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

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#58d6f1]/35 bg-[#112036]/40 py-3.5 text-sm font-semibold text-[#58d6f1] transition-colors hover:border-[#58d6f1]/55 hover:bg-[#112036]"
                onClick={() => setOpenAccountOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Открыть новый счёт
              </button>
            </div>
          ) : null}
        </section>

        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            className="relative rounded-2xl bg-[#112036] px-4 py-3 pr-12 text-left transition-colors hover:bg-[#1c2a41]"
            onClick={handleOpenDepositsEntry}
            type="button"
          >
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-2xl leading-none text-[#4cd6fb]">
              savings
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">
                {deposits.length === 0 ? 'Открыть вклад' : 'Вклады'}
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">
                {deposits.length === 0 ? 'До 20% годовых' : depositCountRu(deposits.length)}
              </p>
            </div>
          </button>

          <button
            className="relative rounded-2xl bg-[#112036] px-4 py-3 pr-12 text-left transition-colors hover:bg-[#1c2a41]"
            onClick={() => setPromotionsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-2xl leading-none text-[#58d6f1]">
              campaign
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">Акции</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Кэшбэк до 30%</p>
            </div>
          </button>

          <button
            className="relative rounded-2xl bg-[#112036] px-4 py-3 pr-12 text-left transition-colors hover:bg-[#1c2a41]"
            onClick={() => openComingSoon('Страхование')}
            type="button"
          >
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-2xl leading-none text-[#4cd6fb]">
              health_and_safety
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">Страхование</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Защита активов</p>
            </div>
          </button>

          <button
            className="relative rounded-2xl bg-[#112036] px-4 py-3 pr-12 text-left transition-colors hover:bg-[#1c2a41]"
            onClick={() => navigate('/advise-ai', { state: { from: '/home', unlocked: true } })}
            type="button"
          >
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-2xl leading-none text-[#58d6f1]">
              smart_toy
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight text-[#d6e3ff]">AI ассистент</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-[#bcc9ce]">Советы и анализ</p>
            </div>
          </button>
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#d6e3ff]">Специальные предложения</h2>
            <button
              className="shrink-0 rounded-full border border-[#4cd6fb]/55 bg-[#112036]/80 px-3.5 py-1.5 text-sm font-semibold text-[#4cd6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[#58d6f1] hover:bg-[#1c2a41] hover:text-[#58d6f1] active:scale-[0.98]"
              onClick={() => setSpecialOffersAllOpen(true)}
              type="button"
            >
              Все
            </button>
          </div>

          <div
            className="relative w-full overflow-hidden rounded-3xl"
            onTouchStart={handleOffersTouchStart}
            onTouchEnd={handleOffersTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform"
              style={{
                width: `${SPECIAL_OFFERS.length * 100}%`,
                transform: `translateX(-${(100 / SPECIAL_OFFERS.length) * specialOfferIndex}%)`,
              }}
            >
              {SPECIAL_OFFERS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOffer(o)}
                  style={{ width: `${100 / SPECIAL_OFFERS.length}%` }}
                  className="relative box-border flex h-40 shrink-0 flex-col justify-end bg-[#0d1c32] p-6 text-left"
                >
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <img
                      className={`h-full w-full object-cover opacity-40 ${o.coverImageClass ?? ''}`}
                      alt={o.imageAlt}
                      src={o.image}
                    />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <span
                      className={`mb-2 inline-block max-w-full rounded-full border px-2.5 py-1 text-[10px] font-bold leading-tight shadow-sm ${o.tagClass}`}
                    >
                      {o.tag}
                    </span>
                    <h4 className="line-clamp-2 text-base font-bold leading-snug text-[#d6e3ff] sm:text-lg">
                      {o.title}
                    </h4>
                  </div>
                </button>
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
            <button
              type="button"
              onClick={() => navigate('/monitoring', { state: { unlocked: true } })}
              className="flex w-full items-center justify-between rounded-2xl bg-[#112036] p-6 text-left transition-colors hover:bg-[#1c2a41]"
            >
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
                  <UzsAmount as="span" currencyClassName="!text-inherit" value={spendingValue} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#bcc9ce]">на 12% больше</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCurrencyRatesOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl bg-[#112036] p-6 text-left transition-colors hover:bg-[#1c2a41]"
            >
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
            </button>
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
        onTopUp={handleCardTopUp}
        onWithdraw={handleCardWithdraw}
        deposits={deposits}
      />

      <SpecialOffersAllSheet
        isOpen={specialOffersAllOpen}
        offers={SPECIAL_OFFERS}
        initialOfferId={specialOffersFocusId}
        onClose={() => {
          setSpecialOffersAllOpen(false)
          setSpecialOffersFocusId(null)
        }}
        onMicroloanReceive={openMicroloanReceive}
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

      <ComingSoonSheet
        isOpen={comingSoonOpen}
        title={comingSoonTitle}
        onClose={() => setComingSoonOpen(false)}
      />

      <CurrencyRatesSheet
        isOpen={currencyRatesOpen}
        liveRates={rates}
        onClose={() => setCurrencyRatesOpen(false)}
      />

      <PromotionsSheet
        isOpen={promotionsOpen}
        onClose={() => setPromotionsOpen(false)}
      />

      <OfferDetailSheet
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onMicroloanReceive={openMicroloanReceive}
      />

      <MicroloanReceiveSheet
        isOpen={microloanReceiveOpen}
        onClose={() => setMicroloanReceiveOpen(false)}
        allUserCards={allUserCards}
        onCredited={handleMicroloanCredited}
      />

      <OpenAccountModal
        isOpen={openAccountOpen}
        onClose={() => setOpenAccountOpen(false)}
        allUserCards={allUserCards}
        rates={rates}
        onAccountCreated={handleAccountCreated}
      />

      <AccountsOverviewSheet
        accounts={userAccounts}
        isOpen={accountsOverviewOpen}
        isUnlocked={isUnlocked}
        onClose={() => setAccountsOverviewOpen(false)}
        onOpenNew={() => setOpenAccountOpen(true)}
        onSelectAccount={(acc) => setSelectedAccount(acc)}
      />

      {selectedAccount ? (
        <AccountDetailSheet
          account={selectedAccount}
          allUserCards={allUserCards}
          rates={rates}
          onClose={() => setSelectedAccount(null)}
          onTopUp={handleAccountTopUp}
          onWithdraw={handleAccountWithdraw}
        />
      ) : null}

      <CardTopUpSheet
        isOpen={cardTopUpTarget != null}
        onClose={() => setCardTopUpTarget(null)}
        targetCard={cardTopUpTarget}
        allUserCards={allUserCards}
        deposits={deposits}
        onTopUpComplete={handleCardTopUpComplete}
      />

      <AccountWithdrawSheet
        accountRow={accountWithdrawTarget}
        allUserCards={allUserCards}
        isOpen={accountWithdrawTarget != null}
        onClose={() => setAccountWithdrawTarget(null)}
        onWithdrawComplete={handleAccountWithdrawComplete}
        rates={rates}
      />

      <CardTransferSheet
        isOpen={cardTransferOpen}
        onClose={() => setCardTransferOpen(false)}
        allUserCards={allUserCards}
        preselectedCardId={cardTransferPreselected}
        initialTab="card"
        rates={rates}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  )
}
