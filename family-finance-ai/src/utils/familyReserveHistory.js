/**
 * Мок-история за апрель: чистое изменение +8,3 млн относительно остатка 1,6 млн на конец марта → 9,9 млн.
 * (2,8 + 2,2 − 0,5 + 1,9 + 1,9 − 0,4 + 0,4 = 8,3 млн)
 */
export const RESERVE_HISTORY_MOCK = [
  {
    id: 'mock_apr_11',
    kind: 'in',
    amount: 400_000,
    title: 'Пополнение',
    detail: 'С карты «Премиум Mastercard» · MASTERCARD *0698',
    timestamp: '2026-04-11T15:30:00+05:00',
  },
  {
    id: 'mock_apr_10',
    kind: 'out',
    amount: 400_000,
    title: 'Распределение',
    detail: 'Перевод участнику · Сын',
    timestamp: '2026-04-10T12:00:00+05:00',
    outMemberId: 'user_3',
  },
  {
    id: 'mock_apr_9',
    kind: 'in',
    amount: 1_900_000,
    title: 'Пополнение',
    detail: 'С карты «Капитал основная» · Жена',
    timestamp: '2026-04-09T18:45:00+05:00',
    inMemberId: 'user_2',
  },
  {
    id: 'mock_apr_8',
    kind: 'in',
    amount: 1_900_000,
    title: 'Пополнение',
    detail: 'С основной карты · Андрей · HUMO',
    timestamp: '2026-04-08T11:00:00+05:00',
    inMemberId: 'user_1',
  },
  {
    id: 'mock_apr_6',
    kind: 'out',
    amount: 500_000,
    title: 'Снятие на цель',
    detail: 'Цель «Семейный отпуск»',
    timestamp: '2026-04-06T09:15:00+05:00',
    outToGoals: true,
  },
  {
    id: 'mock_apr_4',
    kind: 'in',
    amount: 2_200_000,
    title: 'Пополнение',
    detail: 'С карты Kapital Bank · Жена',
    timestamp: '2026-04-04T14:30:00+05:00',
    inMemberId: 'user_2',
  },
  {
    id: 'mock_apr_2',
    kind: 'in',
    amount: 2_800_000,
    title: 'Пополнение',
    detail: 'С карты «Золотая HUMO» · Андрей',
    timestamp: '2026-04-02T10:00:00+05:00',
    inMemberId: 'user_1',
  },
]
