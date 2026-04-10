import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import UzsAmount from '../components/UzsAmount'
import { isSessionUnlocked } from '../utils/sessionLock'

const favoriteRecipients = [
  {
    name: 'Анна М.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBqtwgPv7U-lW5pwOEZZwKZnfPX5nH0hGAHLRK5WnNSTUfo0hr0GPUgsFr_lgmU6EXaZioqYrF4q78WY9sefBWGCzx5t2GkzliUYYQhrC4CIQrIk4CXMN0b59neR_n8Yzh4MwPCVt_Vz4E6UR8nKg-0p8jhXIM124GP8LUFt7jN7qe0QetnG_kVs8CnDQcI5zRKkG0aNveObd5yGnmGfSDrmipA0V0huXUEynlVm_ajt2V2VBQvLj72IwVHjbeTtCE_pzFDd-qC8brG',
  },
  {
    name: 'Дмитрий П.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVhv-AwJ6Xysyj8aYvnqOuLPDA713ygZJNkX4UPp9JrajUTiFWwF-RKmxBO71XK9N2ch-BBpCZvhO15SI0rzs4ORVOyFf4O_-jDX1NmXcmEt8XvljrytWt5Ouxb6iO1bJIbiDL0pHRnVuqpmDRVYkIyWhUt4o44389gRQy5R7PXUP0ojFzeHwmW4bnprBNO1ehTQhOxVATZOG-WYSY4tEBVlrj0B2RMk4FaMlOvLchyz6ENiA49QwL0X0LWA8ygxrIABsThT_lgK-H',
  },
  {
    name: 'Мама',
    initials: 'КР',
  },
  {
    name: 'Елена К.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD4R2l9JmNAm35BsxXsoA1BalcfowOFmkR4To9aZRLoJ5cG6pfzKIqlPhxAOpQTjV1cf-FMoyo-xhk96gDUtWkU9NsgvmhgQSaZdLg1Yjr6d2jU17tdRthaMer2h4MIxcw6cveSvM8lHpBrua3R5u1FhnO-uAC6XipqQq_z9uWKO_MX93CskEoTAFw878BAdcbMRA8ThaBPdnEPUlysjcMCselPus7u_79yQa0lF4d8TvVBAgfif8C6ZKUUAYJ9DM42TVDtxbJQNI4G',
  },
]

export default function TransferPage() {
  const isUnlocked = isSessionUnlocked()

  return (
    <div className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto max-w-4xl space-y-10 px-6 pb-32 pt-24">
        <section>
          <h1 className="mb-8 font-headline text-3xl font-extrabold tracking-tight">Переводы</h1>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="group relative min-h-[220px] cursor-pointer overflow-hidden rounded-3xl bg-[#112036] p-8 transition-colors hover:bg-[#1c2a41] md:col-span-7">
              <div className="relative z-10">
                <span className="material-symbols-outlined mb-4 block text-4xl text-[#4cd6fb]">smartphone</span>
                <h3 className="mb-2 text-xl font-bold text-[#d6e3ff]">По номеру телефона</h3>
                <p className="max-w-[220px] text-sm text-[#bcc9ce]">Через СБП мгновенно и без комиссии</p>
              </div>
              <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-[#4cd6fb]/10 blur-3xl transition-colors group-hover:bg-[#4cd6fb]/20" />
              <div className="relative z-10 mt-4 flex items-center text-sm font-semibold text-[#4cd6fb]">
                Начать
                <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
              </div>
            </div>

            <div className="flex cursor-pointer flex-col justify-between rounded-3xl bg-[#0d1c32] p-6 transition-colors hover:bg-[#112036] md:col-span-5">
              <div>
                <span className="material-symbols-outlined mb-3 block text-3xl text-[#b9c7e4]">sync_alt</span>
                <h3 className="text-lg font-bold text-[#d6e3ff]">Между своими</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">Карты и счета</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[#bcc9ce]">Без комиссии</span>
                <span className="material-symbols-outlined text-[#bcc9ce]">chevron_right</span>
              </div>
            </div>

            <div className="flex cursor-pointer items-center gap-5 rounded-3xl bg-[#0d1c32] p-6 transition-colors hover:bg-[#112036] md:col-span-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112036]">
                <span className="material-symbols-outlined text-[#58d6f1]">credit_card</span>
              </div>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">По номеру карты</h3>
                <p className="text-xs text-[#bcc9ce]">Любого банка мира</p>
              </div>
            </div>

            <div className="flex cursor-pointer items-center gap-5 rounded-3xl bg-[#0d1c32] p-6 transition-colors hover:bg-[#112036] md:col-span-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#112036]">
                <span className="material-symbols-outlined text-[#4cd6fb]">account_balance</span>
              </div>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">В другой банк</h3>
                <p className="text-xs text-[#bcc9ce]">По реквизитам счета</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold">Избранное</h2>
            <button className="text-sm font-medium text-[#4cd6fb] hover:opacity-80">Все контакты</button>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
            <div className="flex w-24 flex-shrink-0 flex-col items-center gap-3">
              <button className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#3d494d]/30 text-[#bcc9ce] transition-all hover:border-[#4cd6fb]/50 hover:text-[#4cd6fb]">
                <span className="material-symbols-outlined text-3xl">add</span>
              </button>
              <span className="text-center text-[11px] font-medium">Создать</span>
            </div>

            {favoriteRecipients.map((person) => (
              <div key={person.name} className="group flex w-24 flex-shrink-0 cursor-pointer flex-col items-center gap-3">
                {person.image ? (
                  <img
                    alt={person.name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-[#4cd6fb]"
                    src={person.image}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#27354c] text-xl font-bold text-[#4cd6fb]">
                    {person.initials}
                  </div>
                )}
                <span className="text-center text-[11px] font-medium">{person.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 font-headline text-xl font-bold">Быстрые платежи</h2>
          <div className="space-y-4">
            <div className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a41]">
                  <span className="material-symbols-outlined text-[#b9c7e4]">bolt</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Мобильная связь</p>
                  <p className="text-xs text-[#bcc9ce]">Мегафон • +7 (921) ***-44-55</p>
                </div>
              </div>
              <UzsAmount as="span" className="font-bold text-[#d6e3ff]" value="500" />
            </div>

            <div className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c2a41]">
                  <span className="material-symbols-outlined text-[#58d6f1]">home</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">ЖКУ Квартплата</p>
                  <p className="text-xs text-[#bcc9ce]">ЛС №45930211</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#bcc9ce]">chevron_right</span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl font-bold">История</h2>
            <span className="material-symbols-outlined cursor-pointer text-[#bcc9ce]">calendar_today</span>
          </div>

          <div className="space-y-8">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#bcc9ce]">Вчера</p>
              <div className="space-y-6">
                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#4cd6fb]">account_balance</span>
                    </div>
                    <div>
                      <p className="font-semibold">Перевод в Сбербанк</p>
                      <p className="text-xs text-[#bcc9ce]">Александр В. • 14:20</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="− 12 400" />
                    </p>
                    <p className="text-[10px] font-medium text-green-400">Исполнено</p>
                  </div>
                </div>

                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#4cd6fb]">person</span>
                    </div>
                    <div>
                      <p className="font-semibold">Между своими</p>
                      <p className="text-xs text-[#bcc9ce]">С Visa Gold на Мир • 09:12</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="5 000" />
                    </p>
                    <p className="text-[10px] text-[#bcc9ce]">Внутренний</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#bcc9ce]">12 Октября</p>
              <div className="space-y-6">
                <div className="group flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1c32]">
                      <span className="material-symbols-outlined text-[#58d6f1]">shopping_bag</span>
                    </div>
                    <div>
                      <p className="font-semibold">Оплата по QR-коду</p>
                      <p className="text-xs text-[#bcc9ce]">Wildberries • 18:45</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#d6e3ff]">
                      <UzsAmount as="span" value="− 2 850" />
                    </p>
                    <p className="text-[10px] font-medium text-green-400">
                      Кэшбэк <UzsAmount as="span" value="28" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="transfers" isUnlocked={isUnlocked} />
    </div>
  )
}
