/** Локальные изображения из /public/promo (стабильная загрузка без внешних блокировок). */
const P = {
  /** Визуализация МДЦ Tashkent City со страницы Gazeta.uz (скриншот пользователя) */
  platinumTashkentGazeta: '/promo/platinum-tashkent-city.png',
  tashkentCity: '/promo/tashkent-city.jpg',
  restaurant: '/promo/restaurant.jpg',
  goldCard: '/promo/gold-card.jpg',
  piggy: '/promo/piggy.jpg',
  family: '/promo/family.jpg',
  supermarket: '/promo/supermarket.jpg',
  fruits: '/promo/fruits.jpg',
  taxi: '/promo/taxi.jpg',
  airplane: '/promo/airplane.jpg',
}

export const SPECIAL_OFFERS = [
  {
    id: 'vip-platinum',
    tag: 'VIP ПАКЕТ',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Обслуживание уровня Platinum',
    description:
      'Откройте для себя мир привилегий Platinum от Bank of Recreate. Персональный менеджер 24/7, приоритетное обслуживание без очередей, повышенный кэшбэк до 5% на все категории покупок. Доступ в бизнес-залы аэропортов по всему миру, консьерж-сервис и эксклюзивные приглашения на закрытые мероприятия в Ташкенте. Бесплатное обслуживание карт премиум-класса и льготные условия по вкладам.',
    image: P.platinumTashkentGazeta,
    imageAlt: 'МДЦ Tashkent City, архитектурная визуализация',
    /** Кадрирование скриншота: фокус на башнях, меньше меню сайта и подписи статьи */
    coverImageClass: 'object-[center_34%] scale-[1.14]',
    /** Выше обложка в карточке с описанием */
    detailHeroClass: 'h-[13.75rem] sm:h-56',
  },
  {
    id: 'travel-miles',
    tag: 'TRAVEL',
    tagClass: 'border-[#58d6f1]/30 bg-[#58d6f1]/20 text-[#58d6f1]',
    title: 'Мильное страхование поездок',
    description:
      'Путешествуйте без забот! Страхование поездок от Bank of Recreate покрывает медицинские расходы до $100 000, задержки рейсов, утерю багажа и отмену бронирований. Накапливайте мили за каждую поездку и обменивайте их на бесплатные авиабилеты. Действует в 180+ странах мира. Подключение бесплатно для держателей карт Gold и Platinum.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDjJiY09UnaDDcguY3QFXXG9NajehRFEJ5389F3255qfRouKwtzbkqk49oi2Qohq2WgDcnwLoDIXprhT6oh7Ce9Z0xguHMniqC12yZo_fkpKKpnhSOZw9wdDs2b9VpSmZqQmswbrMZLKkIeA63e9ztEClytOFcYpMBOTFduZ6LTArpRb7vAWlAjRi12WJpctlhVZIGndzNvQmFXnejcKmwNpCoblIK5o-p2BzfzQHjqsgQhs1eeHt3Dk1Yag938GJZzQrsqVEEuOrRI',
    imageAlt: 'luxurious yacht interior',
  },
  {
    id: 'invest-portfolio',
    tag: 'ИНВЕСТИЦИИ',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Портфельное управление Recreate',
    description:
      'Доверьте свои инвестиции профессионалам. Портфельное управление Recreate — это диверсифицированный портфель из облигаций, акций и валютных инструментов с доходностью до 15% годовых. Минимальная сумма входа — 5 000 000 UZS. Еженедельные отчёты, полная прозрачность и возможность вывода средств в любой момент.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuChARR0sk9sTUar-F2PdDXcWZ5lRh5uX7t9P294SRWvPkn0w8bb2lqs_758XBnSzz9Pdb3zzSuFCV9g7c2soddMAMba3uEGN7KrIih6_FJAq3UN2WquBGq942s5rPU0vLkasmEQ2K1hvtbIvB3WmqIC2ET_vYZVYendrA4HrE9MNfnFBSCVxVFPZ0MLiHkgCVIgH8N_hHMGBV2Gib6Z1fTbR2EzIrcIVzRTxj4gN4L3oK4dZiAsdfGHGnWBR2BEJHd-uBx25Zgh1Hz-',
    imageAlt: 'abstract financial data visualization',
  },
]

export const BANK_PROMOTIONS = [
  {
    id: 'promo-cashback-food',
    tag: 'КЭШБЭК',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Кэшбэк 15% на рестораны',
    description:
      'Получайте до 15% кэшбэка за оплату в ресторанах и кафе Ташкента картами Bank of Recreate до конца мая 2026. Максимальный кэшбэк — 500 000 UZS в месяц. Действует в более чем 200 заведениях-партнёрах.',
    image: P.restaurant,
    imageAlt: 'restaurant interior',
  },
  {
    id: 'promo-free-card',
    tag: 'АКЦИЯ',
    tagClass: 'border-[#58d6f1]/30 bg-[#58d6f1]/20 text-[#58d6f1]',
    title: 'Бесплатная карта Gold',
    description:
      'Оформите карту Gold бесплатно до 30 июня и получите первый год обслуживания без комиссий. Повышенный кэшбэк 3% на все покупки первые 3 месяца. Доступ в бизнес-залы аэропортов.',
    image: P.goldCard,
    imageAlt: 'golden credit card',
  },
  {
    id: 'promo-deposit-bonus',
    tag: 'ВКЛАД',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Бонус +1% к вкладу',
    description:
      'Откройте вклад на сумму от 10 000 000 UZS и получите дополнительный 1% годовых к базовой ставке. Акция действует для новых вкладов до 31 мая 2026. Начисление бонуса — с первого дня.',
    image: P.piggy,
    imageAlt: 'piggy bank savings',
  },
  {
    id: 'promo-family',
    tag: 'СЕМЬЯ',
    tagClass: 'border-[#58d6f1]/30 bg-[#58d6f1]/20 text-[#58d6f1]',
    title: 'Семейный пакет: -50%',
    description:
      'Подключите семейный пакет и получите скидку 50% на обслуживание всех карт семьи. До 5 карт в одном пакете, общий лимит расходов и контроль через мобильное приложение.',
    image: P.family,
    imageAlt: 'happy family',
  },
]

export const PARTNER_PROMOTIONS = [
  {
    id: 'partner-makro',
    tag: 'ПАРТНЁР',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Makro: скидка 10% с картой Recreate',
    description:
      'Оплачивайте покупки в Makro картой Bank of Recreate и получайте моментальную скидку 10% на весь ассортимент. Акция действует каждую субботу до конца июня 2026.',
    image: P.supermarket,
    imageAlt: 'supermarket shopping',
  },
  {
    id: 'partner-korzinka',
    tag: 'ПАРТНЁР',
    tagClass: 'border-[#58d6f1]/30 bg-[#58d6f1]/20 text-[#58d6f1]',
    title: 'Korzinka: бонусные баллы x2',
    description:
      'Удвоенные бонусные баллы при оплате в Korzinka картами Bank of Recreate. Накопленные баллы можно обменять на скидку до 20% на следующую покупку.',
    image: P.fruits,
    imageAlt: 'grocery store produce',
  },
  {
    id: 'partner-yandex-go',
    tag: 'ТРАНСПОРТ',
    tagClass: 'border-[#4cd6fb]/30 bg-[#4cd6fb]/20 text-[#4cd6fb]',
    title: 'Yandex Go: кэшбэк 20%',
    description:
      'Получайте 20% кэшбэка за поездки в Yandex Go при оплате картой Bank of Recreate. Максимальный кэшбэк — 200 000 UZS в месяц. Действует на все типы поездок.',
    image: P.taxi,
    imageAlt: 'city taxi ride',
  },
  {
    id: 'partner-uzairways',
    tag: 'АВИА',
    tagClass: 'border-[#58d6f1]/30 bg-[#58d6f1]/20 text-[#58d6f1]',
    title: 'Uzbekistan Airways: -15% на билеты',
    description:
      'Скидка 15% на авиабилеты Uzbekistan Airways при покупке картой Bank of Recreate. Действует на международные направления: Стамбул, Дубай, Москва, Сеул. Бронируйте до 30 мая.',
    image: P.airplane,
    imageAlt: 'airplane in sky',
  },
]
