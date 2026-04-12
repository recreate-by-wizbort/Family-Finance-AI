/** Подбор material-symbols иконки по ключевым словам в названии цели (RU/EN). */
const RULES = [
  { keys: ['машин', 'авто', 'car', 'tesla', 'bmw', 'мерседес', 'лексус'], icon: 'directions_car' },
  { keys: ['дом', 'квартир', 'ипотек', 'жиль', 'недвижим'], icon: 'home' },
  { keys: ['отпуск', 'путешеств', 'мальдив', 'тур', 'поездк'], icon: 'flight' },
  { keys: ['море', 'пляж', 'beach'], icon: 'beach_access' },
  { keys: ['подушк', 'безопасн', 'резерв', 'сбереж', 'фонд'], icon: 'shield' },
  { keys: ['свадьб', 'свадеб'], icon: 'favorite' },
  { keys: ['обучен', 'универ', 'курс', 'школ', 'репетитор', 'degree'], icon: 'school' },
  { keys: ['техник', 'комп', 'ноут', 'iphone', 'телефон', 'гаджет'], icon: 'devices' },
  { keys: ['здоров', 'медицин', 'стоматолог', 'лечен'], icon: 'monitor_heart' },
  { keys: ['ребен', 'дет', 'сын', 'дочь'], icon: 'child_care' },
  { keys: ['инвест', 'акци', 'бирж', 'портфел'], icon: 'trending_up' },
  { keys: ['пенси'], icon: 'elderly' },
  { keys: ['ремонт', 'строител'], icon: 'handyman' },
  { keys: ['велосипед', 'байк'], icon: 'pedal_bike' },
]

export function pickGoalIconFromText(text) {
  const s = String(text || '').toLowerCase()
  for (const { keys, icon } of RULES) {
    if (keys.some((k) => s.includes(k))) return icon
  }
  return 'savings'
}
