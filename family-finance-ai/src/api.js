const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const AI_PROVIDER_RAW = (import.meta.env.VITE_AI_PROVIDER || '').toLowerCase().trim()

const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
/** Стабильный Flash; `gemini-flash-latest` иногда резолвится в превью с артефактами. Переопределение: VITE_GEMINI_MODEL */
const GEMINI_MODEL = String(import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash').trim() || 'gemini-2.5-flash'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`

/** Потолок длины ответа (completion). Лаконичность задаётся системным промптом; высокий лимит уменьшает обрывы на середине фразы. */
export const MAX_AI_OUTPUT_TOKENS = 10_000
/** Gemini: запрашиваем тот же потолок; при ошибке лимита см. логи API. */
const MAX_TOKENS_GEMINI = MAX_AI_OUTPUT_TOKENS
const MAX_TOKENS_OPENROUTER = MAX_AI_OUTPUT_TOKENS
const TEMPERATURE = 0.55
const TOP_P = 0.92
const REASONING_CONFIG = {
  enabled: true,
  effort: 'high',
  exclude: true,
}

/** @returns {'gemini' | 'openrouter'} */
export function getActiveAiProvider() {
  if (AI_PROVIDER_RAW === 'openrouter') return 'openrouter'
  if (AI_PROVIDER_RAW === 'gemini') return 'gemini'
  if (GEMINI_API_KEY) return 'gemini'
  return 'openrouter'
}

export const MODEL = getActiveAiProvider() === 'gemini' ? GEMINI_MODEL : OPENROUTER_MODEL

/** Значения HTTP-заголовков — только ByteString (Latin-1); кириллица в ключе даёт ошибку fetch. */
function assertAsciiApiKey(key, label) {
  const s = String(key || '')
  for (let i = 0; i < s.length; i += 1) {
    if (s.charCodeAt(i) > 255) {
      throw new Error(
        `${label}: в ключе на позиции ${i + 1} недопустимый символ (часто кириллическая «А» вместо латинской «A» в начале ключа Google). Скопируйте ключ из консоли Google AI заново, только латиница и цифры.`,
      )
    }
  }
}

function ensureApiKey() {
  const p = getActiveAiProvider()
  if (p === 'gemini') {
    if (!GEMINI_API_KEY) {
      throw new Error(
        'Не найден ключ Gemini. Укажите VITE_GEMINI_API_KEY или Google_Gemini_API_KEY_1 в .env и перезапустите dev-сервер.',
      )
    }
    assertAsciiApiKey(GEMINI_API_KEY, 'Ключ Gemini')
    return
  }
  if (!OPENROUTER_API_KEY) {
    throw new Error('Не найден VITE_OPENROUTER_API_KEY. Добавьте ключ в .env и перезапустите dev-сервер.')
  }
  assertAsciiApiKey(OPENROUTER_API_KEY, 'Ключ OpenRouter')
}

function buildOpenRouterHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Family Finance AI',
  }
}

async function parseOpenRouterError(response) {
  try {
    const payload = await response.json()
    return payload?.error?.message || `Ошибка API: ${response.status}`
  } catch {
    return `Ошибка API: ${response.status}`
  }
}

function geminiKeyHintAppendix(message) {
  const m = String(message || '').toLowerCase()
  if (!m.includes('api key')) return ''
  if (!m.includes('invalid') && !m.includes('not valid')) return ''
  return (
    '\n\nВозможные причины: (1) в .env для Vite другой ключ, чем в curl — проверьте VITE_GEMINI_API_KEY или Google_Gemini_API_KEY_1 в каталоге family-finance-ai и перезапустите npm run dev; '
    + '(2) в Google Cloud у ключа включено ограничение «HTTP referrer» — для локальной разработки добавьте http://localhost:5173/* (и свой порт); curl без referer такое ограничение не проверяет так же, как браузер.'
  )
}

async function parseGeminiError(response) {
  try {
    const payload = await response.json()
    const msg = payload?.error?.message || payload?.error?.status
    const base = msg || `Ошибка Gemini: ${response.status}`
    return base + geminiKeyHintAppendix(base)
  } catch {
    return `Ошибка Gemini: ${response.status}`
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
    ...normalizeChatHistory(chatHistory).slice(-24),
    { role: 'user', content: userQuestion },
  ]
}

function extractTextFromOpenRouterCompletion(payload) {
  const message = payload?.choices?.[0]?.message?.content
  return normalizeTextContent(message)
}

/** @param {Array<{role: string, content: string}>} openAiMessages */
function openAiMessagesToGeminiPayload(openAiMessages) {
  let systemInstruction = null
  const contents = []
  for (const m of openAiMessages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: String(m.content || '') }] }
      continue
    }
    const role = m.role === 'assistant' ? 'model' : 'user'
    contents.push({ role, parts: [{ text: String(m.content || '') }] })
  }
  const generationConfig = {
    maxOutputTokens: MAX_TOKENS_GEMINI,
    temperature: TEMPERATURE,
    topP: TOP_P,
  }
  // Только 2.5+/3: иначе лишний ключ может дать 400 на старых model id
  if (/gemini-2\.5|gemini-3/i.test(GEMINI_MODEL)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }
  const body = {
    contents,
    generationConfig,
  }
  if (systemInstruction) body.systemInstruction = systemInstruction
  return body
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p) => p && p.thought !== true)
    .map((p) => p?.text || '')
    .join('')
}

async function askGeminiGenerateContent(messages) {
  const body = openAiMessagesToGeminiPayload(messages)
  const response = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await parseGeminiError(response))
  const data = await response.json()
  const text = extractGeminiText(data)
  if (!text && data?.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Ответ Gemini заблокирован настройками безопасности. Переформулируйте вопрос.')
  }
  return text || 'Не удалось получить ответ'
}

/**
 * Поток Gemini (SSE alt=sse). Документация: https://ai.google.dev/gemini-api/docs/quickstart
 * @param {Array<{role: string, content: string}>} messages
 */
export async function* askGeminiStream(messages) {
  const body = openAiMessagesToGeminiPayload(messages)
  const url = `${GEMINI_STREAM_URL}?alt=sse`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await parseGeminiError(response))
  if (!response.body) throw new Error('Пустой поток ответа от Gemini')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastFull = ''
  let yielded = 0

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
      if (payload === '[DONE]' || !payload) continue
      try {
        const json = JSON.parse(payload)
        if (json?.error) throw new Error(json.error?.message || 'Ошибка стрима Gemini')
        const full = extractGeminiText(json)
        if (!full) continue
        // Только монотонное наращивание префикса — иначе slice() даёт «слипшийся» мусор при рассинхроне чанков
        if (lastFull && full.startsWith(lastFull)) {
          const delta = full.slice(lastFull.length)
          lastFull = full
          if (delta) {
            yielded += delta.length
            yield delta
          }
        } else if (lastFull && lastFull.startsWith(full)) {
          continue
        } else if (full) {
          lastFull = full
          yielded += full.length
          yield full
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue
        throw err
      }
    }
  }

  if (yielded === 0) {
    const fallback = await askGeminiGenerateContent(messages)
    if (fallback) yield fallback
  }
}

/**
 * @param {string} systemPrompt
 * @param {string} userQuestion
 * @param {string} budgetContext
 * @param {string} yearlyContext
 * @param {Array}  chatHistory
 * @returns {AsyncGenerator<string>}
 */
export async function* askAI(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory = []) {
  ensureApiKey()
  const messages = buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)

  if (getActiveAiProvider() === 'gemini') {
    // Один цельный ответ без SSE — меньше артефактов склейки, чем у streamGenerateContent + дельт
    const fullText = await askGeminiGenerateContent(messages)
    if (fullText) yield fullText
    return
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: MAX_TOKENS_OPENROUTER,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      reasoning: REASONING_CONFIG,
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseOpenRouterError(response))
  }

  if (!response.body) {
    throw new Error('Пустой поток ответа от OpenRouter')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let yieldedTokens = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''

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

  if (getActiveAiProvider() === 'gemini') {
    return askGeminiGenerateContent(messages)
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: MAX_TOKENS_OPENROUTER,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      reasoning: REASONING_CONFIG,
    }),
  })

  if (!response.ok) throw new Error(await parseOpenRouterError(response))

  const data = await response.json()
  return extractTextFromOpenRouterCompletion(data) || 'Не удалось получить ответ'
}

export const SUGGESTED_QUESTIONS = [
  { id: 1, text: 'Почему мы тратим больше в этом месяце?', emoji: '📈' },
  { id: 2, text: 'Хватит ли денег до конца месяца?', emoji: '📅' },
  { id: 3, text: 'Куда лучше направить свободные деньги?', emoji: '💡' },
  { id: 4, text: 'Как быстрее накопить на машину?', emoji: '🚗' },
  { id: 5, text: 'На чём можно сэкономить без потерь?', emoji: '✂️' },
  { id: 6, text: 'Что будет, если открыть вклад на 6 мес?', emoji: '🏦' },
]

export { OPENROUTER_MODEL, GEMINI_MODEL }
