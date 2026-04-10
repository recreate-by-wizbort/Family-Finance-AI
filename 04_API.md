# 📋 Инструкция 4 — api.js (OpenRouter AI, бесплатная модель)
## ⏱ Время: ~20 минут | Порядок выполнения: ЧЕТВЁРТЫЙ

---

## Цель
Подключить бесплатный AI через OpenRouter API.
Модель: `google/gemma-3-27b-it:free` (бесплатно, без ключа с лимитами).

---

## Шаг 1 — Получить API-ключ OpenRouter

1. Зайди на https://openrouter.ai
2. Зарегистрируйся (бесплатно)
3. Перейди в Settings → API Keys → Create Key
4. Скопируй ключ (начинается с `sk-or-...`)

> **Важно для хакатона:** бесплатная квота — 20 запросов в минуту на модель `:free`.
> Этого хватит для демо. Заранее проверь, что ключ работает.

---

## Шаг 2 — Создать `.env` файл

В корне проекта (рядом с `package.json`) создай файл `.env`:

```
VITE_OPENROUTER_API_KEY=sk-or-ТВОЙ_КЛЮЧ_ЗДЕСЬ
```

> Если используешь Create React App вместо Vite:
> ```
> REACT_APP_OPENROUTER_API_KEY=sk-or-ТВОЙ_КЛЮЧ_ЗДЕСЬ
> ```

**Добавь `.env` в `.gitignore`** — не публикуй ключ в репозиторий.

---

## Шаг 3 — Полное содержимое `src/api.js`

```javascript
// api.js — интеграция с OpenRouter (бесплатная модель Gemma)

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Для CRA: process.env.REACT_APP_OPENROUTER_API_KEY

const MODEL = "google/gemma-3-27b-it:free";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Системный промпт — задаёт роль и ограничения AI-помощника
const SYSTEM_PROMPT = `Ты — умный финансовый помощник семейного банковского приложения Family Finance AI.

Твоя задача:
- Анализировать финансовые данные семьи и давать конкретные советы
- Отвечать кратко и по делу — максимум 3-4 предложения
- Всегда предлагать одно конкретное действие в конце ответа
- Использовать цифры из контекста, а не общие слова
- Писать на русском языке
- Суммы указывать в формате "X млн сум" или "X тыс. сум"

Чего не делать:
- Не давай рекламных советов по конкретным продуктам
- Не обещай доходность
- Не используй сложные финансовые термины без объяснения
- Не пиши длинные списки — максимум 3 пункта

Формат ответа:
1. Краткий анализ (1-2 предложения)
2. Вывод или рекомендация (1 предложение)  
3. Конкретное действие: [КНОПКА: текст действия]

Пример формата конкретного действия в конце:
[КНОПКА: Перевести 500 тыс. на вклад]
[КНОПКА: Поставить лимит на кафе 300 тыс./мес]
[КНОПКА: Увеличить взнос по цели на 200 тыс.]`;

/**
 * Отправляет вопрос пользователя в OpenRouter с контекстом бюджета
 * 
 * @param {string} userMessage - вопрос пользователя
 * @param {string} budgetContext - текстовый контекст из buildAIContext()
 * @param {Array}  chatHistory  - предыдущие сообщения [{role, content}]
 * @returns {AsyncGenerator} стрим токенов
 */
export async function* askAI(userMessage, budgetContext, chatHistory = []) {
  const messages = [
    // Контекст бюджета передаётся как первое сообщение пользователя
    {
      role: "user",
      content: `Вот текущие финансовые данные семьи:\n\n${budgetContext}`,
    },
    {
      role: "assistant",
      content: "Понял, я изучил финансовые данные семьи. Готов отвечать на вопросы.",
    },
    // История диалога
    ...chatHistory.slice(-6), // берём последние 6 сообщений для экономии токенов
    // Новый вопрос
    { role: "user", content: userMessage },
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin, // обязательно для OpenRouter
      "X-Title": "Family Finance AI",          // название приложения
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      system: SYSTEM_PROMPT,
      max_tokens: 400,
      temperature: 0.7,
      stream: true, // включаем стриминг для живого эффекта
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Ошибка API: ${response.status}`);
  }

  // Читаем стрим
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6); // убираем "data: "
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        // пропускаем невалидный JSON в стриме
      }
    }
  }
}

/**
 * Упрощённая версия без стриминга (для случаев когда стрим не нужен)
 */
export async function askAISimple(userMessage, budgetContext) {
  const messages = [
    {
      role: "user",
      content: `Данные семейного бюджета:\n${budgetContext}\n\nВопрос: ${userMessage}`,
    },
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Family Finance AI",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      system: SYSTEM_PROMPT,
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`Ошибка: ${response.status}`);

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Не удалось получить ответ";
}

// ─── Готовые вопросы-подсказки для чата ─────────────────────────────────────
export const SUGGESTED_QUESTIONS = [
  { id: 1, text: "Почему мы тратим больше в этом месяце?", emoji: "📈" },
  { id: 2, text: "Хватит ли денег до конца месяца?",       emoji: "📅" },
  { id: 3, text: "Куда лучше направить свободные деньги?", emoji: "💡" },
  { id: 4, text: "Как быстрее накопить на машину?",        emoji: "🚗" },
  { id: 5, text: "На чём можно сэкономить без потерь?",    emoji: "✂️" },
  { id: 6, text: "Что будет, если открыть вклад на 6 мес?",emoji: "🏦" },
];
```

---

## Шаг 4 — Проверка подключения

Создай временный тестовый файл или добавь в компонент:

```javascript
import { askAISimple } from './api';
import { buildAIContext } from './utils';

async function test() {
  try {
    const context = buildAIContext();
    const answer = await askAISimple("Хватит ли денег до конца месяца?", context);
    console.log('AI ответил:', answer);
  } catch (err) {
    console.error('Ошибка:', err.message);
  }
}
test();
```

---

## Частые ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `401 Unauthorized` | Неверный ключ | Проверь `.env`, перезапусти сервер |
| `429 Too Many Requests` | Превышен лимит | Подожди 1 минуту |
| `CORS error` | Запрос с localhost | Добавь `HTTP-Referer: http://localhost:5173` |
| `undefined` в ответе | Ключ не читается | Убедись что файл `.env` в корне, не в `src/` |

---

## ✅ После этого шага

У тебя есть рабочий AI-помощник с:
- Стримингом (ответ печатается в реальном времени)
- Системным промптом финансового консультанта
- Передачей контекста бюджета без персональных данных
- Готовыми вопросами-подсказками

**Следующий шаг → Инструкция 5: App.jsx (весь UI)**
