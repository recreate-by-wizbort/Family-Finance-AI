import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
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
    },
  }
})
