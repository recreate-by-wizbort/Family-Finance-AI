import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const openRouterKeys = {}
  for (let i = 1; i <= 20; i++) {
    const val = env[`VITE_OPENROUTER_API_KEY_${i}`] || ''
    if (val) openRouterKeys[`import.meta.env.VITE_OPENROUTER_API_KEY_${i}`] = JSON.stringify(val)
  }

  const geminiKeys = {}
  for (let i = 1; i <= 20; i++) {
    const val = env[`Google_Gemini_API_KEY_${i}`] || env[`VITE_GEMINI_API_KEY_${i}`] || ''
    if (val) geminiKeys[`import.meta.env.VITE_GEMINI_API_KEY_${i}`] = JSON.stringify(val)
  }

  const mergedGemini =
    env.VITE_GEMINI_API_KEY ||
    env.Google_Gemini_API_KEY_1 ||
    env.GOOGLE_GEMINI_API_KEY ||
    ''
  const mergedOpenRouter =
    env.VITE_OPENROUTER_API_KEY ||
    env.VITE_OPENROUTER_API_KEY_1 ||
    ''

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(mergedGemini),
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(mergedOpenRouter),
      ...openRouterKeys,
      ...geminiKeys,
    },
  }
})
