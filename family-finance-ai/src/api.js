const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_TOKENS = 600
const TEMPERATURE = 0.6
const TOP_P = 0.9
const REASONING_CONFIG = {
  enabled: true,
  effort: 'high',
  exclude: true,
}

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

function normalizeTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((chunk) => (typeof chunk === 'string' ? chunk : chunk?.text || ''))
      .join('')
  }
  return ''
}

function normalizeChatHistory(chatHistory) {
  return chatHistory
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: normalizeTextContent(m.content) }))
}

function buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory = []) {
  const contextBlock = [
    '--- ФИНАНСОВЫЕ ДАННЫЕ ---',
    budgetContext,
    '',
    yearlyContext,
    '--- КОНЕЦ ДАННЫХ ---',
  ].join('\n')

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: contextBlock },
    {
      role: 'assistant',
      content: 'Понял, я изучил ваши финансовые данные и готов помочь. Задавайте вопросы.',
    },
    ...normalizeChatHistory(chatHistory).slice(-6),
    { role: 'user', content: userQuestion },
  ]
}

function extractTextFromCompletion(payload) {
  const message = payload?.choices?.[0]?.message?.content
  return normalizeTextContent(message)
}

/**
 * @param {string} systemPrompt  - полный системный промпт (роль + правила)
 * @param {string} userQuestion  - чистый вопрос пользователя
 * @param {string} budgetContext - текстовый блок с финансовыми данными
 * @param {string} yearlyContext - помесячная динамика за 12 мес.
 * @param {Array}  chatHistory   - [{role, content}]
 * @returns {AsyncGenerator<string>} стрим токенов
 */
export async function* askAI(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory = []) {
  ensureApiKey()
  const messages = buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      reasoning: REASONING_CONFIG,
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
  let yieldedTokens = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue

      const payload = line.replace(/^data:\s*/, '')
      if (payload === '[DONE]') return

      try {
        const json = JSON.parse(payload)
        if (json?.error) {
          throw new Error(json.error?.message || 'Ошибка стрима OpenRouter')
        }
        const token = normalizeTextContent(json?.choices?.[0]?.delta?.content)
        if (token) {
          yieldedTokens += token.length
          yield token
        }
      } catch (err) {
        if (err instanceof SyntaxError) {
          // Skip malformed chunks
          continue
        }
        throw err
      }
    }
  }

  if (yieldedTokens === 0) {
    const fallback = await askAISimple(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)
    if (fallback) yield fallback
  }
}

export async function askAISimple(systemPrompt, userQuestion, budgetContext, yearlyContext = '', chatHistory = []) {
  ensureApiKey()
  const messages = buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      reasoning: REASONING_CONFIG,
    }),
  })

  if (!response.ok) throw new Error(await parseError(response))

  const data = await response.json()
  return extractTextFromCompletion(data) || 'Не удалось получить ответ'
}

export const SUGGESTED_QUESTIONS = [
  { id: 1, text: 'Почему мы тратим больше в этом месяце?', emoji: '📈' },
  { id: 2, text: 'Хватит ли денег до конца месяца?', emoji: '📅' },
  { id: 3, text: 'Куда лучше направить свободные деньги?', emoji: '💡' },
  { id: 4, text: 'Как быстрее накопить на машину?', emoji: '🚗' },
  { id: 5, text: 'На чём можно сэкономить без потерь?', emoji: '✂️' },
  { id: 6, text: 'Что будет, если открыть вклад на 6 мес?', emoji: '🏦' },
]

export { MODEL }
