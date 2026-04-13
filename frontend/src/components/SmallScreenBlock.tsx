import { useEffect, useState } from 'react'

/** Viewports below Tailwind `md` (768px) — layout is not usable on phones. */
const MAX_WIDTH_PX = 767

export default function SmallScreenBlock() {
  const [tooSmall, setTooSmall] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MAX_WIDTH_PX : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MAX_WIDTH_PX}px)`)
    const sync = () => setTooSmall(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!tooSmall) return null

  return (
    <div
      className="fixed inset-0 z-[110000] flex flex-col items-center justify-center gap-5 bg-slate-950 px-8 text-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="small-screen-title"
      aria-describedby="small-screen-desc"
    >
      <div className="max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
          <svg
            className="h-7 w-7 text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <h1 id="small-screen-title" className="text-lg font-semibold text-white">
          Phone not supported
        </h1>
        <p id="small-screen-desc" className="mt-2 text-sm leading-relaxed text-slate-400">
          Sudic Internal needs a larger screen. Please open this app on a tablet in landscape, laptop, or desktop
          (about 768px width or more).
        </p>
      </div>
    </div>
  )
}
