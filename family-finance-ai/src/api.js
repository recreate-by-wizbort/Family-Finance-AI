const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `Ты — умный финансовый помощник семейного банковского приложения Family Finance AI.

Твоя задача:
- Анализировать финансовые данные семьи и давать конкретные советы
- Отвечать кратко и по делу — максимум 3-4 предложения
- Всегда предлагать одно конкретное действие в конце ответа
- Использовать цифры из контекста, а не общие слова
- Писать на русском языке
- Суммы указывать в формате "X млн сум" или "X тыс. сум"
- Показывать только итоговый ответ пользователю
- Никогда не выводить внутренние рассуждения, анализ шагов, черновики или служебные заметки

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
[КНОПКА: Увеличить взнос по цели на 200 тыс.]`

function ensureApiKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Не найден VITE_OPENROUTER_API_KEY. Добавьте ключ в .env и перезапустите dev-сервер.')
  }
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Family Finance AI',
  }
}

async function parseError(response) {
  try {
    const payload = await response.json()
    return payload?.error?.message || `Ошибка API: ${response.status}`
  } catch {
    return `Ошибка API: ${response.status}`
  }
}

function prepareMessages(userMessage, budgetContext, chatHistory = []) {
  return [
    {
      role: 'user',
      content: `Вот текущие финансовые данные семьи:\n\n${budgetContext}`,
    },
    {
      role: 'assistant',
      content: 'Понял, я изучил финансовые данные семьи. Готов отвечать на вопросы.',
    },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ]
}

export async function* askAI(userMessage, budgetContext, chatHistory = []) {
  ensureApiKey()

  const messages = prepareMessages(userMessage, budgetContext, chatHistory)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages,
      system: SYSTEM_PROMPT,
      max_tokens: 400,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (!response.body) {
    throw new Error('Пустой поток ответа от OpenRouter')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) {
        continue
      }

      const payload = line.replace(/^data:\s*/, '')
      if (payload === '[DONE]') {
        return
      }

      try {
        const json = JSON.parse(payload)
        const token = json.choices?.[0]?.delta?.content
        if (token) {
          yield token
        }
      } catch {
        // Skip malformed chunks.
      }
    }
  }
}

export async function askAISimple(userMessage, budgetContext) {
  ensureApiKey()

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Данные семейного бюджета:\n${budgetContext}\n\nВопрос: ${userMessage}`,
        },
      ],
      system: SYSTEM_PROMPT,
      max_tokens: 400,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'Не удалось получить ответ'
}

export const SUGGESTED_QUESTIONS = [
  { id: 1, text: 'Почему мы тратим больше в этом месяце?', emoji: '📈' },
  { id: 2, text: 'Хватит ли денег до конца месяца?', emoji: '📅' },
  { id: 3, text: 'Куда лучше направить свободные деньги?', emoji: '💡' },
  { id: 4, text: 'Как быстрее накопить на машину?', emoji: '🚗' },
  { id: 5, text: 'На чём можно сэкономить без потерь?', emoji: '✂️' },
  { id: 6, text: 'Что будет, если открыть вклад на 6 мес?', emoji: '🏦' },
]

export { MODEL, SYSTEM_PROMPT }
