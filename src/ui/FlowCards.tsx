import { useBatchStore } from '#/stores/batch'

type Metric = { label: string; value: number | string }
type Entry = {
  name: string
  metrics?: Metric[]
  note?: string
  tone?: 'success' | 'warning' | 'danger'
}

const NAMES = ['Yard', 'Assistance', 'Visual', 'Functional', 'Report', 'Scenario', 'Adversarial']

function flowEntries(counts: ReturnType<typeof useBatchStore.getState>['counts']): Entry[] {
  if (!counts) {
    return NAMES.map((name) => ({ name, note: 'Awaiting batch' }))
  }
  return [
    {
      name: 'Yard',
      metrics: [
        { label: 'Released', value: counts.flow1.released },
        { label: 'In yard', value: counts.flow1.inYard },
        { label: 'Shipped', value: counts.flow1.shipped },
      ],
    },
    {
      name: 'Assistance',
      metrics: [
        { label: 'Cases', value: counts.flow2.cases },
        { label: 'Open', value: counts.flow2.open },
        { label: 'Resolved', value: counts.flow2.resolved },
      ],
      tone: counts.flow2.escalated ? 'warning' : undefined,
    },
    {
      name: 'Visual',
      metrics: [
        { label: 'Pass', value: counts.flow3.pass },
        { label: 'Review', value: counts.flow3.review },
        { label: 'Fail', value: counts.flow3.fail },
      ],
      tone: counts.flow3.fail ? 'danger' : counts.flow3.review ? 'warning' : 'success',
    },
    {
      name: 'Functional',
      metrics: [
        { label: 'Pass', value: counts.flow4.pass },
        { label: 'Fail', value: counts.flow4.fail },
        { label: 'Disagreements', value: counts.flow4.disagreements },
      ],
      tone: counts.flow4.fail ? 'danger' : counts.flow4.disagreements ? 'warning' : 'success',
    },
    {
      name: 'Report',
      metrics: [
        { label: 'Pass', value: counts.flow5.pass },
        { label: 'Rework', value: counts.flow5.rework },
        { label: 'Shipped', value: counts.flow5.shipped },
      ],
      tone: counts.flow5.rework ? 'warning' : 'success',
    },
    {
      name: 'Scenario',
      metrics:
        counts.flow6.status === 'not_triggered'
          ? undefined
          : [{ label: 'Generated', value: counts.flow6.generated }],
      note:
        counts.flow6.status === 'not_triggered'
          ? 'Not triggered (no incident)'
          : counts.flow6.status,
    },
    {
      name: 'Adversarial',
      metrics:
        counts.flow7.status === 'not_triggered'
          ? undefined
          : [
              { label: 'Runs', value: counts.flow7.runs },
              { label: 'Failures', value: counts.flow7.failures },
            ],
      note:
        counts.flow7.status === 'not_triggered'
          ? 'Not triggered (no incident)'
          : counts.flow7.status,
      tone: counts.flow7.failures ? 'danger' : undefined,
    },
  ]
}

export function FlowCards() {
  const counts = useBatchStore((s) => s.counts)
  const entries = flowEntries(counts)

  return (
    <section className="section mt-10" aria-labelledby="flows-title">
      <div className="section__head flex items-baseline justify-between gap-4 mb-4">
        <h2 id="flows-title" className="text-base font-bold text-white flex items-center gap-2">
          Flows
        </h2>
        <span className="hint text-xs font-mono text-slate-400">Live pipeline counts</span>
      </div>
      <div className="cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {entries.map((entry, i) => (
          <article
            key={entry.name}
            className={`card flow flex flex-col justify-between gap-3 p-4 rounded-xl bg-slate-900/70 border transition-colors duration-200 ${
              entry.tone === 'success'
                ? 'border-emerald-500/30 flow--success'
                : entry.tone === 'warning'
                  ? 'border-amber-500/35 flow--warning'
                  : entry.tone === 'danger'
                    ? 'border-rose-500/40 flow--danger'
                    : 'border-white/10'
            }`}
          >
            <div className="flow__head flex items-start justify-between gap-2">
              <h3 className="flex flex-col gap-1 text-sm font-bold text-white">
                <span className="flow__num font-mono text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                  Flow {i + 1}
                </span>
                {entry.name}
              </h3>
              <span
                className={`flow__dot w-2 h-2 rounded-full mt-1 ${
                  entry.tone === 'success'
                    ? 'bg-emerald-400 flow__dot--success'
                    : entry.tone === 'warning'
                      ? 'bg-amber-400 flow__dot--warning'
                      : entry.tone === 'danger'
                        ? 'bg-rose-400 flow__dot--danger'
                        : 'bg-slate-600 flow__dot--idle'
                }`}
                aria-hidden="true"
              />
            </div>

            {entry.metrics && (
              <dl className="flow__metrics flex flex-col gap-1.5 my-0">
                {entry.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flow__metric flex items-baseline justify-between gap-2 py-0.5 border-b border-white/5 last:border-b-0"
                  >
                    <dt className="text-xs text-slate-400">{metric.label}</dt>
                    <dd className="mono font-mono text-xs font-bold text-slate-100">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {entry.note && (
              <p className="flow__note text-xs text-slate-400 leading-relaxed my-0">{entry.note}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
