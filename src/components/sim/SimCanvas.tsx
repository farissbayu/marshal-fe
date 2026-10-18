import { useEffect, useMemo, useRef, useState } from 'react'
import { focusAriaLabel, focusCaption, focusColour } from '#/lib/simview/focus'
import { buildPlantLayout, type PlantLayout } from '#/lib/simview/plantMap'
import { readSimSnapshot } from '#/lib/simview/snapshot'
import { createSimViewer, type SimViewer, type SimViewerFactory } from '#/lib/simview/viewer'
import { getShiftBackend, shiftFocus, useShiftStore } from '#/stores/shift'

/** Props for {@link SimCanvas}. */
export type SimCanvasProps = {
  /** Viewer factory (tests inject one; defaults to the WebGL viewer). */
  createViewer?: SimViewerFactory
  /** Plant layout (defaults to the TEAM_PLAN named points). */
  layout?: PlantLayout
}

/**
 * Live 3D plant view for /shift. Follows the selected car, or the car a decision waits on,
 * and shows every car moving otherwise. Client only: WebGL starts in an effect and a text
 * fallback replaces the canvas when it fails.
 * @param props - Optional viewer factory and layout.
 * @returns The simulator view.
 */
export function SimCanvas({ createViewer = createSimViewer, layout }: SimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const plant = useMemo(() => layout ?? buildPlantLayout(), [layout])

  const shift = useShiftStore((s) => s.shift)
  const selected = useShiftStore((s) => s.selected)
  const focusedCase = useShiftStore((s) => s.focusedCase)
  const dismissedFocus = useShiftStore((s) => s.dismissedFocus)
  const showOverview = useShiftStore((s) => s.showOverview)
  const focus = useMemo(
    () => shiftFocus({ shift, selected, focusedCase, dismissedFocus }),
    [shift, selected, focusedCase, dismissedFocus],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return
    let viewer: SimViewer
    try {
      viewer = createViewer(canvas, overlay, plant)
    } catch {
      setFailed(true)
      return
    }
    const container = canvas.parentElement ?? canvas
    const resize = (): void => {
      const rect = container.getBoundingClientRect()
      viewer.resize(rect.width, rect.height)
    }
    resize()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    if (observer) observer.observe(container)
    else window.addEventListener('resize', resize)

    let raf = 0
    let last: number | null = null
    const loop = (now: number): void => {
      const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const store = useShiftStore.getState()
      const current = shiftFocus(store)
      viewer.frame(readSimSnapshot(getShiftBackend(), store.shift, current), dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
      else window.removeEventListener('resize', resize)
      viewer.dispose()
    }
  }, [createViewer, plant])

  const caption = focusCaption(focus, shift)
  const label = focusAriaLabel(focus, shift)

  return (
    <div className="md-sim-view">
      <div className="md-panel-head">
        <h2 id="md-sim-title">Plant · 3D</h2>
        <button
          type="button"
          className="md-sim-btn"
          onClick={showOverview}
          disabled={!focus}
          aria-label="Show the plant overview"
        >
          Overview
        </button>
      </div>
      <div className="md-sim-stage">
        {failed ? (
          <div className="md-note md-sim-fallback" role="status">
            3D view unavailable (WebGL failed to start). The lanes, yard and car detail below still
            show where every car is.
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="md-sim-canvas" role="img" aria-label={label} />
            <div ref={overlayRef} className="md-sim-overlay" aria-hidden="true" />
          </>
        )}
      </div>
      <p
        className={`md-sim-caption${focus ? ` ${focus.reason}` : ''}`}
        style={focus ? { borderColor: focusColour(focus) } : undefined}
        aria-live="polite"
      >
        {caption}
      </p>
    </div>
  )
}
