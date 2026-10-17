import { useEffect, useRef, useState } from 'react'
import type { ActorSnapshot } from '#/render/scene'
import { createViewer, type Viewer, type ViewMode } from '#/render/viewer'
import type { CarSnapshot } from '#/sim/vehicle'
import { world } from '#/sim/world'
import { useBatchStore } from '#/stores/batch'

const MODES: ViewMode[] = ['overview', 'follow', 'gate', 'track']
const NO_CARS: never[] = []

export function YardScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const carsRef = useRef<CarSnapshot[]>([])
  const actorsRef = useRef<ActorSnapshot[]>([])
  const [mode, setMode] = useState<ViewMode>('overview')
  const [followVin, setFollowVin] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)

  const cars = useBatchStore((s) => s.snapshot?.cars) ?? NO_CARS

  useEffect(() => {
    const unsubscribe = useBatchStore.subscribe((s) => {
      carsRef.current = s.snapshot?.carSnapshots ?? []
      actorsRef.current = (s.snapshot?.actors ?? []) as ActorSnapshot[]
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let viewer: Viewer
    try {
      viewer = createViewer(canvas, world)
    } catch {
      setFailed(true)
      return
    }
    viewerRef.current = viewer

    const container = canvas.parentElement ?? canvas
    const resize = (): void => {
      const rect = container.getBoundingClientRect()
      viewer.resize(rect.width, rect.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    let raf = 0
    let last = carsRef.current
    const loop = (): void => {
      const next = carsRef.current
      viewer.render(last, next, actorsRef.current, 1)
      last = next
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      viewer.dispose()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    viewerRef.current?.setCamera(mode, followVin)
  }, [mode, followVin])

  if (failed) {
    return (
      <div
        className="viewer viewer--failed flex items-center justify-center p-8 rounded-xl border border-dashed border-amber-500/40 bg-slate-950/60 text-amber-200"
        role="status"
      >
        <p className="max-w-md text-sm text-center">
          3D viewer unavailable (WebGL failed to start). The table and log still show progress.
        </p>
      </div>
    )
  }

  return (
    <div className="viewer relative flex-1 min-h-[480px] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <canvas
        ref={canvasRef}
        className="viewer__canvas absolute inset-0 block w-full h-full"
        aria-label="Plant simulation view"
      />

      <div className="viewer__hud absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-10">
        <span className="viewer__label inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 text-slate-200 font-mono text-xs font-semibold tracking-wider uppercase">
          <span className="live-dot w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
          Plant view
        </span>
        <span className="viewer__mode px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 text-sky-400 font-mono text-xs font-bold uppercase tracking-wider">
          {mode}
        </span>
      </div>

      <div className="viewer__controls absolute bottom-4 left-4 flex flex-wrap items-center gap-2 z-10">
        <fieldset
          className="segmented inline-flex p-1 gap-1 rounded-xl bg-slate-950/90 border border-slate-800"
          aria-label="Camera"
        >
          {MODES.map((m) => (
            <label key={m} className="relative inline-flex cursor-pointer">
              <input
                type="radio"
                name="camera"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              <span
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                  mode === m
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {m}
              </span>
            </label>
          ))}
        </fieldset>
        {mode === 'follow' && (
          <select
            aria-label="Follow car"
            value={followVin ?? ''}
            onChange={(e) => setFollowVin(e.target.value || undefined)}
            className="h-8.5 px-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="">First car</option>
            {cars.map((c) => (
              <option key={c.vin} value={c.vin}>
                {c.vin}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
