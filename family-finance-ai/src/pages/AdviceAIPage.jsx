import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { askAI } from '../api'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import SubpageCloseButton from '../components/SubpageCloseButton'
import { ACCOUNTS, TRANSACTIONS } from '../mockData'
import { matchFAQ, CLARIFICATION_MSG, TOO_SHORT_MSG, buildSystemPrompt } from '../mockDataAI'
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

function TypingText({ text, speed = 24, onDone }) {
  const [idx, setIdx] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (idx >= text.length) {
      if (!doneRef.current) { doneRef.current = true; onDone?.() }
      return
    }
    const t = setTimeout(() => setIdx((i) => i + 1), speed)
    return () => clearTimeout(t)
  }, [idx, text, speed, onDone])

  return (
    <>
      {text.slice(0, idx)}
      {idx < text.length ? <span className="inline-block w-2 animate-pulse bg-[#4cd6fb]/60">&#8203;</span> : null}
    </>
  )
}

// ─── Month/Year Picker ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

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

// ─── Category tree ─────────────────────────────────────────────────────────────

const CATEGORY_TREE = {
  personal: [
    { id: 'expenses', label: '📊 Расходы', subs: [
      { id: 'food', label: '🍔 Еда и кафе', goals: [
        { id: 'food_why', label: 'Почему выросли?', r: 'За последний период ваши расходы на еду и кафе выросли на 24% (+540 тыс. сум). Основной рост — рестораны (8 визитов вместо 3). Рекомендую установить лимит.\n\n[КНОПКА: Установить лимит 300 тыс./нед на кафе]' },
        { id: 'food_save', label: 'Как сэкономить?', r: 'Средний чек в кафе — 180 тыс. Сократив до 2 раз в неделю, экономия ~360 тыс./мес. Направьте на цель.\n\n[КНОПКА: Перенаправить экономию на цель]' },
        { id: 'food_compare', label: 'Сравнить с прошлым', r: 'Продукты: -8% (хорошо). Кафе: +24% (рост). Доставка еды: +15%. Общий итог по еде: +12%.\n\n[КНОПКА: Подробный отчёт по еде]' },
      ]},
      { id: 'transport', label: '🚕 Транспорт', goals: [
        { id: 'tr_why', label: 'Почему выросли?', r: 'Расходы на транспорт +28%. Причина: 14 поездок на такси (было 9), средний чек 45 тыс. сум.\n\n[КНОПКА: Установить лимит на такси]' },
        { id: 'tr_save', label: 'Как оптимизировать?', r: 'Переход на метро/автобус в будние сэкономит до 400 тыс./мес. Такси — для вечера и выходных.\n\n[КНОПКА: Установить лимит 250 тыс./мес]' },
      ]},
      { id: 'subscriptions', label: '📱 Подписки', goals: [
        { id: 'sub_list', label: 'Мои подписки', r: '3 подписки на 265 тыс./мес:\n• Netflix — 99 тыс.\n• ChatGPT Plus — 129 тыс.\n• YouTube Premium — 37 тыс.\n\n[КНОПКА: Управлять подписками]' },
        { id: 'sub_cut', label: 'Что отключить?', r: 'YouTube Premium используется < 2 ч/нед. Отключив — экономия 37 тыс./мес (444 тыс./год).\n\n[КНОПКА: Отключить YouTube Premium]' },
      ]},
      { id: 'utilities', label: '🏠 Коммунальные', goals: [
        { id: 'ut_overview', label: 'Обзор платежей', r: 'Коммунальные за период: электричество, газ, вода, интернет. Общая сумма определяется по данным за период.\n\n[КНОПКА: Настроить автоплатежи]' },
        { id: 'ut_save', label: 'Как сократить?', r: 'Коммунальные — сезонный расход. Зимой +15-20%. Совет: проверьте тариф на интернет — возможно, есть более выгодный.\n\n[КНОПКА: Сравнить тарифы]' },
      ]},
      { id: 'marketplace', label: '🛒 Маркетплейсы', goals: [
        { id: 'mp_total', label: 'Сколько потрачено?', r: 'Маркетплейсы — «тихий убийца бюджета». Много мелких покупок за период складываются в крупную сумму.\n\n[КНОПКА: Установить лимит на онлайн-покупки]' },
        { id: 'mp_save', label: 'Как контролировать?', r: 'Совет: удалите сохранённые карты из приложений магазинов. Правило 24 часов для покупок > 100 тыс.\n\n[КНОПКА: Включить уведомления о покупках]' },
      ]},
      { id: 'health', label: '💊 Здоровье', goals: [
        { id: 'h_overview', label: 'Расходы на здоровье', r: 'Категория включает: аптеки, клиники, стоматология. Рекомендуем держать резерв 5-10% от дохода на медицину.\n\n[КНОПКА: Создать резерв на здоровье]' },
      ]},
      { id: 'entertainment', label: '🎮 Развлечения', goals: [
        { id: 'ent_overview', label: 'Обзор расходов', r: 'Развлечения (кино, игры, хобби) — категория «желаний». Оптимально: не более 30% от дохода на все желания.\n\n[КНОПКА: Установить лимит на развлечения]' },
      ]},
      { id: 'clothing', label: '👗 Одежда', goals: [
        { id: 'cl_overview', label: 'Расходы на одежду', r: 'Капсульный гардероб — лучший друг бюджета. Планируйте крупные покупки заранее, избегайте импульсного шоппинга.\n\n[КНОПКА: Посмотреть историю покупок одежды]' },
      ]},
      { id: 'education', label: '📚 Образование', goals: [
        { id: 'edu_overview', label: 'Расходы на обучение', r: 'Образование — инвестиция в будущее. Регулярные платежи (репетиторы, курсы) учтены в прогнозе бюджета.\n\n[КНОПКА: Оптимизировать расходы на обучение]' },
      ]},
    ]},
    { id: 'income', label: '💰 Доходы', subs: [
      { id: 'salary', label: '💼 Зарплата', goals: [
        { id: 'sal_analysis', label: 'Анализ поступлений', r: 'Зарплата — основной источник дохода. AI определяет дату поступления для прогноза «хватит ли до зарплаты».\n\n[КНОПКА: Настроить автоперевод в день зарплаты]' },
      ]},
      { id: 'passive', label: '📈 Пассивный доход', goals: [
        { id: 'pas_overview', label: 'Проценты и кэшбэк', r: 'Пассивный доход: проценты по вкладам, кэшбэк по картам. Увеличьте его через вклад с капитализацией.\n\n[КНОПКА: Рассчитать доход по вкладу]' },
      ]},
    ]},
    { id: 'goals', label: '🎯 Цели', subs: [
      { id: 'g_car', label: '🚗 Машина', goals: [
        { id: 'car_prog', label: 'Прогресс', r: 'Накоплено 2 250 000 сум (45%). При взносе 85 тыс./мес — цель через 14 мес. Увеличив на 50 тыс. — через 10 мес.\n\n[КНОПКА: Увеличить взнос до 135 тыс.]' },
        { id: 'car_fast', label: 'Как ускорить?', r: 'Свободный остаток ~800 тыс. → прогресс до 61%. Плюс оптимизация подписок +37 тыс./мес.\n\n[КНОПКА: Перевести 800 тыс. на цель]' },
      ]},
      { id: 'g_vacation', label: '🏖 Отпуск', goals: [
        { id: 'vac_prog', label: 'Прогресс', r: 'Накоплено 320 000 сум (64%). При текущем темпе цель через 3 мес — к июлю.\n\n[КНОПКА: Автопополнение 25 тыс./нед]' },
        { id: 'vac_fast', label: 'Как ускорить?', r: 'Экономия с кафе и подписок (~400 тыс.) → цель через 1 мес.\n\n[КНОПКА: Перевести 180 тыс. на отпуск]' },
      ]},
      { id: 'g_safety', label: '🛡 Подушка', goals: [
        { id: 'saf_prog', label: 'Прогресс', r: 'Подушка: 1 640 000 из 2 000 000 (82%). Осталось 360 тыс. — 2 месяца.\n\n[КНОПКА: Увеличить взнос до 200 тыс.]' },
        { id: 'saf_advice', label: 'Рекомендация', r: 'Идеальная подушка — 3-6 мес. расходов (13-27 млн). После закрытия текущей цели стоит увеличить.\n\n[КНОПКА: Установить новую цель 15 млн]' },
      ]},
      { id: 'g_housing', label: '🏠 Жильё', goals: [
        { id: 'house_plan', label: 'Спланировать', r: 'Жильё — самая крупная цель. Рассчитайте первоначальный взнос и начните с регулярных откладываний. AI подберёт оптимальный план.\n\n[КНОПКА: Создать цель «Жильё»]' },
      ]},
    ]},
    { id: 'forecast', label: '📅 Прогноз', subs: [
      { id: 'f_endperiod', label: '📆 До конца периода', goals: [
        { id: 'end_enough', label: 'Хватит ли?', r: 'При текущем темпе (~150 тыс./день) прогноз будет зависеть от оставшихся дней. На балансе 4.85 млн — контролируйте кафе.\n\n[КНОПКА: Ежедневный отчёт]' },
        { id: 'end_save', label: 'Сколько отложить?', r: 'Прогноз свободного остатка: ~1.2 млн. Рекомендация: 800 тыс. на цели, 400 тыс. буфер.\n\n[КНОПКА: Перевести 800 тыс. на накопления]' },
      ]},
      { id: 'f_next', label: '📊 Следующий период', goals: [
        { id: 'next_pred', label: 'Прогноз расходов', r: 'На основе данных за 3 месяца: прогноз ~4.8 млн (+5% из-за сезонности).\n\n[КНОПКА: Установить бюджет 4.5 млн]' },
        { id: 'next_plan', label: 'Как спланировать?', r: 'Рекомендуемый бюджет: еда 1.5 млн, транспорт 600 тыс., коммунальные 800 тыс., подписки 265 тыс., резерв 500 тыс.\n\n[КНОПКА: Применить бюджет]' },
      ]},
    ]},
    { id: 'optimize', label: '💡 Оптимизация', subs: [
      { id: 'o_where', label: '✂️ Где сэкономить', goals: [
        { id: 'opt_tips', label: 'Рекомендации', r: 'Потенциал: кафе −360 тыс., подписки −37 тыс., такси −400 тыс. Итого ~800 тыс./мес на цели.\n\n[КНОПКА: Применить все рекомендации]' },
      ]},
      { id: 'o_auto', label: '🔄 Автоматизация', goals: [
        { id: 'auto_tips', label: 'Что автоматизировать?', r: 'Автоматизируйте: коммунальные (автоплатёж), накопления (автоперевод в день зарплаты), округление покупок.\n\n[КНОПКА: Настроить автоматизацию]' },
      ]},
      { id: 'o_compare', label: '📊 Сравнение периодов', goals: [
        { id: 'cmp_detail', label: 'Детальное сравнение', r: 'Для сравнения выберите два периода. AI покажет разницу по каждой категории и выделит аномалии роста.\n\n[КНОПКА: Сравнить периоды]' },
      ]},
    ]},
  ],
  family: [
    { id: 'fam_overview', label: '👨‍👩‍👦 Обзор семьи', subs: [
      { id: 'fw_spend', label: '💳 Кто сколько тратит', goals: [
        { id: 'fw_break', label: 'Разбивка', r: 'Alisher — 52% расходов, Malika — 34%, Timur — 14%. У Alisher рост +18% (кафе, транспорт).\n\n[КНОПКА: Детали по Alisher]' },
        { id: 'fw_anom', label: 'Аномалии', r: 'Timur: 320 тыс. на игры (×4 от нормы). Malika: маркетплейсы +65%.\n\n[КНОПКА: Настроить лимит для Timur]' },
      ]},
      { id: 'fw_transfers', label: '🔄 Переводы', goals: [
        { id: 'ftr_over', label: 'Обзор переводов', r: '12 переводов, 5.4 млн. Основной: Alisher → Malika (3.5 млн). Все корректно исключены из расходов.\n\n[КНОПКА: Все переводы]' },
        { id: 'ftr_opt', label: 'Оптимизация', r: '4 перевода/мес на продукты → один автоматический 1.5 млн 1-го числа.\n\n[КНОПКА: Настроить автоперевод]' },
      ]},
    ]},
    { id: 'fam_goals', label: '🎯 Семейные цели', subs: [
      { id: 'fg_common', label: '🏠 Общие цели', goals: [
        { id: 'fg_prog', label: 'Прогресс', r: 'Машина 45%, Отпуск 64%, Подушка 82%. Семейный вклад 150 тыс./мес. Рекомендуемый: 250 тыс.\n\n[КНОПКА: Увеличить вклад]' },
        { id: 'fg_dist', label: 'Распределение', r: 'Рекомендация: Alisher 60%, Malika 30%, Timur 10% (пропорционально доходам).\n\n[КНОПКА: Применить]' },
      ]},
      { id: 'fg_surprise', label: '🎁 Сюрприз-цель', goals: [
        { id: 'fs_create', label: 'Создать', r: 'Сюрприз — приватная копилка. Укажите сумму и дату раскрытия. В аналитике — «накопление» без деталей.\n\n[КНОПКА: Создать сюрприз]' },
        { id: 'fs_status', label: 'Статус', r: 'Активный сюрприз: 78% накоплено. 12 дней до раскрытия. Темп в норме.\n\n[КНОПКА: Пополнить]' },
      ]},
    ]},
    { id: 'fam_budget', label: '💰 Семейный бюджет', subs: [
      { id: 'fb_reserve', label: '🏦 Резерв', goals: [
        { id: 'fbr_stat', label: 'Состояние', r: 'Резерв: 9.9 млн (+1.6 млн за месяц). Рекомендуемый: 15 млн (3 мес. расходов).\n\n[КНОПКА: Пополнить на 500 тыс.]' },
        { id: 'fbr_plan', label: 'План', r: 'Для 15 млн за 6 мес: 850 тыс./мес. При текущем темпе — за 3 мес.\n\n[КНОПКА: Автопополнение 850 тыс.]' },
      ]},
      { id: 'fb_optimize', label: '✂️ Оптимизация', goals: [
        { id: 'fbo_tips', label: 'Где сэкономить?', r: 'Потенциал семьи: кафе −360 тыс., подписки −37 тыс., такси −400 тыс. Итого ~800 тыс./мес.\n\n[КНОПКА: Применить]' },
        { id: 'fbo_cmp', label: 'Сравнение', r: 'Расходы семьи +12% (+740 тыс.). Драйверы: кафе +24%, такси +28%, коммунальные +15%. Снижение: продукты −8%.\n\n[КНОПКА: Подробный отчёт]' },
      ]},
    ]},
    { id: 'fam_kids', label: '👶 Дети', subs: [
      { id: 'fk_spending', label: '💳 Расходы', goals: [
        { id: 'fk_detail', label: 'Детальный отчёт', r: 'Timur: 850 тыс./мес. Топ: игры 320 тыс., кафе 180 тыс., транспорт 120 тыс. Аномалия: игры ×4.\n\n[КНОПКА: Установить лимит на игры]' },
      ]},
      { id: 'fk_limits', label: '🎮 Лимиты', goals: [
        { id: 'fk_set', label: 'Настроить лимиты', r: 'Для детей доступны: дневной лимит, лимит по категориям, уведомления о крупных покупках.\n\n[КНОПКА: Настроить лимиты]' },
      ]},
      { id: 'fk_edu', label: '📚 Образование', goals: [
        { id: 'fk_edu_d', label: 'Расходы на обучение', r: 'Расходы на обучение Timur: репетиторы и курсы. Эти платежи учтены как регулярные в прогнозе.\n\n[КНОПКА: Оптимизировать]' },
      ]},
    ]},
  ],
}

// ─── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'advice_ai_greeted'
let _sessionGreeted = false

const HELLO_TEXT = 'Здравствуйте! Я ваш персональный финансовый помощник от RECREATE BY WIZBORT. Выберите тему ниже или задайте свободный вопрос.'

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

  // Chat
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [categoryPath, setCategoryPath] = useState([])
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
    const mid = new Date(year, month, 15)
    confirmPeriod('week', weekRange(mid))
  }

  // ── Scope change clears everything ───────────────────────────────────────────

  const changeScope = (newScope) => {
    if (newScope === scope) return
    setScope(newScope)
    setPeriodStep('select_type')
    setPeriodType(null)
    setPeriodRange(null)
    setMessages([])
    setCategoryPath([])
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

  const handleCategorySelect = (item) => {
    if (categoryPath.length < 2) {
      setCategoryPath([...categoryPath, item.id])
      return
    }
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: item.label },
      { id: `a-${Date.now()}`, role: 'assistant', text: item.r },
    ])
    setCategoryPath([])
  }

  const handleCategoryBack = () => setCategoryPath((p) => p.slice(0, -1))

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

    const userId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: q }])

    if (q.length < 5) {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: TOO_SHORT_MSG }])
      return
    }

    const faqMatch = matchFAQ(q)
    if (faqMatch) {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: faqMatch.r }])
      setAskedClarification(false)
      return
    }

    if (q.length < 100 && !askedClarification) {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: CLARIFICATION_MSG }])
      setAskedClarification(true)
      return
    }

    setAskedClarification(false)
    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }])
    setIsLoading(true)

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.text }))
      const systemPrompt = buildSystemPrompt(scope, periodLabel)
      const contextMsg = `${systemPrompt}\n\nФинансовые данные:\n${budgetContext}\n\nВопрос пользователя: ${q}`

      let streamed = ''
      for await (const token of askAI(contextMsg, budgetContext, history)) {
        streamed += token
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: streamed } : m)))
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: `Ошибка: ${err?.message || 'попробуйте позже'}` } : m)),
      )
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
          </section>
        ) : null}

        {/* Period badge */}
        {periodConfirmed ? (
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#112036] px-3 py-1.5 text-xs font-bold text-[#58d6f1]">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              {periodLabel}
            </div>
            <button type="button" className="text-xs text-[#869398] underline transition hover:text-[#bcc9ce]" onClick={() => { setPeriodStep('select_type'); setPeriodType(null); setMessages([]); setCategoryPath([]) }}>
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
                <div className={`max-w-[min(100%,44rem)] whitespace-pre-line rounded-3xl p-4 leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'rounded-tl-none border-l-2 border-[#4cd6fb]/40 bg-[#0d1c32] text-[#d6e3ff]'
                    : 'rounded-tr-none bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] text-[#003642]'
                }`}>
                  {msg.typing && needsTyping ? (
                    <TypingText text={msg.text} onDone={markGreeted} />
                  ) : (
                    msg.text || (isLoading && msg.role === 'assistant' ? (
                      <span className="flex items-center gap-2 text-[#869398]">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#4cd6fb]" />
                        Думаю...
                      </span>
                    ) : '')
                  )}
                </div>
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
