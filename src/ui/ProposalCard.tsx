import { useBatchStore } from '#/stores/batch'

export function ProposalCard() {
  const proposals = useBatchStore((s) => s.proposals)
  const resolve = useBatchStore((s) => s.resolveProposal)
  const pending = proposals.filter((p) => p.status === 'pending')
  if (pending.length === 0) return null

  return (
    <section
      className="card card--alert relative p-5 rounded-xl bg-slate-900/80 border border-amber-500/35 animate-fade-in"
      aria-labelledby="proposal-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <h2 id="proposal-title" className="text-base font-bold text-white flex items-center gap-2">
          Proposals
        </h2>
        <span className="badge badge--warning px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {pending.length} pending
        </span>
      </div>

      {pending.map((p) => (
        <div
          key={p.id}
          className="case space-y-3 pt-3 border-t border-white/10 first:pt-0 first:border-0"
        >
          <p className="case__situation text-xs text-slate-200 leading-relaxed">
            <span className="chip font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 mr-2">
              {p.kind}
            </span>
            {p.summary}
          </p>
          <div className="row flex items-center gap-2 pt-1">
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-all cursor-pointer"
              onClick={() => resolve(p.id, true)}
            >
              Approve
            </button>
            <button
              type="button"
              className="btn--secondary inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all cursor-pointer"
              onClick={() => resolve(p.id, false)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
