import { PRESET_FINANCIAL_GOALS } from '../data/presetFinancialGoals'
import { pickGoalIconFromText } from './goalIconFromText'
import { getPresetGoalSaved } from './goalFinancePersist'
import { loadUserCreatedGoals } from './userGoalsPersist'

/**
 * Список целей для семейной группы и распределения резерва: актуальный % и пользовательские цели.
 * @returns {Array<{ id: string, icon: string, title: string, progress: number, savedUzs: number, targetUzs: number }>}
 */
export function getMergedFinancialGoalsList() {
  const presets = PRESET_FINANCIAL_GOALS.map((g) => {
    const savedUzs = getPresetGoalSaved(g.id, g.savedUzs)
    const targetUzs = Number(g.targetUzs) || 0
    const progress = targetUzs > 0 ? Math.min(100, Math.round((savedUzs / targetUzs) * 100)) : 0
    return {
      id: g.id,
      icon: g.icon,
      title: g.title,
      progress,
      savedUzs,
      targetUzs,
    }
  })

  const user = loadUserCreatedGoals().map((g) => {
    const savedUzs = Number(g.savedUzs) || 0
    const targetUzs = Number(g.targetUzs) || 0
    const progress = targetUzs > 0 ? Math.min(100, Math.round((savedUzs / targetUzs) * 100)) : 0
    return {
      id: g.id,
      icon: g.icon || pickGoalIconFromText(g.title),
      title: g.title,
      progress,
      savedUzs,
      targetUzs,
    }
  })

  return [...presets, ...user]
}
