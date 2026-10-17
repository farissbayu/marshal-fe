import { createFileRoute } from '@tanstack/react-router'
import { AssistCard } from '#/ui/AssistCard'
import { BatchForm } from '#/ui/BatchForm'
import { BatchProgress } from '#/ui/BatchProgress'
import { CarsTable } from '#/ui/CarsTable'
import { EventLog } from '#/ui/EventLog'
import { FlowCards } from '#/ui/FlowCards'
import { ProposalCard } from '#/ui/ProposalCard'
import { ReportCard } from '#/ui/ReportCard'
import { YardScene } from '#/ui/YardScene'

export const Route = createFileRoute('/')({ ssr: false, component: Dashboard })

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect className="brand__plate" x="1" y="1" width="38" height="38" rx="11" />
      <path className="brand__line" d="M10.5 27.5 15.5 12.5h9l5 15" />
      <path className="brand__road" d="M13.5 21.5h13" />
      <circle className="brand__lamp" cx="20" cy="31.5" r="1.6" />
    </svg>
  )
}

function Dashboard() {
  return (
    <main className="app relative z-10 mx-auto w-[min(1360px,calc(100%-2.5rem))] py-8 pb-16">
      <header className="topbar flex flex-wrap items-center justify-between gap-4 mb-8 p-4 px-6 bg-slate-900/70 border border-white/10 rounded-xl">
        <div className="brand flex items-center gap-3.5 min-w-0">
          <BrandMark />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-baseline gap-1.5">
              Marshal{' '}
              <span className="brand__suffix text-lg font-medium text-sky-400">Three.js</span>
            </h1>
            <p className="brand__sub text-xs sm:text-sm text-slate-400 mt-0.5">
              Virtual plant simulation: 7 production flows powered by Three.js &amp; Vertex AI.
            </p>
          </div>
        </div>
        <div className="topbar__meta flex flex-wrap items-center gap-2">
          <span className="tag tag--live inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-[11px] font-semibold tracking-wider uppercase">
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Live Plant
          </span>
          <span className="tag inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-950/70 text-slate-300 font-mono text-[11px] font-semibold tracking-wider uppercase">
            3D WebGL
          </span>
          <span className="tag inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-950/70 text-sky-300 font-mono text-[11px] font-semibold tracking-wider uppercase">
            Vertex AI · Gemini
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-5 items-stretch mb-5">
        <div className="column flex flex-col gap-5 min-w-0">
          <BatchForm />
          <BatchProgress />
          <AssistCard />
          <ProposalCard />
        </div>
        <div className="column flex flex-col min-w-0">
          <YardScene />
        </div>
      </div>

      <FlowCards />
      <CarsTable />
      <EventLog />
      <ReportCard />

      <footer className="footer flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-14 pt-6 border-t border-white/10 text-slate-400 font-mono text-xs tracking-wider">
        <span>One batch at a time</span>
        <span>·</span>
        <span>History stays in this browser tab</span>
        <span>·</span>
        <span>Report exports as JSON</span>
      </footer>
    </main>
  )
}
