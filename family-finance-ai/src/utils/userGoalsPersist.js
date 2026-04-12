const KEY = 'ff_user_financial_goals'

/**
 * Цели, созданные пользователем на странице «Финансовые цели».
 * @returns {Array<{ id: string, icon: string, title: string, subtitle: string, targetUzs: number, savedUzs: number, monthlyUzs: number }>}
 */
export function loadUserCreatedGoals() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (g) =>
          g &&
          typeof g.id === 'string' &&
          typeof g.title === 'string' &&
          Number.isFinite(Number(g.targetUzs)) &&
          Number.isFinite(Number(g.monthlyUzs)),
      )
      .map((g) => ({
        ...g,
        subtitle: typeof g.subtitle === 'string' ? g.subtitle : '',
        savedUzs: Number.isFinite(Number(g.savedUzs)) ? Number(g.savedUzs) : 0,
        targetUzs: Number(g.targetUzs),
        monthlyUzs: Number(g.monthlyUzs),
      }))
  } catch {
    return []
  }
}

export function saveUserCreatedGoals(goals) {
  try {
    localStorage.setItem(KEY, JSON.stringify(goals))
  } catch {
    /* ignore */
  }
}
