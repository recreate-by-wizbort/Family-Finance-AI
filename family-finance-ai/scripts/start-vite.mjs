#!/usr/bin/env node
/**
 * Запуск Vite без npm в PATH: node scripts/start-vite.mjs
 * Доп. аргументы передаются в CLI Vite (например: node scripts/start-vite.mjs build)
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

if (!fs.existsSync(viteJs)) {
  console.error('Не найден node_modules/vite. Сначала установите зависимости:')
  console.error('  /snap/bin/node.npm install')
  console.error('  или:  npm install')
  process.exit(1)
}

const args = [viteJs, ...process.argv.slice(2)]
const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
