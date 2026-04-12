#!/usr/bin/env bash
# Запуск dev без npm в PATH: сначала node + scripts/start-vite.mjs, затем snap/npm.
set -e
cd "$(dirname "$0")"

if command -v node >/dev/null 2>&1 && [ -f node_modules/vite/bin/vite.js ]; then
  exec node ./scripts/start-vite.mjs
fi

if command -v npm >/dev/null 2>&1; then
  exec npm run dev
fi

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p "parseInt(process.versions.node.split('.')[0], 10)" 2>/dev/null || echo 0)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    exec node --run dev
  fi
fi

for snap_npm in /snap/bin/node.npm /var/snap/node/common/bin/npm; do
  if [ -x "$snap_npm" ]; then
    exec "$snap_npm" run dev
  fi
done

echo "Не найдены node и/или node_modules."
echo "  1) Установите зависимости:  /snap/bin/node.npm install   (в этой папке)"
echo "  2) Затем dev:                node ./scripts/start-vite.mjs"
echo "  3) Или:                     ./run-dev.sh"
exit 1
