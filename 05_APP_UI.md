# 📋 Инструкция 5 — App.jsx (весь UI: 3 экрана)
## ⏱ Время: ~3-4 часа | Порядок выполнения: ПЯТЫЙ (основная работа)

---

## Стратегия
Собираем 3 экрана последовательно. Каждый экран — это отдельный компонент.
Не пытайся сделать всё идеально — сначала работает, потом красиво.

**Порядок сборки:**
1. Скелет App.jsx с навигацией (15 мин)
2. Экран 1: Дашборд (60 мин)
3. Экран 2: Семья (45 мин)
4. Экран 3: AI-чат (45 мин)
5. Финальная полировка (30 мин)

---

## Часть 1 — Скелет App.jsx с навигацией

```jsx
// App.jsx
import { useState } from 'react';
import './App.css';

// Компоненты (создадим ниже)
import Dashboard from './screens/Dashboard';
import Family    from './screens/Family';
import AIChat    from './screens/AIChat';

const TABS = [
  { id: 'dashboard', label: 'Обзор',  emoji: '📊' },
  { id: 'family',    label: 'Семья',  emoji: '👨‍👩‍👦' },
  { id: 'chat',      label: 'AI',     emoji: '🤖' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh',
                  display: 'flex', flexDirection: 'column' }}>
      {/* Шапка */}
      <header style={{ padding: '16px 20px 0', display: 'flex',
                       alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: 1 }}>Family Finance</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>AI</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700 }}>А</div>
      </header>

      {/* Контент */}
      <main style={{ flex: 1, padding: '0 0 80px' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'family'    && <Family />}
        {activeTab === 'chat'      && <AIChat />}
      </main>

      {/* Нижняя навигация */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '100%', maxWidth: 420, background: 'var(--bg-card)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', padding: '8px 0' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                     padding: '8px', display: 'flex', flexDirection: 'column',
                     alignItems: 'center', gap: 4,
                     color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                     transition: 'color 0.2s' }}>
            <span style={{ fontSize: 20 }}>{tab.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
```

Создай папку `src/screens/` и 3 файла: `Dashboard.jsx`, `Family.jsx`, `AIChat.jsx`.

---

## Часть 2 — screens/Dashboard.jsx

```jsx
// screens/Dashboard.jsx
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  getTotalBalance, getTotalExpenses, getMonthOverMonthChange,
  getTopAnomalies, getBudgetForecast, getCategoryChartData,
  formatMoney, formatMoneyShort, getChangeTagClass
} from '../utils';
import { GOALS } from '../mockData';
import { calculateGoalProgress } from '../utils';

export default function Dashboard() {
  const [period, setPeriod] = useState('month');
  const balance   = getTotalBalance();
  const expenses  = getTotalExpenses();
  const changes   = getMonthOverMonthChange();
  const anomalies = getTopAnomalies();
  const forecast  = getBudgetForecast();
  const chartData = getCategoryChartData();

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Баланс */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a1d27 0%, #22263a 100%)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Общий баланс семьи
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          {formatMoneyShort(balance)} сум
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Расходы</div>
            <div style={{ fontWeight: 700, color: 'var(--danger)' }}>
              −{formatMoneyShort(expenses)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Прогноз</div>
            <div style={{ fontWeight: 700, color: 'var(--warning)' }}>
              ~{formatMoneyShort(forecast.projected)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>До конца мес.</div>
            <div style={{ fontWeight: 700 }}>{forecast.daysLeft} дн.</div>
          </div>
        </div>
      </div>

      {/* Алерт аномалии */}
      {changes.total > 10 && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444433',
                      borderRadius: 'var(--radius)', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>
              Траты выросли на {changes.total}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {anomalies.slice(0,2).map(a => `${a.emoji} ${a.label} +${a.changePercent}%`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* График по категориям */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Расходы по категориям</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>тыс. сум</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData.slice(0, 6)} layout="vertical"
                    margin={{ left: 0, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis type="category" dataKey="name" width={80}
                   tick={{ fontSize: 11, fill: '#f1f5f9' }} />
            <Tooltip
              formatter={(val, name) => [
                `${val} тыс.`,
                name === 'current' ? 'Этот месяц' : 'Прошлый'
              ]}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="previous" fill="#2d3148" radius={[0,4,4,0]} />
            <Bar dataKey="current"  radius={[0,4,4,0]}>
              {chartData.slice(0,6).map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Список изменений по категориям */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Изменения к прошлому месяцу</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chartData.slice(0, 5).map(cat => {
            const pct = Math.round(((cat.current - cat.previous) / (cat.previous || 1)) * 100);
            return (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center',
                                           justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{cat.emoji}</span>
                  <span style={{ fontSize: 13 }}>{cat.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {cat.current} тыс.
                  </span>
                  <span className={`tag ${getChangeTagClass(pct)}`}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Цели */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Финансовые цели</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {GOALS.map(goal => {
            const { progress, monthsNeeded } = calculateGoalProgress(goal);
            return (
              <div key={goal.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{goal.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{goal.title}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {progress}% · {monthsNeeded} мес.
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)',
                               borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`,
                                 background: goal.color, borderRadius: 3,
                                 transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## Часть 3 — screens/Family.jsx

```jsx
// screens/Family.jsx
import { FAMILY_MEMBERS, ACCOUNTS } from '../mockData';
import {
  getExpensesByMember, getFamilyTransfers, getMemberBalance,
  formatMoney, formatMoneyShort
} from '../utils';

export default function Family() {
  const expensesByMember = getExpensesByMember();
  const familyTransfers  = getFamilyTransfers();
  const totalFamilyExp   = Object.values(expensesByMember).reduce((a,b) => a+b, 0);

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <h2 style={{ fontSize: 20, fontWeight: 800 }}>Семья</h2>

      {/* Карточки членов семьи */}
      {FAMILY_MEMBERS.map(member => {
        const spent   = expensesByMember[member.id] || 0;
        const balance = getMemberBalance(member.id);
        const share   = totalFamilyExp > 0
          ? Math.round((spent / totalFamilyExp) * 100) : 0;

        return (
          <div key={member.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%',
                               background: member.color + '33',
                               border: `2px solid ${member.color}`,
                               display: 'flex', alignItems: 'center',
                               justifyContent: 'center', fontWeight: 700,
                               fontSize: 16, color: member.color }}>
                  {member.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{member.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)',
                                 textTransform: 'capitalize' }}>{member.role}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)' }}>
                  −{formatMoneyShort(spent)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  баланс {formatMoneyShort(balance)}
                </div>
              </div>
            </div>

            {/* Доля расходов */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--border)',
                             borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${share}%`,
                               background: member.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)',
                             minWidth: 32, textAlign: 'right' }}>{share}%</span>
            </div>
          </div>
        );
      })}

      {/* Семейные переводы */}
      {familyTransfers.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            Переводы внутри семьи
            <span style={{ fontSize: 11, color: 'var(--text-muted)',
                           fontWeight: 400, marginLeft: 8 }}>
              не считаются расходами
            </span>
          </div>
          {familyTransfers.map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between',
                                       padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13 }}>{tx.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.date}</div>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                ↔ {formatMoneyShort(Math.abs(tx.amount))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сюрприз-цель */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a1d27, #2d1f3d)',
                                      border: '1px solid #6c63ff44' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>🎁</span>
          <div>
            <div style={{ fontWeight: 700 }}>Сюрприз-режим</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Приватная копилка с датой раскрытия
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
          Отложи деньги на подарок. Семья видит только «накопление» — без деталей.
          В день X ты получишь уведомление.
        </p>
        <button className="btn" style={{ width: '100%', fontSize: 13 }}>
          🎁 Создать сюрприз-цель
        </button>
      </div>
    </div>
  );
}
```

---

## Часть 4 — screens/AIChat.jsx

```jsx
// screens/AIChat.jsx
import { useState, useRef, useEffect } from 'react';
import { askAI, SUGGESTED_QUESTIONS } from '../api';
import { buildAIContext } from '../utils';

export default function AIChat() {
  const [messages, setMessages]   = useState([
    {
      role: 'assistant',
      content: 'Привет! Я изучил финансы вашей семьи за этот месяц. Что вас интересует?'
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const bottomRef = useRef(null);
  const budgetContext = buildAIContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreaming('');

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      let fullResponse = '';

      for await (const token of askAI(text, budgetContext, history)) {
        fullResponse += token;
        setStreaming(fullResponse);
      }

      // Парсим кнопку действия из ответа AI
      const btnMatch = fullResponse.match(/\[КНОПКА:\s*(.+?)\]/);
      const cleanContent = fullResponse.replace(/\[КНОПКА:.+?\]/, '').trim();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanContent,
        actionButton: btnMatch?.[1],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Ошибка: ${err.message}. Проверь API-ключ в .env файле.`,
      }]);
    } finally {
      setLoading(false);
      setStreaming('');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

      {/* Заголовок */}
      <div style={{ padding: '20px 16px 12px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>AI-помощник</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Анализирует данные вашей семьи в реальном времени
        </div>
      </div>

      {/* Сообщения */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px',
                    display: 'flex', flexDirection: 'column', gap: 12 }}>

        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontSize: 18, marginBottom: 4 }}>🤖</div>
            )}
            <div style={{
              background: msg.role === 'user'
                ? 'var(--accent)' : 'var(--bg-card)',
              border: msg.role === 'user'
                ? 'none' : '1px solid var(--border)',
              borderRadius: msg.role === 'user'
                ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              padding: '12px 14px',
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {msg.content}
            </div>
            {/* Кнопка действия */}
            {msg.actionButton && (
              <button className="btn" style={{ marginTop: 8, fontSize: 12,
                                               padding: '8px 14px',
                                               background: 'var(--bg-hover)',
                                               border: '1px solid var(--accent)' }}>
                ✅ {msg.actionButton}
              </button>
            )}
          </div>
        ))}

        {/* Стриминг */}
        {streaming && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>🤖</div>
            <div style={{ background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px 16px 16px 16px',
                          padding: '12px 14px', fontSize: 13, lineHeight: 1.6 }}>
              {streaming}
              <span style={{ animation: 'blink 1s infinite',
                             color: 'var(--accent)' }}>▌</span>
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)',
                        fontSize: 13 }}>Анализирую данные...</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Подсказки */}
      {messages.length <= 1 && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8,
                      overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q.id} onClick={() => sendMessage(q.text)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                       borderRadius: 20, padding: '8px 14px', whiteSpace: 'nowrap',
                       fontSize: 12, cursor: 'pointer', color: 'var(--text)',
                       display: 'flex', alignItems: 'center', gap: 6 }}>
              {q.emoji} {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8,
                    borderTop: '1px solid var(--border)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Спросите что-нибудь..."
          disabled={loading}
          style={{ flex: 1, background: 'var(--bg-card)',
                   border: '1px solid var(--border)', borderRadius: 12,
                   padding: '10px 14px', color: 'var(--text)',
                   fontSize: 13, outline: 'none' }}
        />
        <button className="btn" onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{ padding: '10px 16px', opacity: loading ? 0.5 : 1 }}>
          →
        </button>
      </div>
    </div>
  );
}
```

Добавь в `App.css` анимацию курсора:

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

---

## Финальный чеклист перед демо

- [ ] `npm run dev` — приложение запускается без ошибок
- [ ] Дашборд показывает баланс, график, алерт о росте трат
- [ ] Экран Семья показывает карточки с долями расходов
- [ ] AI-чат отвечает (стрим виден в реальном времени)
- [ ] Вопросы-подсказки работают при нажатии
- [ ] На мобильном экране 375px всё читаемо

---

## Быстрые фиксы если что-то не работает

**Граф не отображается:** убедись что `recharts` установлен, добавь `import 'recharts/...'`

**AI не отвечает:** проверь консоль → скорее всего проблема с `.env` ключом

**Экраны не переключаются:** проверь что папка `screens/` создана и импорты верные

**Белый экран:** открой консоль (F12), найди первую красную ошибку

---

## ✅ Готово!

После этого шага у тебя есть полноценный рабочий прототип с:
- Живым AI-помощником на бесплатной модели
- Реальными расчётами (не просто картинки)
- Семейной аналитикой
- Готовым демо-сценарием для презентации

**На питче:** открой приложение, задай вопрос AI прямо на сцене — ответ придёт в реальном времени. Это всегда производит впечатление.
