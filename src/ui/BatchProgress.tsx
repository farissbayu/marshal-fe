import { useBatchStore } from '#/stores/batch'

const TONE: Record<string, string> = {
  queued: 'neutral',
  running: 'info',
  done: 'success',
  failed: 'danger',
  cancelled: 'warning',
}

export function BatchProgress() {
  const status = useBatchStore((s) => s.status)
  const progress = useBatchStore((s) => s.progress)
  const requested = useBatchStore((s) => s.requestedCars)
  const finished = useBatchStore((s) => s.finishedCars)
  const shipped = useBatchStore((s) => s.counts?.flow1.shipped ?? 0)
  const simTime = useBatchStore((s) => Math.round(s.snapshot?.simTime ?? 0))
  const paused = useBatchStore((s) => s.paused)
  const togglePause = useBatchStore((s) => s.togglePause)
  const timeScale = useBatchStore((s) => s.timeScale)
  const setTimeScale = useBatchStore((s) => s.setTimeScale)
  const degraded = useBatchStore((s) => s.degraded)

  return (
    <section
      className="card relative p-5 bg-slate-900/70 border border-white/10 rounded-xl"
      aria-live="polite"
      aria-labelledby="progress-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <h2 id="progress-title" className="text-base font-bold text-white flex items-center gap-2">
          Progress
        </h2>
        <div className="row row--tight flex items-center gap-2">
          {degraded && (
            <span
              className="badge badge--warning px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="Gemini unavailable, using deterministic answers"
            >
              offline answers
            </span>
          )}
          <span
            className={`badge badge--${TONE[status] ?? 'neutral'} px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
              status === 'running'
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : status === 'done'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : status === 'failed'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            data-testid="batch-status"
          >
            {status}
          </span>
        </div>
      </div>

      <div className="progress-head flex items-baseline justify-between gap-3 mb-1.5">
        <span className="progress-percent mono text-2xl font-black font-mono tracking-tight text-white">
          {progress}%
        </span>
        <span className="hint mono text-xs font-mono text-slate-400">{simTime}s sim</span>
      </div>
      <progress
        max={100}
        value={progress}
        aria-label="Batch progress"
        className="w-full h-2.5 mb-4 rounded-full bg-slate-950/80 overflow-hidden [&::-webkit-progress-bar]:bg-slate-950/80 [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-sky-600 [&::-webkit-progress-value]:to-sky-400 [&::-moz-progress-bar]:bg-sky-500"
      />

      <div className="stats grid grid-cols-3 gap-2.5 mb-4">
        <div className="stat flex flex-col gap-0.5 p-2.5 px-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="stat__label text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
            Requested
          </span>
          <span className="stat__value mono text-lg font-bold font-mono text-white">
            {requested}
          </span>
        </div>
        <div className="stat flex flex-col gap-0.5 p-2.5 px-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="stat__label text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
            Finished
          </span>
          <span className="stat__value mono text-lg font-bold font-mono text-white">
            {finished}
          </span>
        </div>
        <div className="stat flex flex-col gap-0.5 p-2.5 px-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="stat__label text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
            Shipped
          </span>
          <span className="stat__value mono text-lg font-bold font-mono text-white">{shipped}</span>
        </div>
      </div>

      <div className="control-strip flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        <button
          type="button"
          className={
            paused
              ? 'inline-flex items-center justify-center min-h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-all cursor-pointer'
              : 'btn--secondary inline-flex items-center justify-center min-h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all cursor-pointer'
          }
          onClick={togglePause}
          disabled={status !== 'running'}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
        <div className="speed flex items-center gap-2">
          <span className="speed__label text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Speed
          </span>
          <fieldset
            className="segmented inline-flex p-1 gap-1 rounded-xl bg-slate-950/90 border border-slate-800"
            aria-label="Simulation speed"
          >
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === timeScale}
                onClick={() => setTimeScale(s)}
                className={`min-h-7 px-2.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                  s === timeScale
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {s}×
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </section>
  )
}
