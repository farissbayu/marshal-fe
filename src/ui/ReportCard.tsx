import { exportCurrentReport, useBatchStore } from '#/stores/batch'

export function ReportCard() {
  const report = useBatchStore((s) => s.report ?? s.pastReport)
  const live = useBatchStore((s) => s.report)
  if (!report) return null

  return (
    <section
      className="card report relative p-6 rounded-xl bg-slate-900/70 border border-white/10 mt-10"
      aria-labelledby="report-title"
    >
      <div className="card__head flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
        <div>
          <h2 id="report-title" className="text-lg font-bold text-white flex items-center gap-2">
            Report {report.batchId}{' '}
            {!live && (
              <span className="muted text-slate-400 text-sm font-normal">(from history)</span>
            )}
          </h2>
          <p className="hint mono text-xs font-mono text-slate-400 mt-1">
            status {report.status} · model {report.model} · {report.durationS}s · batch size{' '}
            {report.batchSize}
          </p>
        </div>
        <button
          type="button"
          className="btn--secondary px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-md cursor-pointer transition-all"
          onClick={exportCurrentReport}
        >
          Download JSON
        </button>
      </div>

      {report.gemini.degraded && (
        <p className="badge badge--warning inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-4">
          Gemini unavailable, generated from metrics
        </p>
      )}

      <div className="report-summary my-4 p-4 rounded-xl bg-slate-950/60 border border-white/5">
        <h3
          className={`risk risk--${report.gemini.risk} inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 border ${
            report.gemini.risk === 'low'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : report.gemini.risk === 'medium'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          Risk: {report.gemini.risk}
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed max-w-3xl my-1">
          {report.gemini.summary}
        </p>
      </div>

      <h3 className="text-sm font-bold text-slate-300 mt-6 mb-2">Labels</h3>
      <div className="kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
        <div className="kpi flex flex-col gap-0.5 p-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="kpi__value mono font-mono text-2xl font-black text-white">
            {report.labels.total}
          </span>
          <span className="kpi__label font-mono text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Labelled
          </span>
        </div>
        <div className="kpi flex flex-col gap-0.5 p-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="kpi__value mono font-mono text-2xl font-black text-emerald-400">
            {report.labels.caught}
          </span>
          <span className="kpi__label font-mono text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Caught
          </span>
        </div>
        <div className="kpi flex flex-col gap-0.5 p-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="kpi__value mono font-mono text-2xl font-black text-rose-400">
            {report.labels.missed}
          </span>
          <span className="kpi__label font-mono text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Missed
          </span>
        </div>
        <div className="kpi flex flex-col gap-0.5 p-3 rounded-xl bg-slate-950/60 border border-white/5">
          <span className="kpi__value mono font-mono text-2xl font-black text-amber-400">
            {report.labels.falseAlarms}
          </span>
          <span className="kpi__label font-mono text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            False alarms
          </span>
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-300 mt-6 mb-2">Per-flow feedback</h3>
      <ol className="feedback flex flex-col gap-2.5 my-3 p-0 list-none">
        {report.gemini.perFlow.map((f) => (
          <li
            key={f.flow}
            className="feedback__item grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-colors"
          >
            <span className="feedback__num font-mono text-xs font-bold text-sky-400 pt-0.5">
              F{f.flow}
            </span>
            <div>
              <strong className="text-sm font-semibold text-white">
                Flow {f.flow} — {f.name}
              </strong>
              {f.observation && (
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{f.observation}</p>
              )}
              {f.recommendation && (
                <p className="feedback__rec text-xs text-sky-300 mt-1 font-medium">
                  → {f.recommendation}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {report.gemini.topIssues.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-slate-300 mt-6 mb-2">Top issues</h3>
          <ul className="issues my-2 pl-5 list-disc space-y-1 text-xs text-slate-300">
            {report.gemini.topIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
