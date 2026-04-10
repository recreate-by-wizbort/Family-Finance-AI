export default function PreviewPage() {
  return (
    <main
      className="relative flex w-full items-center justify-center overflow-hidden bg-[#041329] font-body text-[#d6e3ff] selection:bg-[#4cd6fb] selection:text-[#003642]"
      style={{ minHeight: '100dvh' }}
    >
      <div className="absolute inset-0 z-0">
        <img
          alt="architectural skyscraper detail"
          className="h-full w-full object-cover opacity-20 grayscale brightness-50"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzomY-KZHnGFIadbKc02U3Cvh7q9lPWaxdiuXVi9REUBDvpGsEdLU5rOAKx3GGxIPm-bqIdtIuZcIELXyMjqHpwOOHKKLXn_-2NUtDqyU1DKm2Km8T229jVM2ca9xOs1Yu9C2NW30rRmRsEqfNT5ri7HwEIbtk8f4TdYWT0Yr2ReRzrMHfM2Lziq-e2-FAWh1hRQ57NTLE_nwTGWgK6_KvSM9cT1XD8EM1iS1oT7wbReo30_jLWzDqzViI0oQk-vVohRJXXP1AAOGe"
        />
        <div className="obsidian-overlay absolute inset-0"></div>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#00b4d8]/10 blur-[100px]"></div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4cd6fb]/5 blur-[120px]"></div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-start px-8 md:px-0">
        <div className="mb-1">
          <span className="font-headline text-sm font-extralight uppercase tracking-[0.4em] text-[#bcc9ce]">
            BANK OF
          </span>
        </div>

        <div className="group relative">
          <div className="gold-halo absolute -inset-x-12 -inset-y-8 rounded-full opacity-60"></div>
          <div className="relative flex flex-col">
            <h1 className="font-headline text-6xl font-extrabold leading-[0.9] tracking-tighter text-[#d6e3ff] md:text-8xl">
              RECREATE
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <span className="font-headline text-2xl font-light uppercase tracking-widest text-[#bcc9ce] md:text-3xl">
                BY
              </span>
              <span className="font-headline text-3xl font-bold tracking-tight text-[#4cd6fb] md:text-4xl">
                WIZBORT
              </span>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6">
          <p className="max-w-xs text-sm font-light leading-relaxed tracking-wide text-[#bcc9ce]">
            Securing your digital future through precision engineering and
            architectural financial depth.
          </p>

          <div className="relative h-[2px] w-48 overflow-hidden rounded-full bg-[#27354c]">
            <div className="animate-shimmer absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#4cd6fb] to-transparent"></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 hidden md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4cd6fb]/20">
            <span className="material-symbols-outlined text-[16px] text-[#4cd6fb]">lock</span>
          </div>
          <span className="font-label text-[10px] font-medium uppercase tracking-[0.2em] text-[#bcc9ce]">
            Encrypted Vault 256-bit
          </span>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 hidden md:block">
        <span className="font-label text-[10px] font-medium uppercase tracking-widest text-[#bcc9ce]/40">
          v2.4.0 Obsidian Meridian
        </span>
      </div>
    </main>
  )
}
