import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { askAI } from '../api'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import SubpageCloseButton from '../components/SubpageCloseButton'
import { ACCOUNTS, TRANSACTIONS } from '../mockData'
import { matchFAQ, CLARIFICATION_MSG, TOO_SHORT_MSG, buildSystemPrompt } from '../mockDataAI'
import { generateDynamicResponse, USER_PROFILE } from '../analysisEngine'
import { isSessionUnlocked } from '../utils/sessionLock'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(v) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(v))
}

function monthKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekRange(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + 1)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { start: mon, end: sun }
}

function monthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function yearRange(year) {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) }
}

function toInputDateValue(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfDay(dateValue) {
  const date = new Date(dateValue)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(dateValue) {
  const date = new Date(dateValue)
  date.setHours(23, 59, 59, 999)
  return date
}

function formatPeriodLabel(type, range) {
  const opts = { day: 'numeric', month: 'short' }
  if (type === 'week') {
    return `${range.start.toLocaleDateString('ru-RU', opts)} – ${range.end.toLocaleDateString('ru-RU', opts)} ${range.end.getFullYear()}`
  }
  if (type === 'month') {
    const m = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(range.start)
    return `${m[0].toUpperCase() + m.slice(1)} ${range.start.getFullYear()}`
  }
  return `${range.start.getFullYear()} год`
}

function parseMessageActions(text) {
  const actions = []
  const cleanText = text
    .replace(/\[КНОПКА:\s*([^\]]+)\]/gi, (_, label) => {
      actions.push(label.trim())
      return ''
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { cleanText, actions: actions.filter(isMeaningfulActionLabel) }
}

const NON_ACTIONABLE_PATTERNS = [
  /^текст$/i,
  /^text$/i,
  /применить.*рекомендаци/i,
  /применить.*все/i,
  /^применить$/i,
  /подробн.*отчёт/i,
  /подробн.*отчет/i,
  /сравнить.*период/i,
]

function isMeaningfulActionLabel(label) {
  const normalized = String(label || '').trim()
  if (!normalized || normalized.length < 4) return false
  return !NON_ACTIONABLE_PATTERNS.some((p) => p.test(normalized))
}

function computeResponseDelayMs(inputText) {
  return Math.min(1000, Math.max(180, String(inputText || '').trim().length * 14))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeAssistantResponse(rawText) {
  let text = String(rawText || '')
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()

  const lines = text.split('\n').map((line) => line.trim())
  const thoughtLinePattern = /^(we need|let'?s|analysis|reasoning|user says|so we need|i should|thinking|draft)/i
  const thoughtLines = lines.filter((line) => thoughtLinePattern.test(line)).length
  if (thoughtLines > 0) {
    const quoted = text.match(/[«"]([\s\S]*?)[»"]/)
    if (quoted?.[1]?.trim()) {
      text = quoted[1].trim()
    } else {
      text = lines.filter((line) => line && !thoughtLinePattern.test(line)).join('\n').trim()
    }
  }

  return text || 'Не удалось сформировать итоговый ответ. Попробуйте уточнить вопрос.'
}

function buildChatHistoryContext(messages) {
  if (!messages.length) return 'История диалога пока пустая.'
  return messages
    .map((m) => `${m.role === 'assistant' ? 'Ассистент' : 'Пользователь'}: ${(m.text || '').trim()}`)
    .join('\n')
}

function buildCategoryEventsContext(events) {
  if (!events.length) return 'Категории в этой сессии ещё не выбирались.'
  return events
    .map((e, idx) => `${idx + 1}. ${e}`)
    .join('\n')
}

function buildBudgetContext(range) {
  const totalBalance = ACCOUNTS.reduce((s, a) => s + Number(a.balanceUzs || 0), 0)
  const filtered = TRANSACTIONS.filter((tx) => {
    const t = new Date(tx.timestamp).getTime()
    return t >= range.start.getTime() && t <= range.end.getTime()
  })
  const income = filtered.filter((t) => t.direction === 'in').reduce((s, t) => s + Number(t.amountUzs || 0), 0)
  const expenses = filtered.filter((t) => t.direction === 'out').reduce((s, t) => s + Number(t.amountUzs || 0), 0)
  const cats = filtered
    .filter((t) => t.direction === 'out')
    .reduce((m, t) => { const k = t.category || 'other'; m.set(k, (m.get(k) || 0) + Number(t.amountUzs || 0)); return m }, new Map())
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, a]) => `${c}: ${formatMoney(a)} сум`)
  return [
    `Баланс: ${formatMoney(totalBalance)} сум`,
    `Доходы за период: ${formatMoney(income)} сум`,
    `Расходы за период: ${formatMoney(expenses)} сум`,
    `Топ категорий: ${top.join(', ')}`,
    `Транзакций в периоде: ${filtered.length}`,
  ].join('\n')
}

// ─── Typing animation ──────────────────────────────────────────────────────────

function TypingText({ text, speed = 24, onDone, startDelayMs = 0 }) {
  const [idx, setIdx] = useState(0)
  const [isStarted, setIsStarted] = useState(startDelayMs <= 0)
  const doneRef = useRef(false)

  useEffect(() => {
    setIdx(0)
    setIsStarted(startDelayMs <= 0)
    doneRef.current = false
  }, [text, startDelayMs])

  useEffect(() => {
    if (startDelayMs <= 0) return undefined
    const t = setTimeout(() => setIsStarted(true), startDelayMs)
    return () => clearTimeout(t)
  }, [startDelayMs])

  useEffect(() => {
    if (!isStarted) return undefined
    if (idx >= text.length) {
      if (!doneRef.current) { doneRef.current = true; onDone?.() }
      return
    }
    const t = setTimeout(() => setIdx((i) => i + 1), speed)
    return () => clearTimeout(t)
  }, [idx, text, speed, onDone, isStarted])

  return (
    <>
      {isStarted ? text.slice(0, idx) : ''}
      {isStarted && idx < text.length ? <span className="inline-block w-2 animate-pulse bg-[#4cd6fb]/60">&#8203;</span> : null}
    </>
  )
}

// ─── Month/Year Picker ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const CALENDAR_WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function parseInputDateValue(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function formatInputDisplay(value) {
  const date = parseInputDateValue(value)
  if (!date) return 'ДД / ММ / ГГГГ'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd} / ${mm} / ${yyyy}`
}

function shiftMonth(view, delta) {
  const moved = new Date(view.year, view.month + delta, 1)
  return { year: moved.getFullYear(), month: moved.getMonth() }
}

function buildCalendarDays(viewYear, viewMonth) {
  const firstDay = new Date(viewYear, viewMonth, 1)
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstWeekDay = (firstDay.getDay() + 6) % 7
  const result = []

  for (let i = firstWeekDay - 1; i >= 0; i -= 1) {
    const date = new Date(viewYear, viewMonth, -i)
    result.push({ date, inCurrentMonth: false })
  }
  for (let d = 1; d <= totalDays; d += 1) {
    result.push({ date: new Date(viewYear, viewMonth, d), inCurrentMonth: true })
  }
  while (result.length % 7 !== 0 || result.length < 35) {
    const nextIndex = result.length - (firstWeekDay + totalDays) + 1
    result.push({ date: new Date(viewYear, viewMonth + 1, nextIndex), inCurrentMonth: false })
  }

  return result
}

function MonthPicker({ onSelect }) {
  const [year, setYear] = useState(2026)
  return (
    <div className="rounded-2xl border border-[#2f3d52] bg-[#0d1c32] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="text-[#4cd6fb] transition hover:brightness-125" onClick={() => setYear((y) => y - 1)}>
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        <span className="text-sm font-bold text-[#d6e3ff]">{year}</span>
        <button type="button" className="text-[#4cd6fb] transition hover:brightness-125" onClick={() => setYear((y) => y + 1)}>
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            className="rounded-xl bg-[#112036] px-2 py-2 text-xs font-semibold text-[#d6e3ff] transition hover:bg-[#1c2a41] hover:text-[#4cd6fb]"
            onClick={() => onSelect(year, i)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

function YearPicker({ onSelect }) {
  const years = [2024, 2025, 2026, 2027]
  return (
    <div className="flex flex-wrap gap-2">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          className="rounded-xl border border-[#2f3d52] bg-[#0d1c32] px-5 py-2.5 text-sm font-bold text-[#d6e3ff] transition hover:border-[#4cd6fb]/50 hover:bg-[#112036]"
          onClick={() => onSelect(y)}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

function CalendarDateField({
  fieldRef,
  label,
  value,
  isOpen,
  onOpen,
  onClose,
  onChange,
  view,
  onViewChange,
}) {
  const selectedDate = parseInputDateValue(value)
  const today = toInputDateValue(new Date())
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(view.year, view.month, 1))
  const days = buildCalendarDays(view.year, view.month)

  return (
    <div ref={fieldRef} className="relative">
      <label className="mb-1 block text-xs text-[#bcc9ce]">{label}</label>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
          isOpen
            ? 'border-[#4cd6fb] bg-[#0f243f] text-[#d6e3ff] shadow-[0_0_0_1px_rgba(76,214,251,0.2)]'
            : 'border-[#2f3d52] bg-[#112036] text-[#d6e3ff] hover:border-[#4cd6fb]/50'
        }`}
        onClick={() => (isOpen ? onClose() : onOpen())}
      >
        <span>{formatInputDisplay(value)}</span>
        <span className="material-symbols-outlined text-base text-[#b9c7e4]">calendar_month</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 z-30 mt-2 w-[320px] max-w-[calc(100vw-3rem)] rounded-2xl border border-[#2f3d52] bg-[#0b1728] p-3 shadow-2xl shadow-black/50">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="text-[#b9c7e4] transition hover:text-[#4cd6fb]" onClick={() => onViewChange(shiftMonth(view, -1))}>
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <div className="text-sm font-bold capitalize text-[#d6e3ff]">{monthLabel}</div>
            <button type="button" className="text-[#b9c7e4] transition hover:text-[#4cd6fb]" onClick={() => onViewChange(shiftMonth(view, 1))}>
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {CALENDAR_WEEK_DAYS.map((weekDay, idx) => (
              <div key={weekDay} className={idx >= 5 ? 'text-[#ff7a7a]' : 'text-[#869398]'}>
                {weekDay}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, inCurrentMonth }) => {
              const dateValue = toInputDateValue(date)
              const isSelected = value === dateValue
              const jsDay = date.getDay()
              const isWeekend = jsDay === 0 || jsDay === 6
              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => {
                    onChange(dateValue)
                    onViewChange({ year: date.getFullYear(), month: date.getMonth() })
                    onClose()
                  }}
                  className={`h-9 rounded-lg text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] text-[#003642]'
                      : inCurrentMonth
                        ? (isWeekend ? 'text-[#ff7a7a] hover:bg-[#1d2a3f]' : 'text-[#d6e3ff] hover:bg-[#1d2a3f]')
                        : 'text-[#5f6c80] hover:bg-[#16243a]'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex justify-between">
            <button type="button" className="text-xs font-semibold text-[#869398] transition hover:text-[#d6e3ff]" onClick={() => onChange('')}>
              Очистить
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-[#4cd6fb] transition hover:brightness-125"
              onClick={() => {
                onChange(today)
                const td = parseInputDateValue(today)
                onViewChange({ year: td.getFullYear(), month: td.getMonth() })
                onClose()
              }}
            >
              Сегодня
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Category tree (structure only — responses are generated dynamically) ──────

const CATEGORY_TREE = {
  personal: [
    { id: 'expenses', label: '📊 Расходы', subs: [
      { id: 'food', label: '🍔 Еда и кафе', goals: [
        { id: 'food_why', label: 'Почему выросли?' },
        { id: 'food_save', label: 'Как сэкономить?' },
        { id: 'food_compare', label: 'Сравнить с прошлым' },
      ]},
      { id: 'transport', label: '🚕 Транспорт', goals: [
        { id: 'tr_why', label: 'Почему выросли?' },
        { id: 'tr_save', label: 'Как оптимизировать?' },
      ]},
      { id: 'subscriptions', label: '📱 Подписки', goals: [
        { id: 'sub_list', label: 'Мои подписки' },
        { id: 'sub_cut', label: 'Что отключить?' },
      ]},
      { id: 'utilities', label: '🏠 Коммунальные', goals: [
        { id: 'ut_overview', label: 'Обзор платежей' },
        { id: 'ut_save', label: 'Как сократить?' },
      ]},
      { id: 'marketplace', label: '🛒 Маркетплейсы', goals: [
        { id: 'mp_total', label: 'Сколько потрачено?' },
        { id: 'mp_save', label: 'Как контролировать?' },
      ]},
      { id: 'health', label: '💊 Здоровье', goals: [
        { id: 'h_overview', label: 'Расходы на здоровье' },
      ]},
      { id: 'entertainment', label: '🎮 Развлечения', goals: [
        { id: 'ent_overview', label: 'Обзор расходов' },
      ]},
      { id: 'clothing', label: '👗 Одежда', goals: [
        { id: 'cl_overview', label: 'Расходы на одежду' },
      ]},
      { id: 'education', label: '📚 Образование', goals: [
        { id: 'edu_overview', label: 'Расходы на обучение' },
      ]},
    ]},
    { id: 'income', label: '💰 Доходы', subs: [
      { id: 'salary', label: '💼 Зарплата', goals: [
        { id: 'sal_analysis', label: 'Анализ поступлений' },
      ]},
      { id: 'passive', label: '📈 Пассивный доход', goals: [
        { id: 'pas_overview', label: 'Проценты и кэшбэк' },
      ]},
    ]},
    { id: 'goals', label: '🎯 Цели', subs: [
      { id: 'g_car', label: '🚗 Машина', goals: [
        { id: 'car_prog', label: 'Прогресс' },
        { id: 'car_fast', label: 'Как ускорить?' },
      ]},
      { id: 'g_vacation', label: '🏖 Отпуск', goals: [
        { id: 'vac_prog', label: 'Прогресс' },
        { id: 'vac_fast', label: 'Как ускорить?' },
      ]},
      { id: 'g_safety', label: '🛡 Подушка', goals: [
        { id: 'saf_prog', label: 'Прогресс' },
        { id: 'saf_advice', label: 'Рекомендация' },
      ]},
      { id: 'g_housing', label: '🏠 Жильё', goals: [
        { id: 'house_plan', label: 'Спланировать' },
      ]},
    ]},
    { id: 'forecast', label: '📅 Прогноз', subs: [
      { id: 'f_endperiod', label: '📆 До конца периода', goals: [
        { id: 'end_enough', label: 'Хватит ли?' },
        { id: 'end_save', label: 'Сколько отложить?' },
      ]},
      { id: 'f_next', label: '📊 Следующий период', goals: [
        { id: 'next_pred', label: 'Прогноз расходов' },
        { id: 'next_plan', label: 'Как спланировать?' },
      ]},
    ]},
    { id: 'optimize', label: '💡 Оптимизация', subs: [
      { id: 'o_where', label: '✂️ Где сэкономить', goals: [
        { id: 'opt_tips', label: 'Рекомендации' },
      ]},
      { id: 'o_auto', label: '🔄 Автоматизация', goals: [
        { id: 'auto_tips', label: 'Что автоматизировать?' },
      ]},
      { id: 'o_compare', label: '📊 Сравнение периодов', goals: [
        { id: 'cmp_detail', label: 'Детальное сравнение' },
      ]},
    ]},
  ],
  family: [
    { id: 'fam_overview', label: '👨‍👩‍👦 Обзор семьи', subs: [
      { id: 'fw_spend', label: '💳 Кто сколько тратит', goals: [
        { id: 'fw_break', label: 'Разбивка' },
        { id: 'fw_anom', label: 'Аномалии' },
      ]},
      { id: 'fw_transfers', label: '🔄 Переводы', goals: [
        { id: 'ftr_over', label: 'Обзор переводов' },
        { id: 'ftr_opt', label: 'Оптимизация' },
      ]},
    ]},
    { id: 'fam_goals', label: '🎯 Семейные цели', subs: [
      { id: 'fg_common', label: '🏠 Общие цели', goals: [
        { id: 'fg_prog', label: 'Прогресс' },
        { id: 'fg_dist', label: 'Распределение' },
      ]},
      { id: 'fg_surprise', label: '🎁 Сюрприз-цель', goals: [
        { id: 'fs_create', label: 'Создать' },
        { id: 'fs_status', label: 'Статус' },
      ]},
    ]},
    { id: 'fam_budget', label: '💰 Семейный бюджет', subs: [
      { id: 'fb_reserve', label: '🏦 Резерв', goals: [
        { id: 'fbr_stat', label: 'Состояние' },
        { id: 'fbr_plan', label: 'План' },
      ]},
      { id: 'fb_optimize', label: '✂️ Оптимизация', goals: [
        { id: 'fbo_tips', label: 'Где сэкономить?' },
        { id: 'fbo_cmp', label: 'Сравнение' },
      ]},
    ]},
    { id: 'fam_kids', label: '👶 Дети', subs: [
      { id: 'fk_spending', label: '💳 Расходы', goals: [
        { id: 'fk_detail', label: 'Детальный отчёт' },
      ]},
      { id: 'fk_limits', label: '🎮 Лимиты', goals: [
        { id: 'fk_set', label: 'Настроить лимиты' },
      ]},
      { id: 'fk_edu', label: '📚 Образование', goals: [
        { id: 'fk_edu_d', label: 'Расходы на обучение' },
      ]},
    ]},
  ],
}

// ─── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'advice_ai_greeted'
let _sessionGreeted = false

const HELLO_TEXT = `Здравствуйте, ${USER_PROFILE.name}! Я ваш персональный финансовый помощник от RECREATE BY WIZBORT. Выберите тему ниже или задайте свободный вопрос.`

// ─── Main component ────────────────────────────────────────────────────────────

export default function AdviceAIPage() {
  const isUnlocked = isSessionUnlocked()
  const location = useLocation()
  const navigate = useNavigate()
  const chatEndRef = useRef(null)

  // Scope & period
  const [scope, setScope] = useState('personal')
  const [periodType, setPeriodType] = useState(null)
  const [periodStep, setPeriodStep] = useState('select_type')
  const [periodRange, setPeriodRange] = useState(null)
  const [periodLabel, setPeriodLabel] = useState('')
  const [customWeekMonth, setCustomWeekMonth] = useState(null)
  const [customWeekStart, setCustomWeekStart] = useState('')
  const [customWeekEnd, setCustomWeekEnd] = useState('')
  const [openWeekCalendar, setOpenWeekCalendar] = useState(null)
  const [startCalendarView, setStartCalendarView] = useState({ year: 2026, month: 0 })
  const [endCalendarView, setEndCalendarView] = useState({ year: 2026, month: 0 })
  const startCalendarRef = useRef(null)
  const endCalendarRef = useRef(null)

  // Chat
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [categoryPath, setCategoryPath] = useState([])
  const [categoryEvents, setCategoryEvents] = useState([])
  const [askedClarification, setAskedClarification] = useState(false)

  // Typing animation
  const alreadyGreeted = _sessionGreeted || sessionStorage.getItem(SESSION_KEY) === '1'
  const [typingDone, setTypingDone] = useState(alreadyGreeted)
  const [needsTyping] = useState(!alreadyGreeted)

  const markGreeted = useCallback(() => {
    _sessionGreeted = true
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* */ }
    setTypingDone(true)
    setMessages((prev) => prev.map((m) => (m.id === 'hello' ? { ...m, typing: false } : m)))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, categoryPath, periodStep])

  useEffect(() => {
    if (!openWeekCalendar) return undefined
    const activeRef = openWeekCalendar === 'start' ? startCalendarRef : endCalendarRef
    const onPointerDown = (e) => {
      if (activeRef.current && !activeRef.current.contains(e.target)) {
        setOpenWeekCalendar(null)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openWeekCalendar])

  const returnToMonitoring = () => {
    if (location.state?.from === '/monitoring' && window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/monitoring')
  }

  // ── Period confirmation ──────────────────────────────────────────────────────

  const confirmPeriod = useCallback((type, range) => {
    const label = formatPeriodLabel(type, range)
    setPeriodRange(range)
    setPeriodLabel(label)
    setPeriodStep('confirmed')
    setMessages([{ id: 'hello', role: 'assistant', text: HELLO_TEXT, typing: !alreadyGreeted }])
    setCategoryEvents([])
    if (alreadyGreeted) setTypingDone(true)
  }, [alreadyGreeted])

  const handleSelectPeriodType = (type) => {
    setPeriodType(type)
    setPeriodStep('select_current_or_custom')
  }

  const handleSelectCurrent = () => {
    const now = new Date()
    if (periodType === 'week') confirmPeriod('week', weekRange(now))
    else if (periodType === 'month') confirmPeriod('month', monthRange(now.getFullYear(), now.getMonth()))
    else confirmPeriod('year', yearRange(now.getFullYear()))
  }

  const handleCustomMonth = (year, month) => confirmPeriod('month', monthRange(year, month))
  const handleCustomYear = (year) => confirmPeriod('year', yearRange(year))
  const handleCustomWeek = (year, month) => {
    const defaultStart = new Date(year, month, 1)
    const defaultEnd = new Date(year, month + 1, 0)
    setCustomWeekMonth({ year, month })
    setCustomWeekStart(toInputDateValue(defaultStart))
    setCustomWeekEnd(toInputDateValue(defaultEnd))
    setStartCalendarView({ year, month })
    setEndCalendarView({ year, month })
    setOpenWeekCalendar('start')
    setPeriodStep('custom_week_range')
  }

  const handleConfirmCustomWeekRange = () => {
    if (!customWeekStart || !customWeekEnd) return
    const start = startOfDay(customWeekStart)
    const end = endOfDay(customWeekEnd)
    if (start.getTime() > end.getTime()) return
    setOpenWeekCalendar(null)
    confirmPeriod('week', { start, end })
  }

  // ── Scope change clears everything ───────────────────────────────────────────

  const changeScope = (newScope) => {
    if (newScope === scope) return
    setScope(newScope)
    setPeriodStep('select_type')
    setPeriodType(null)
    setPeriodRange(null)
    setCustomWeekMonth(null)
    setCustomWeekStart('')
    setCustomWeekEnd('')
    setOpenWeekCalendar(null)
    setMessages([])
    setCategoryPath([])
    setCategoryEvents([])
    setAskedClarification(false)
    setTypingDone(alreadyGreeted)
  }

  // ── Category navigation ──────────────────────────────────────────────────────

  const activeTree = CATEGORY_TREE[scope]

  const currentOptions = useMemo(() => {
    if (categoryPath.length === 0) return activeTree
    if (categoryPath.length === 1) {
      return activeTree.find((c) => c.id === categoryPath[0])?.subs ?? []
    }
    if (categoryPath.length === 2) {
      const cat = activeTree.find((c) => c.id === categoryPath[0])
      return cat?.subs?.find((s) => s.id === categoryPath[1])?.goals ?? []
    }
    return []
  }, [activeTree, categoryPath])

  const handleCategorySelect = async (item) => {
    if (categoryPath.length < 2) {
      const nextPath = [...categoryPath, item.id]
      const pathLabel = nextPath.join(' > ')
      setCategoryEvents((prev) => [
        ...prev,
        `Пользователь вручную открыл категорию "${item.label}" (путь: ${pathLabel}). Причина смены категории: явный выбор пользователя в интерфейсе.`,
      ])
      setCategoryPath([...categoryPath, item.id])
      return
    }
    const dynamicText = periodRange
      ? generateDynamicResponse(item.id, periodRange, scope) || `Нет данных для «${item.label}» за выбранный период.`
      : `Нет данных для «${item.label}» — период не выбран.`
    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now() + 1}`
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: item.label }])
    await sleep(computeResponseDelayMs(dynamicText))
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', text: dynamicText }])
    setCategoryEvents((prev) => [
      ...prev,
      `Пользователь выбрал финальную тему "${item.label}" и получил динамический ответ на основе данных за выбранный период. Интерфейс вернулся к корню категорий.`,
    ])
    setCategoryPath([])
  }

  const handleCategoryBack = () => {
    setCategoryEvents((prev) => [
      ...prev,
      'Пользователь нажал "Назад" в дереве категорий и сменил контекст вручную.',
    ])
    setCategoryPath((p) => p.slice(0, -1))
  }

  const categoryLabel = useMemo(() => {
    if (categoryPath.length === 0) return null
    if (categoryPath.length === 1) return activeTree.find((c) => c.id === categoryPath[0])?.label
    const cat = activeTree.find((c) => c.id === categoryPath[0])
    return cat?.subs?.find((s) => s.id === categoryPath[1])?.label ?? cat?.label
  }, [activeTree, categoryPath])

  // ── Free-form question handler ───────────────────────────────────────────────

  const budgetContext = useMemo(() => (periodRange ? buildBudgetContext(periodRange) : ''), [periodRange])

  const runQuestion = async (questionText) => {
    const q = questionText.trim()
    if (!q || isLoading) return
    setInputValue('')
    const responseDelayMs = computeResponseDelayMs(q)

    const userId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: q }])
    const historyForAI = [...messages, { id: userId, role: 'user', text: q }]
    const historyContext = buildChatHistoryContext(historyForAI)
    const categoriesContext = buildCategoryEventsContext(categoryEvents)

    if (q.length < 5) {
      await sleep(responseDelayMs)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: TOO_SHORT_MSG }])
      return
    }

    const faqMatch = matchFAQ(q)
    if (faqMatch) {
      await sleep(responseDelayMs)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: faqMatch.r }])
      setAskedClarification(false)
      return
    }

    if (q.length < 100 && !askedClarification) {
      await sleep(responseDelayMs)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: CLARIFICATION_MSG }])
      setAskedClarification(true)
      return
    }

    setAskedClarification(false)
    setIsLoading(true)

    try {
      const history = historyForAI.map((m) => ({ role: m.role, content: m.text }))
      const systemPrompt = buildSystemPrompt(scope, periodLabel, USER_PROFILE.name)
      const contextMsg = `${systemPrompt}

Финансовые данные:
${budgetContext}

Полная история чата:
${historyContext}

История выбора категорий и причин смены:
${categoriesContext}

Текущий вопрос пользователя:
${q}`

      await sleep(responseDelayMs)
      let streamed = ''
      for await (const token of askAI(contextMsg, budgetContext, history)) {
        streamed += token
      }
      const safeFinal = sanitizeAssistantResponse(streamed)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: safeFinal }])
    } catch (err) {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: `Ошибка: ${err?.message || 'попробуйте позже'}` }])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Pill toggle classes ──────────────────────────────────────────────────────

  const pillBase = 'relative z-10 flex-1 rounded-full py-2.5 text-center text-sm font-bold transition-all duration-200'
  const pillActive = 'bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] text-[#003642] shadow-lg shadow-[#4cd6fb]/25'
  const pillInactive = 'text-[#869398]'

  // ── Period step classes ──────────────────────────────────────────────────────

  const periodPillBase = 'rounded-xl px-5 py-2.5 text-sm font-bold transition'
  const periodPillActive = 'bg-[#1c2a41] text-[#4cd6fb] border border-[#4cd6fb]/40'
  const periodPillDefault = 'bg-[#112036] text-[#d6e3ff] border border-[#2f3d52] hover:border-[#4cd6fb]/40'

  const periodConfirmed = periodStep === 'confirmed'
  const isCustomWeekRangeValid =
    customWeekStart &&
    customWeekEnd &&
    startOfDay(customWeekStart).getTime() <= endOfDay(customWeekEnd).getTime()

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      {/* Fixed scope toggle */}
      <div className="fixed left-0 right-0 top-[64px] z-40 flex justify-center bg-[#041329]/90 px-6 py-3 backdrop-blur-lg">
        <div className="relative flex w-full max-w-[260px] rounded-full bg-[#112036] p-1 shadow-inner shadow-black/30">
          <button type="button" className={`${pillBase} ${scope === 'personal' ? pillActive : pillInactive}`} onClick={() => changeScope('personal')}>
            Личные
          </button>
          <button type="button" className={`${pillBase} ${scope === 'family' ? pillActive : pillInactive}`} onClick={() => changeScope('family')}>
            Семейные
          </button>
        </div>
      </div>

      <main className="mx-auto mt-[136px] max-w-5xl px-6 pb-32">
        {/* Header */}
        <section className="mb-6">
          <div className="mb-3 flex items-start justify-between gap-3 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#d6e3ff]">
            <h1 className="min-w-0 flex-1">Ваш персональный помощник AI</h1>
            <div className="mt-1">
              <SubpageCloseButton ariaLabel="Закрыть" onClose={returnToMonitoring} />
            </div>
          </div>
          <p className="text-sm text-[#bcc9ce]">Анализ личного/семейного бюджета в реальном времени и точечные советы.</p>
        </section>

        {/* Period selection */}
        {!periodConfirmed ? (
          <section className="space-y-5">
            <p className="text-sm font-semibold text-[#bcc9ce]">Выберите период для анализа:</p>

            {periodStep === 'select_type' ? (
              <div className="flex gap-3">
                {[['week', 'Нед'], ['month', 'Мес'], ['year', 'Год']].map(([id, label]) => (
                  <button key={id} type="button" className={periodPillDefault + ' ' + periodPillBase} onClick={() => handleSelectPeriodType(id)}>
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {periodStep === 'select_current_or_custom' ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  {[['week', 'Нед'], ['month', 'Мес'], ['year', 'Год']].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`${periodPillBase} ${periodType === id ? periodPillActive : periodPillDefault}`}
                      onClick={() => handleSelectPeriodType(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" className="rounded-2xl border border-[#2f3d52] bg-[#0d1c32] px-5 py-3 text-sm font-medium text-[#d6e3ff] transition hover:border-[#4cd6fb]/50 hover:bg-[#112036]" onClick={handleSelectCurrent}>
                    {periodType === 'week' ? 'Текущую неделю' : periodType === 'month' ? 'Текущий месяц' : 'Текущий год'}
                  </button>
                  <button type="button" className="rounded-2xl border border-[#2f3d52] bg-[#0d1c32] px-5 py-3 text-sm font-medium text-[#d6e3ff] transition hover:border-[#4cd6fb]/50 hover:bg-[#112036]" onClick={() => setPeriodStep('custom_picker')}>
                    Указать свой
                  </button>
                </div>
              </div>
            ) : null}

            {periodStep === 'custom_picker' ? (
              <div className="space-y-3">
                <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-[#bcc9ce] transition hover:text-[#d6e3ff]" onClick={() => setPeriodStep('select_current_or_custom')}>
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Назад
                </button>
                {periodType === 'month' || periodType === 'week' ? (
                  <MonthPicker onSelect={periodType === 'month' ? handleCustomMonth : handleCustomWeek} />
                ) : (
                  <YearPicker onSelect={handleCustomYear} />
                )}
              </div>
            ) : null}

            {periodStep === 'custom_week_range' ? (
              <div className="space-y-3 rounded-2xl border border-[#2f3d52] bg-[#0d1c32] p-4">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#bcc9ce] transition hover:text-[#d6e3ff]"
                  onClick={() => {
                    setOpenWeekCalendar(null)
                    setPeriodStep('custom_picker')
                  }}
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Назад к выбору месяца
                </button>
                <p className="text-xs text-[#bcc9ce]">
                  {customWeekMonth ? `Выберите даты периода (${MONTH_NAMES[customWeekMonth.month]} ${customWeekMonth.year})` : 'Выберите даты периода'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CalendarDateField
                    fieldRef={startCalendarRef}
                    label="Начало периода"
                    value={customWeekStart}
                    isOpen={openWeekCalendar === 'start'}
                    onOpen={() => setOpenWeekCalendar('start')}
                    onClose={() => setOpenWeekCalendar(null)}
                    onChange={setCustomWeekStart}
                    view={startCalendarView}
                    onViewChange={setStartCalendarView}
                  />
                  <CalendarDateField
                    fieldRef={endCalendarRef}
                    label="Конец периода"
                    value={customWeekEnd}
                    isOpen={openWeekCalendar === 'end'}
                    onOpen={() => setOpenWeekCalendar('end')}
                    onClose={() => setOpenWeekCalendar(null)}
                    onChange={setCustomWeekEnd}
                    view={endCalendarView}
                    onViewChange={setEndCalendarView}
                  />
                </div>
                {!isCustomWeekRangeValid && customWeekStart && customWeekEnd ? (
                  <p className="text-xs text-[#f7a8a8]">Дата начала не может быть позже даты конца.</p>
                ) : null}
                <button
                  type="button"
                  className="rounded-xl border border-[#2f3d52] bg-[#112036] px-5 py-2.5 text-sm font-semibold text-[#d6e3ff] transition hover:border-[#4cd6fb]/50 hover:bg-[#1c2a41] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleConfirmCustomWeekRange}
                  disabled={!isCustomWeekRangeValid}
                >
                  Применить период
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Period badge */}
        {periodConfirmed ? (
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#112036] px-3 py-1.5 text-xs font-bold text-[#58d6f1]">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {periodLabel}
            </div>
            <button
              type="button"
              className="text-xs text-[#869398] underline transition hover:text-[#bcc9ce]"
              onClick={() => {
                setPeriodStep('select_type')
                setPeriodType(null)
                setPeriodRange(null)
                setPeriodLabel('')
                setCustomWeekMonth(null)
                setCustomWeekStart('')
                setCustomWeekEnd('')
                setOpenWeekCalendar(null)
                setMessages([])
                setCategoryPath([])
                setCategoryEvents([])
              }}
            >
              Изменить
            </button>
          </div>
        ) : null}

        {/* Chat */}
        {periodConfirmed ? (
          <section className="mb-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#112036]">
                    <span className="material-symbols-outlined text-[#4cd6fb]" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                  </div>
                ) : null}
                {(() => {
                  const { cleanText, actions } = msg.role === 'assistant' ? parseMessageActions(msg.text || '') : { cleanText: msg.text, actions: [] }
                  return (
                <div className={`max-w-[min(100%,44rem)] whitespace-pre-line rounded-3xl p-4 leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'rounded-tl-none border-l-2 border-[#4cd6fb]/40 bg-[#0d1c32] text-[#d6e3ff]'
                    : 'rounded-tr-none bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] text-[#003642]'
                }`}>
                  {msg.typing && needsTyping ? (
                    <TypingText text={msg.text} startDelayMs={computeResponseDelayMs(msg.text)} onDone={markGreeted} />
                  ) : (
                    cleanText || ''
                  )}
                  {msg.role === 'assistant' && actions.length > 0 && !msg.typing ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.map((label) => (
                        <button
                          key={`${msg.id}-${label}`}
                          type="button"
                          onClick={() => runQuestion(label)}
                          disabled={isLoading}
                          className="rounded-full border border-[#4cd6fb]/45 bg-[#112036] px-3 py-1.5 text-xs font-semibold text-[#58d6f1] transition hover:border-[#4cd6fb] hover:bg-[#1b2a42] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                  )
                })()}
              </div>
            ))}

            {/* Category selector */}
            {typingDone && !isLoading ? (
              <div className="ml-[3.25rem] mt-2">
                {categoryPath.length > 0 ? (
                  <button type="button" className="mb-3 flex items-center gap-1.5 rounded-full border border-[#2f3d52] bg-[#0d1c32] px-3 py-1.5 text-xs font-semibold text-[#bcc9ce] transition hover:border-[#4cd6fb]/40 hover:text-[#d6e3ff]" onClick={handleCategoryBack}>
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {categoryLabel}
                  </button>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {currentOptions.map((opt) => (
                    <button key={opt.id} type="button" className="rounded-2xl border border-[#2f3d52] bg-[#0d1c32] px-4 py-2.5 text-left text-sm font-medium text-[#d6e3ff] transition hover:border-[#4cd6fb]/50 hover:bg-[#112036]" onClick={() => handleCategorySelect(opt)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </section>
        ) : null}
      </main>

      {/* Input */}
      {periodConfirmed ? (
        <section className="fixed bottom-24 left-0 right-0 z-40 px-6 md:bottom-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 rounded-full border border-[#2f3d52] bg-[#0f1828]/92 p-2 backdrop-blur">
              <input
                className="h-11 min-w-0 flex-1 rounded-full border-none bg-transparent px-3 text-sm text-[#d6e3ff] outline-none placeholder:text-[#869398]"
                placeholder="Или задайте свободный вопрос..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runQuestion(inputValue) } }}
              />
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] text-[#003642] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !inputValue.trim()}
                type="button"
                onClick={() => runQuestion(inputValue)}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>send</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
