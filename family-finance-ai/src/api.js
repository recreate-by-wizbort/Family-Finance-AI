// ─── Collect all API keys from env ─────────────────────────────────────────────

function collectOpenRouterKeys() {
  const keys = []
  for (let i = 1; i <= 20; i++) {
    const key = import.meta.env[`VITE_OPENROUTER_API_KEY_${i}`]
    if (key) keys.push(key)
  }
  const legacy = import.meta.env.VITE_OPENROUTER_API_KEY
  if (legacy && !keys.includes(legacy)) keys.unshift(legacy)
  return keys
}

function collectGeminiKeys() {
  const keys = []
  for (let i = 1; i <= 20; i++) {
    const key = import.meta.env[`VITE_GEMINI_API_KEY_${i}`]
    if (key) keys.push(key)
  }
  const legacy = import.meta.env.VITE_GEMINI_API_KEY
  if (legacy && !keys.includes(legacy)) keys.unshift(legacy)
  return keys
}

const ALL_OPENROUTER_KEYS = collectOpenRouterKeys()
const ALL_GEMINI_KEYS = collectGeminiKeys()

const OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
const GEMINI_MODEL = String(import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash').trim() || 'gemini-2.5-flash'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`

export const MAX_AI_OUTPUT_TOKENS = 10_000
const MAX_TOKENS_GEMINI = MAX_AI_OUTPUT_TOKENS
const MAX_TOKENS_OPENROUTER = MAX_AI_OUTPUT_TOKENS
const TEMPERATURE = 0.55
const TOP_P = 0.92
const REASONING_CONFIG = {
  enabled: true,
  effort: 'high',
  exclude: true,
}

// ─── API Key Pool ──────────────────────────────────────────────────────────────

let _workingOpenRouterKeys = []
let _workingGeminiKeys = []
let _poolInitialized = false
let _poolInitPromise = null

async function pingOpenRouterKey(key) {
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    return resp.ok
  } catch {
    return false
  }
}

async function pingGeminiKey(key) {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: 'GET', signal: AbortSignal.timeout(8000) },
    )
    return resp.ok
  } catch {
    return false
  }
}

export async function initApiKeyPool() {
  if (_poolInitialized) return { openrouter: _workingOpenRouterKeys.length, gemini: _workingGeminiKeys.length }
  if (_poolInitPromise) return _poolInitPromise

  _poolInitPromise = (async () => {
    const [orResults, gemResults] = await Promise.all([
      Promise.all(
        ALL_OPENROUTER_KEYS.map(async (key) => ({ key, ok: await pingOpenRouterKey(key) })),
      ),
      Promise.all(
        ALL_GEMINI_KEYS.map(async (key) => ({ key, ok: await pingGeminiKey(key) })),
      ),
    ])

    _workingOpenRouterKeys = orResults.filter((r) => r.ok).map((r) => r.key)
    _workingGeminiKeys = gemResults.filter((r) => r.ok).map((r) => r.key)

    _poolInitialized = true
    _poolInitPromise = null

    return { openrouter: _workingOpenRouterKeys.length, gemini: _workingGeminiKeys.length }
  })()

  return _poolInitPromise
}

export function getPoolStatus() {
  return {
    initialized: _poolInitialized,
    openrouter: _workingOpenRouterKeys.length,
    gemini: _workingGeminiKeys.length,
    total: _workingOpenRouterKeys.length + _workingGeminiKeys.length,
  }
}

function pickRandomKey(pool) {
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function removeFromPool(key, provider) {
  if (provider === 'gemini') {
    _workingGeminiKeys = _workingGeminiKeys.filter((k) => k !== key)
  } else {
    _workingOpenRouterKeys = _workingOpenRouterKeys.filter((k) => k !== key)
  }
}

let _providerRound = 0

function chooseProvider() {
  if (_workingGeminiKeys.length > 0 && _workingOpenRouterKeys.length > 0) {
    const AI_PROVIDER_RAW = (import.meta.env.VITE_AI_PROVIDER || '').toLowerCase().trim()
    if (AI_PROVIDER_RAW === 'openrouter') return 'openrouter'
    if (AI_PROVIDER_RAW === 'gemini') return 'gemini'
    _providerRound++
    return _providerRound % 2 === 0 ? 'gemini' : 'openrouter'
  }
  if (_workingGeminiKeys.length > 0) return 'gemini'
  if (_workingOpenRouterKeys.length > 0) return 'openrouter'
  return 'gemini'
}

/** @returns {'gemini' | 'openrouter'} */
export function getActiveAiProvider() {
  if (_poolInitialized) return chooseProvider()
  const AI_PROVIDER_RAW = (import.meta.env.VITE_AI_PROVIDER || '').toLowerCase().trim()
  if (AI_PROVIDER_RAW === 'openrouter') return 'openrouter'
  if (AI_PROVIDER_RAW === 'gemini') return 'gemini'
  if (ALL_GEMINI_KEYS.length > 0) return 'gemini'
  return 'openrouter'
}

export const MODEL = getActiveAiProvider() === 'gemini' ? GEMINI_MODEL : OPENROUTER_MODEL

// ─── Request helpers ───────────────────────────────────────────────────────────

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

function buildOpenRouterHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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

function openAiMessagesToGeminiPayload(openAiMessages) {
  let systemInstruction = null
  const contents = []
  for (const m of openAiMessages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: String(m.content || '') }] }
      continue
    }
    const role = m.role === 'assistant' ? 'model' : 'user'
    const last = contents[contents.length - 1]
    if (last && last.role === role) {
      last.parts.push({ text: '\n\n' + String(m.content || '') })
    } else {
      contents.push({ role, parts: [{ text: String(m.content || '') }] })
    }
  }
  const generationConfig = {
    maxOutputTokens: MAX_TOKENS_GEMINI,
    temperature: TEMPERATURE,
    topP: TOP_P,
  }
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

// ─── Single-key request functions ──────────────────────────────────────────────

async function askGeminiGenerateContentWithKey(messages, apiKey) {
  assertAsciiApiKey(apiKey, 'Ключ Gemini')
  const body = openAiMessagesToGeminiPayload(messages)
  const response = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
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

async function* askGeminiStreamWithKey(messages, apiKey) {
  assertAsciiApiKey(apiKey, 'Ключ Gemini')
  const body = openAiMessagesToGeminiPayload(messages)
  const url = `${GEMINI_STREAM_URL}?alt=sse`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
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
    const fallback = await askGeminiGenerateContentWithKey(messages, apiKey)
    if (fallback) yield fallback
  }
}

async function askOpenRouterSimpleWithKey(messages, apiKey) {
  assertAsciiApiKey(apiKey, 'Ключ OpenRouter')
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey),
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

async function* askOpenRouterStreamWithKey(messages, apiKey) {
  assertAsciiApiKey(apiKey, 'Ключ OpenRouter')
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey),
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

  if (!response.ok) throw new Error(await parseOpenRouterError(response))
  if (!response.body) throw new Error('Пустой поток ответа от OpenRouter')

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
        if (json?.error) throw new Error(json.error?.message || 'Ошибка стрима OpenRouter')
        const token = normalizeTextContent(json?.choices?.[0]?.delta?.content)
        if (token) {
          yieldedTokens += token.length
          yield token
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue
        throw err
      }
    }
  }

  if (yieldedTokens === 0) {
    const fallback = await askOpenRouterSimpleWithKey(messages, apiKey)
    if (fallback) yield fallback
  }
}

// ─── Pool-aware request with transparent retry ─────────────────────────────────

let _geminiKeyIdx = 0
let _openrouterKeyIdx = 0

function rotatedKeys(pool, startIdx) {
  if (pool.length === 0) return []
  const result = []
  for (let i = 0; i < pool.length; i++) {
    result.push(pool[(startIdx + i) % pool.length])
  }
  return result
}

function buildAllCandidates() {
  const candidates = []
  const preferred = chooseProvider()
  const gemini = rotatedKeys(_workingGeminiKeys, _geminiKeyIdx).map((k) => ({ provider: 'gemini', key: k }))
  const openrouter = rotatedKeys(_workingOpenRouterKeys, _openrouterKeyIdx).map((k) => ({ provider: 'openrouter', key: k }))
  if (_workingGeminiKeys.length > 0) _geminiKeyIdx = (_geminiKeyIdx + 1) % _workingGeminiKeys.length
  if (_workingOpenRouterKeys.length > 0) _openrouterKeyIdx = (_openrouterKeyIdx + 1) % _workingOpenRouterKeys.length
  const primary = preferred === 'gemini' ? gemini : openrouter
  const secondary = preferred === 'gemini' ? openrouter : gemini
  const maxLen = Math.max(primary.length, secondary.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < primary.length) candidates.push(primary[i])
    if (i < secondary.length) candidates.push(secondary[i])
  }
  if (candidates.length === 0) {
    for (const key of ALL_GEMINI_KEYS) candidates.push({ provider: 'gemini', key })
    for (const key of ALL_OPENROUTER_KEYS) candidates.push({ provider: 'openrouter', key })
  }
  return candidates
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
  const messages = buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)
  const candidates = buildAllCandidates()

  if (candidates.length === 0) {
    yield 'Не удалось подключиться к AI. Ни один ключ не настроен.'
    return
  }

  for (let i = 0; i < candidates.length; i++) {
    const { provider, key } = candidates[i]
    try {
      if (provider === 'gemini') {
        let hasTokens = false
        for await (const token of askGeminiStreamWithKey(messages, key)) {
          hasTokens = true
          yield token
        }
        if (hasTokens) return
      } else {
        let hasTokens = false
        for await (const token of askOpenRouterStreamWithKey(messages, key)) {
          hasTokens = true
          yield token
        }
        if (hasTokens) return
      }
    } catch {
      removeFromPool(key, provider)
      if (i === candidates.length - 1) {
        yield 'К сожалению, не удалось получить ответ. Попробуйте повторить вопрос через несколько секунд.'
        return
      }
    }
  }
}

export async function askAISimple(systemPrompt, userQuestion, budgetContext, yearlyContext = '', chatHistory = []) {
  const messages = buildMessages(systemPrompt, userQuestion, budgetContext, yearlyContext, chatHistory)
  const candidates = buildAllCandidates()

  if (candidates.length === 0) {
    return 'Не удалось подключиться к AI. Ни один ключ не настроен.'
  }

  for (let i = 0; i < candidates.length; i++) {
    const { provider, key } = candidates[i]
    try {
      if (provider === 'gemini') {
        return await askGeminiGenerateContentWithKey(messages, key)
      }
      return await askOpenRouterSimpleWithKey(messages, key)
    } catch {
      removeFromPool(key, provider)
      if (i === candidates.length - 1) {
        return 'К сожалению, не удалось получить ответ. Попробуйте повторить вопрос через несколько секунд.'
      }
    }
  }
  return 'Не удалось получить ответ'
}

// Legacy streaming export for compatibility
export { askGeminiStreamWithKey as askGeminiStream }

export const SUGGESTED_QUESTIONS = [
  { id: 1, text: 'Почему мы тратим больше в этом месяце?', emoji: '📈' },
  { id: 2, text: 'Хватит ли денег до конца месяца?', emoji: '📅' },
  { id: 3, text: 'Куда лучше направить свободные деньги?', emoji: '💡' },
  { id: 4, text: 'Как быстрее накопить на машину?', emoji: '🚗' },
  { id: 5, text: 'На чём можно сэкономить без потерь?', emoji: '✂️' },
  { id: 6, text: 'Что будет, если открыть вклад на 6 мес?', emoji: '🏦' },
]

export { OPENROUTER_MODEL, GEMINI_MODEL }
