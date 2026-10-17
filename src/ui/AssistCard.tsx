import { useBatchStore } from '#/stores/batch'

const OPTIONS = ['wait_for_removal', 'reroute', 'manual_override']

export function AssistCard() {
  const cases = useBatchStore((s) => s.cases)
  const decide = useBatchStore((s) => s.decide)
  const open = cases.filter((c) => c.status === 'open' || c.status === 'escalated')
  if (open.length === 0) return null

  return (
    <section
      className="card card--alert relative p-5 rounded-xl bg-slate-900/80 border border-amber-500/35 animate-fade-in"
      aria-live="assertive"
      aria-labelledby="assist-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <h2 id="assist-title" className="text-base font-bold text-white flex items-center gap-2">
          Assistance needed
        </h2>
        <span className="badge badge--warning px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {open.length} open
        </span>
      </div>

      {open.map((c) => (
        <div
          key={c.caseId}
          className="case space-y-3 pt-3 border-t border-white/10 first:pt-0 first:border-0"
        >
          <div className="case__head flex items-center gap-2.5">
            <span className="case__vin mono font-mono text-xs font-bold text-sky-400">{c.vin}</span>
            {c.status === 'escalated' && (
              <span className="badge badge--danger px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/35">
                escalated
              </span>
            )}
          </div>
          <p className="case__situation text-xs text-slate-200 leading-relaxed">{c.situation}</p>

          <dl className="case__meta grid grid-cols-3 gap-2 my-2">
            <div className="p-2 rounded-lg bg-slate-950/70 border border-white/5">
              <dt className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Recommended
              </dt>
              <dd className="text-xs font-semibold text-white mt-0.5 truncate">{c.recommended}</dd>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-white/5">
              <dt className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Risk
              </dt>
              <dd
                className={`risk risk--${c.risk} text-xs font-semibold mt-0.5 capitalize ${
                  c.risk === 'low'
                    ? 'text-emerald-400'
                    : c.risk === 'medium'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {c.risk}
              </dd>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-white/5">
              <dt className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Scene
              </dt>
              <dd className="text-xs font-semibold text-white mt-0.5 truncate">
                {c.peopleOrEquipment ? 'Person present' : 'No person'}
              </dd>
            </div>
          </dl>

          <div className="row flex flex-wrap items-center gap-2 pt-1">
            {OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  option === c.recommended
                    ? 'inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-all cursor-pointer'
                    : 'btn--secondary inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all cursor-pointer'
                }
                onClick={() => decide(c.caseId, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
