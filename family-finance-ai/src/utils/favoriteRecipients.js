const KEY = 'family-finance-favorite-recipients-v1'

const DEMO_SEED = [
  {
    id: 'fr_demo_1',
    name: 'Анна М.',
    method: 'phone',
    phoneDigits: '901234567',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBqtwgPv7U-lW5pwOEZZwKZnfPX5nH0hGAHLRK5WnNSTUfo0hr0GPUgsFr_lgmU6EXaZioqYrF4q78WY9sefBWGCzx5t2GkzliUYYQhrC4CIQrIk4CXMN0b59neR_n8Yzh4MwPCVt_Vz4E6UR8nKg-0p8jhXIM124GP8LUFt7jN7qe0QetnG_kVs8CnDQcI5zRKkG0aNveObd5yGnmGfSDrmipA0V0huXUEynlVm_ajt2V2VBQvLj72IwVHjbeTtCE_pzFDd-qC8brG',
  },
  {
    id: 'fr_demo_2',
    name: 'Дмитрий П.',
    method: 'phone',
    phoneDigits: '902345678',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVhv-AwJ6Xysyj8aYvnqOuLPDA713ygZJNkX4UPp9JrajUTiFWwF-RKmxBO71XK9N2ch-BBpCZvhO15SI0rzs4ORVOyFf4O_-jDX1NmXcmEt8XvljrytWt5Ouxb6iO1bJIbiDL0pHRnVuqpmDRVYkIyWhUt4o44389gRQy5R7PXUP0ojFzeHwmW4bnprBNO1ehTQhOxVATZOG-WYSY4tEBVlrj0B2RMk4FaMlOvLchyz6ENiA49QwL0X0LWA8ygxrIABsThT_lgK-H',
  },
  {
    id: 'fr_demo_3',
    name: 'Мама',
    method: 'phone',
    phoneDigits: '903456789',
    initials: 'КР',
  },
  {
    id: 'fr_demo_4',
    name: 'Елена К.',
    method: 'phone',
    phoneDigits: '904567890',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD4R2l9JmNAm35BsxXsoA1BalcfowOFmkR4To9aZRLoJ5cG6pfzKIqlPhxAOpQTjV1cf-FMoyo-xhk96gDUtWkU9NsgvmhgQSaZdLg1Yjr6d2jU17tdRthaMer2h4MIxcw6cveSvM8lHpBrua3R5u1FhnO-uAC6XipqQq_z9uWKO_MX93CskEoTAFw878BAdcbMRA8ThaBPdnEPUlysjcMCselPus7u_79yQa0lF4d8TvVBAgfif8C6ZKUUAYJ9DM42TVDtxbJQNI4G',
  },
]

export function loadFavoriteRecipients() {
  if (typeof window === 'undefined') return [...DEMO_SEED]
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(DEMO_SEED))
      return [...DEMO_SEED]
    }
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : [...DEMO_SEED]
  } catch {
    return [...DEMO_SEED]
  }
}

export function saveFavoriteRecipients(list) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function normCard(d) {
  return String(d || '').replace(/\D/g, '').slice(0, 16)
}

function normPhone(d) {
  return String(d || '').replace(/\D/g, '').slice(0, 9)
}

/**
 * Уже есть контакт с тем же номером карты или телефона.
 */
export function isRecipientInFavorites({ method, cardDigits, phoneDigits }) {
  const list = loadFavoriteRecipients()
  if (method === 'card') {
    const c = normCard(cardDigits)
    if (c.length !== 16) return false
    return list.some((row) => row.method === 'card' && normCard(row.cardDigits) === c)
  }
  if (method === 'phone') {
    const p = normPhone(phoneDigits)
    if (p.length !== 9) return false
    return list.some((row) => row.method === 'phone' && normPhone(row.phoneDigits) === p)
  }
  return false
}

/**
 * @param {{ name: string, method: 'card'|'phone', cardDigits?: string, phoneDigits?: string, image?: string, initials?: string }} entry
 * @returns {{ list: object[], added: boolean }}
 */
export function addFavoriteRecipient(entry) {
  const list = loadFavoriteRecipients()
  const cardDigits = entry.method === 'card' ? normCard(entry.cardDigits) : ''
  const phoneDigits = entry.method === 'phone' ? normPhone(entry.phoneDigits) : ''

  if (entry.method === 'card' && cardDigits.length === 16) {
    if (list.some((row) => row.method === 'card' && normCard(row.cardDigits) === cardDigits)) {
      return { list, added: false }
    }
  } else if (entry.method === 'phone' && phoneDigits.length === 9) {
    if (list.some((row) => row.method === 'phone' && normPhone(row.phoneDigits) === phoneDigits)) {
      return { list, added: false }
    }
  } else {
    return { list, added: false }
  }

  const id = `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const row = {
    id,
    name: String(entry.name || '').trim() || 'Получатель',
    method: entry.method,
    ...(entry.method === 'card' ? { cardDigits } : {}),
    ...(entry.method === 'phone' ? { phoneDigits } : {}),
    ...(entry.image ? { image: entry.image } : {}),
    ...(entry.initials ? { initials: entry.initials } : {}),
  }
  const next = [...list, row]
  saveFavoriteRecipients(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('family-finance-favorites-changed'))
  }
  return { list: next, added: true }
}
