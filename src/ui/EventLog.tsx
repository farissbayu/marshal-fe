import { useState } from 'react'
import { useBatchStore } from '#/stores/batch'

export function EventLog() {
  const events = useBatchStore((s) => s.events)
  const [onlyExceptions, setOnlyExceptions] = useState(false)

  const filtered = onlyExceptions
    ? events.filter((e) => e.level === 'warn' || e.level === 'bad')
    : events
  const shown = [...filtered].reverse().slice(0, 200)

  return (
    <section
      className="card relative p-5 bg-slate-900/70 border border-white/10 rounded-xl mt-6"
      aria-labelledby="log-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <div className="row row--tight flex items-center gap-2">
          <h2 id="log-title" className="text-base font-bold text-white flex items-center gap-2">
            Event log
          </h2>
          <span className="tag px-2.5 py-0.5 rounded-full border border-white/10 bg-slate-950/70 text-slate-300 font-mono text-[11px] font-medium uppercase tracking-wider">
            {filtered.length} events
          </span>
        </div>
        <label className="check inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer hover:text-white transition-colors select-none">
          <input
            type="checkbox"
            checked={onlyExceptions}
            onChange={(e) => setOnlyExceptions(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500/30 cursor-pointer"
          />
          Exceptions only
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="empty flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center">
          <strong className="text-sm font-semibold text-slate-200">
            Waiting for the batch to start…
          </strong>
          <span className="text-xs text-slate-400 mt-1">
            Flow events, AI calls, and supervisor decisions stream here.
          </span>
        </div>
      ) : (
        <ol className="log flex flex-col max-h-[360px] overflow-y-auto divide-y divide-white/5 font-mono text-xs p-0 m-0 list-none">
          {shown.map((e) => (
            <li
              key={`${e.batchId}-${e.seq}`}
              className={`log__item log__item--${e.level} grid grid-cols-[8px_3.2rem_2.2rem_6.8rem_minmax(0,1fr)] gap-2.5 items-baseline py-2 px-1 hover:bg-white/[0.02] transition-colors`}
            >
              <span
                className={`log__level log__level--${e.level} self-center w-2 h-2 rounded-full ${
                  e.level === 'good'
                    ? 'bg-emerald-400'
                    : e.level === 'warn'
                      ? 'bg-amber-400'
                      : e.level === 'bad'
                        ? 'bg-rose-400'
                        : 'bg-slate-500'
                }`}
                aria-hidden="true"
              />
              <span className="log__time mono text-[11px] text-slate-400 text-right">
                {e.at.toFixed(1)}s
              </span>
              <span className="log__flow font-semibold text-sky-400 text-xs">
                {e.flow ? `F${e.flow}` : '—'}
              </span>
              <span
                className={`log__source truncate text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                  e.source.startsWith('gemini')
                    ? 'text-purple-300 bg-purple-500/10 border-purple-500/20'
                    : e.source.startsWith('yard')
                      ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                      : 'text-slate-400 bg-slate-800/40 border-slate-700/50'
                }`}
              >
                {e.source}
              </span>
              <span className="log__msg text-xs text-slate-300 truncate">
                <strong
                  className={`font-semibold mr-1.5 ${
                    e.level === 'good'
                      ? 'text-emerald-300'
                      : e.level === 'warn'
                        ? 'text-amber-300'
                        : e.level === 'bad'
                          ? 'text-rose-300'
                          : 'text-white'
                  }`}
                >
                  {e.title}
                </strong>
                <span className="text-slate-400">{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
