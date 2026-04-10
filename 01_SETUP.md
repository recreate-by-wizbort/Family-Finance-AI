# 📋 Инструкция 1 — Настройка проекта
## ⏱ Время: ~30 минут | Порядок выполнения: ПЕРВЫЙ

---

## Цель
Создать рабочий React-проект с нужными зависимостями и базовой структурой папок.

---

## Шаг 1 — Создать проект

```bash
npx create-react-app family-finance-ai
cd family-finance-ai
```

Или через Vite (быстрее, рекомендуется):

```bash
npm create vite@latest family-finance-ai -- --template react
cd family-finance-ai
npm install
```

---

## Шаг 2 — Установить зависимости

```bash
npm install recharts lucide-react
```

- `recharts` — графики на дашборде
- `lucide-react` — иконки

Никаких UI-библиотек типа MUI или Ant Design — они тяжёлые и замедлят разработку. Всё стилизуем через CSS-переменные вручную.

---

## Шаг 3 — Структура файлов

Создай следующую структуру внутри `src/`:

```
src/
├── mockData.js          ← Файл 2 (тестовые данные)
├── utils.js             ← Файл 3 (логика расчётов)
├── api.js               ← Файл 4 (OpenRouter AI)
├── App.jsx              ← Файл 5 (главный UI)
├── App.css              ← Стили
└── main.jsx             ← Точка входа (не трогаем)
```

Создай пустые файлы:

```bash
touch src/mockData.js src/utils.js src/api.js
```

---

## Шаг 4 — Базовые CSS-переменные

Замени содержимое `src/App.css` на это:

```css
:root {
  --bg: #0f1117;
  --bg-card: #1a1d27;
  --bg-hover: #22263a;
  --accent: #6c63ff;
  --accent-light: #8b85ff;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #2d3148;
  --radius: 16px;
  --radius-sm: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 14px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn:hover { opacity: 0.85; }

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.tag-danger { background: #ef444422; color: var(--danger); }
.tag-success { background: #22c55e22; color: var(--success); }
.tag-warning { background: #f59e0b22; color: var(--warning); }
```

---

## Шаг 5 — Проверить, что всё работает

```bash
npm run dev
```

Открой `http://localhost:5173` — должна открыться дефолтная страница Vite. Если открылась — можно двигаться дальше.

---

## ✅ Готово к следующему шагу

После выполнения этой инструкции у тебя есть:
- Рабочий React-проект
- Все нужные зависимости
- Структура папок
- CSS-переменные с тёмной темой

**Следующий шаг → Инструкция 2: mockData.js**
