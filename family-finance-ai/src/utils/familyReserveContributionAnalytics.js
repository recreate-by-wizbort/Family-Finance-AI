/**
 * Аналитика вкладов в семейный резерв: кто пополнил и кто получил вывод из резерва.
 * Записи истории могут явно задавать inMemberId / outMemberId / outToGoals, иначе — эвристика по detail.
 */

/**
 * @param {Array<{ id: string, name: string }>} members
 * @param {{ kind: string, amount: unknown, detail?: string, inMemberId?: string, outMemberId?: string, outToGoals?: boolean }} entry
 */
export function resolveReserveEntryAttribution(entry, members) {
  if (entry.kind === 'in' && entry.inMemberId && members.some((m) => m.id === entry.inMemberId)) {
    return { inMemberId: entry.inMemberId, outMemberId: undefined, outToGoals: false }
  }
  if (entry.kind === 'out' && entry.outMemberId && members.some((m) => m.id === entry.outMemberId)) {
    return { inMemberId: undefined, outMemberId: entry.outMemberId, outToGoals: false }
  }
  if (entry.kind === 'out' && entry.outToGoals) {
    return { inMemberId: undefined, outMemberId: undefined, outToGoals: true }
  }

  const d = String(entry.detail ?? '')

  if (entry.kind === 'out') {
    if (/Цель\s*«/.test(d) || d.includes('На цель')) {
      return { inMemberId: undefined, outMemberId: undefined, outToGoals: true }
    }
    for (const m of members) {
      if (d.includes(`Участник · ${m.name}`) || d.includes(`Перевод участнику · ${m.name}`)) {
        return { inMemberId: undefined, outMemberId: m.id, outToGoals: false }
      }
    }
  }

  if (entry.kind === 'in') {
    for (const m of members) {
      if (
        d.includes(`· ${m.name}`) ||
        d.includes(`${m.name} ·`) ||
        d.includes(`· Kapital Bank · ${m.name}`)
      ) {
        return { inMemberId: m.id, outMemberId: undefined, outToGoals: false }
      }
    }
  }

  return { inMemberId: undefined, outMemberId: undefined, outToGoals: false }
}

/**
 * @param {Array<{ kind: string, amount: unknown, detail?: string, inMemberId?: string, outMemberId?: string, outToGoals?: boolean }>} entries
 * @param {Array<{ id: string, name: string }>} members
 */
export function aggregateFamilyReserveContributions(entries, members) {
  const byMember = Object.fromEntries(
    members.map((m) => [m.id, { inUzs: 0, outUzs: 0 }]),
  )
  let goalsOutUzs = 0
  let unassignedInUzs = 0

  for (const e of entries) {
    const amt = Math.round(Number(e.amount) || 0)
    if (amt <= 0) continue

    const a = resolveReserveEntryAttribution(e, members)

    if (e.kind === 'in') {
      if (a.inMemberId && byMember[a.inMemberId]) {
        byMember[a.inMemberId].inUzs += amt
      } else {
        unassignedInUzs += amt
      }
    } else if (e.kind === 'out') {
      if (a.outToGoals) {
        goalsOutUzs += amt
      } else if (a.outMemberId && byMember[a.outMemberId]) {
        byMember[a.outMemberId].outUzs += amt
      }
    }
  }

  let totalInUzs = unassignedInUzs
  let totalOutUzs = goalsOutUzs
  for (const m of members) {
    const b = byMember[m.id]
    totalInUzs += b.inUzs
    totalOutUzs += b.outUzs
  }

  return { byMember, goalsOutUzs, unassignedInUzs, totalInUzs, totalOutUzs }
}
