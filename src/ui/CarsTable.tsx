import { useState } from 'react'
import { caseById } from '#/sim/batch/cases'
import type { BatchCar } from '#/sim/records'
import { useBatchStore } from '#/stores/batch'

const NO_CARS: BatchCar[] = []

function expectedLabel(car: BatchCar): { text: string; tone: string } {
  const def = car.expected.caseId ? caseById(car.expected.caseId) : undefined
  if (def) {
    return {
      text: def.label,
      tone:
        car.expected.kind === 'wrong_colour'
          ? 'bad'
          : car.expected.kind === 'clean'
            ? 'ok'
            : 'warn',
    }
  }
  switch (car.expected.kind) {
    case 'wrong_colour':
      return { text: 'wrong colour', tone: 'bad' }
    case 'dead_lamp':
      return { text: `dead lamp (${car.expected.faultStep ?? 'lamp'})`, tone: 'warn' }
    case 'incident':
      return { text: 'incident', tone: 'warn' }
    default:
      return { text: 'clean', tone: 'ok' }
  }
}

function Verdict({ value }: { value?: string }) {
  if (!value) return <span className="dash text-slate-500">—</span>
  const v = value.toLowerCase()
  const toneClass =
    v === 'pass'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : v === 'fail'
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/35 font-bold'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return (
    <span
      className={`verdict verdict--${v} inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border ${toneClass}`}
    >
      {value}
    </span>
  )
}

export function CarsTable() {
  const cars = useBatchStore((s) => s.snapshot?.cars) ?? NO_CARS
  const events = useBatchStore((s) => s.events)
  const [selected, setSelected] = useState<string | null>(null)

  if (cars.length === 0) {
    return (
      <section
        className="card relative p-5 bg-slate-900/70 border border-white/10 rounded-xl mt-6"
        aria-labelledby="cars-title"
      >
        <div className="card__head flex items-center justify-between gap-3 mb-4">
          <h2 id="cars-title" className="text-base font-bold text-white flex items-center gap-2">
            Cars
          </h2>
          <span className="tag px-2.5 py-0.5 rounded-full border border-white/10 bg-slate-950/70 text-slate-300 font-mono text-[11px] font-medium uppercase tracking-wider">
            0 in batch
          </span>
        </div>
        <div className="empty flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center">
          <strong className="text-sm font-semibold text-slate-200">
            Waiting for the batch to start…
          </strong>
          <span className="text-xs text-slate-400 mt-1">
            Each car appears here with its expected label, stage, and verdicts.
          </span>
        </div>
      </section>
    )
  }

  const selectedCar = cars.find((c) => c.vin === selected)
  const carEvents = selectedCar
    ? events
        .filter(
          (e) =>
            e.detail.includes(selectedCar.vin) ||
            JSON.stringify(e.payload ?? '').includes(selectedCar.vin),
        )
        .slice(-10)
    : []

  return (
    <section
      className="card relative p-5 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl mt-6"
      aria-labelledby="cars-title"
    >
      <div className="card__head flex items-center justify-between gap-3 mb-4">
        <h2 id="cars-title" className="text-base font-bold text-white flex items-center gap-2">
          Cars
        </h2>
        <span className="tag px-2.5 py-0.5 rounded-full border border-white/10 bg-slate-950/70 text-slate-300 font-mono text-[11px] font-medium uppercase tracking-wider">
          {cars.length} in batch
        </span>
      </div>

      <div className="table-wrap overflow-x-auto -mx-1 px-1">
        <table className="w-full border-collapse font-sans text-xs sm:text-sm">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60 first:rounded-l-lg last:rounded-r-lg">
                VIN
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60">
                Expected
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60">
                State
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60">
                Stage
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60">
                Gate
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60">
                Report
              </th>
              <th className="px-3.5 py-2.5 text-left font-mono text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 bg-slate-950/60 last:rounded-r-lg">
                Slot / Truck
              </th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => {
              const label = expectedLabel(car)
              return (
                <tr
                  key={car.vin}
                  tabIndex={0}
                  aria-selected={car.vin === selected}
                  onClick={() => setSelected(car.vin)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(car.vin)
                    }
                  }}
                  className={`cursor-pointer transition-colors border-b border-white/5 last:border-b-0 ${
                    car.vin === selected ? 'selected bg-sky-500/15' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs font-bold text-white">
                    {car.vin}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span
                      className={`pill pill--${label.tone} inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        label.tone === 'ok'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : label.tone === 'bad'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {label.text}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-slate-300">
                    <span className="state capitalize">{car.state.replaceAll('_', ' ')}</span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-slate-300 font-mono text-xs">
                    Flow {car.stage}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <Verdict value={car.gateVerdict} />
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <Verdict value={car.reportVerdict} />
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-slate-400 font-mono text-xs">
                    {[car.slot, car.truckId].filter(Boolean).join(' / ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedCar && (
        <aside className="detail mt-5 pt-4 border-t border-white/10">
          <div className="detail__head flex items-center justify-between gap-3 mb-2">
            <h3 className="font-mono text-sm font-bold text-white">{selectedCar.vin}</h3>
            <button
              type="button"
              className="btn--secondary px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <p className="hint text-xs text-slate-400 mb-3 font-mono">
            Build sheet: {selectedCar.buildSheet?.model} · {selectedCar.buildSheet?.colour}
          </p>

          {carEvents.length > 0 ? (
            <ol className="detail__events flex flex-col gap-2 my-0 p-0 list-none">
              {carEvents.map((e) => (
                <li
                  key={e.seq}
                  className="detail__event pl-3 border-l-2 border-l-sky-500 text-xs text-slate-300"
                >
                  <span className="mono font-mono text-slate-400 mr-1.5">{e.at.toFixed(1)}s</span>{' '}
                  <strong className="text-white font-semibold">{e.title}</strong>{' '}
                  <span className="text-slate-400">{e.detail}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="hint text-xs text-slate-400">No events recorded for this car yet.</p>
          )}
        </aside>
      )}
    </section>
  )
}
