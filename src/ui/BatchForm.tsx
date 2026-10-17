import { useEffect, useRef, useState } from 'react'
import { useBatchStore } from '#/stores/batch'

export function BatchForm() {
  const status = useBatchStore((s) => s.status)
  const start = useBatchStore((s) => s.start)
  const cancel = useBatchStore((s) => s.cancel)
  const [cars, setCars] = useState(3)
  const [confirming, setConfirming] = useState(false)
  const keepRunningRef = useRef<HTMLButtonElement>(null)

  const active = status === 'running'
  const valid = Number.isInteger(cars) && cars >= 1 && cars <= 6

  useEffect(() => {
    if (!confirming) return
    keepRunningRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirming(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming])

  return (
    <section
      className="card relative p-5 bg-slate-900/70 border border-white/10 rounded-xl transition-colors hover:border-white/20"
      aria-labelledby="form-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <h2 id="form-title" className="text-base font-bold text-white flex items-center gap-2">
          New batch
        </h2>
        <span className="tag px-2.5 py-0.5 rounded-full border border-white/10 bg-slate-950/70 text-slate-300 font-mono text-[11px] font-medium uppercase tracking-wider">
          1–6 cars
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid && !active) void start(cars)
        }}
        className="space-y-4"
      >
        <div className="field flex flex-col gap-1.5">
          <label htmlFor="cars" className="text-xs font-semibold text-slate-300">
            Cars in this batch
          </label>
          <div className="field__control flex items-center gap-2.5">
            <input
              id="cars"
              type="number"
              min={1}
              max={6}
              value={cars}
              aria-invalid={!valid}
              aria-describedby="cars-help"
              className="w-24 h-10 px-3 text-center rounded-lg bg-slate-950/80 border border-slate-700/80 text-white font-mono text-sm font-semibold focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/25 transition-all"
              onChange={(e) => setCars(Number(e.target.value))}
            />
            <span className="field__unit text-xs text-slate-400 font-medium">vehicles</span>
          </div>
          <p id="cars-help" className="hint text-[11px] text-slate-400">
            Other data is generated and labelled.
          </p>
        </div>

        {!valid && (
          <p role="alert" className="danger text-xs font-medium text-rose-400">
            Enter between 1 and 6 cars.
          </p>
        )}

        <div className="row flex items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={active || !valid}
            className="inline-flex items-center justify-center min-h-10 px-5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-semibold text-sm border border-sky-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
          >
            {active ? 'Batch running…' : 'Run batch'}
          </button>
          {active && (
            <button
              type="button"
              className="btn--secondary inline-flex items-center justify-center min-h-10 px-4 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] text-slate-200 font-medium text-sm border border-slate-700 transition-all cursor-pointer"
              onClick={() => setConfirming(true)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {confirming && (
        <div className="dialog-backdrop fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="dialog w-full max-w-md p-6 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/60"
          >
            <h2 id="cancel-title" className="text-lg font-bold text-white mb-2">
              Cancel this batch?
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              The run stops where it is and is marked cancelled.
            </p>
            <div className="row row--end flex items-center justify-end gap-3">
              <button
                ref={keepRunningRef}
                type="button"
                className="btn--secondary px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all cursor-pointer"
                onClick={() => setConfirming(false)}
              >
                Keep running
              </button>
              <button
                type="button"
                className="btn--danger px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all cursor-pointer"
                onClick={() => {
                  cancel()
                  setConfirming(false)
                }}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
