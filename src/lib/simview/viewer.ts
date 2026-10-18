// WebGL viewer for the /shift 3D view: renders the plant scene, eases the camera towards the
// focused car (or the overview) and positions HTML labels over the canvas. Browser only.

import * as THREE from 'three'
import { type CameraPose, followCamera, overviewCamera, stepCamera } from './camera'
import type { PlantLayout } from './plantMap'
import { createPlantScene, type LabelAnchor, NEAR_LABEL_M, type PlantScene } from './scene'
import type { SimSnapshot } from './snapshot'

export type SimViewer = {
  /** Syncs a frame and renders it; `dt` is real seconds since the last frame. */
  frame(snapshot: SimSnapshot, dt: number): void
  resize(width: number, height: number): void
  dispose(): void
}

/** Creates a viewer; throws when WebGL is unavailable. */
export type SimViewerFactory = (
  canvas: HTMLCanvasElement,
  overlay: HTMLElement,
  layout: PlantLayout,
) => SimViewer

function labelElement(overlay: HTMLElement, anchor: LabelAnchor): HTMLElement {
  const el = document.createElement('div')
  el.className = anchor.kind === 'focus' ? 'md-sim-label focus' : 'md-sim-label'
  overlay.appendChild(el)
  return el
}

/**
 * Creates the WebGL viewer.
 * @param canvas - Canvas to render into.
 * @param overlay - Element (over the canvas) that receives the HTML labels.
 * @param layout - Plant layout.
 * @returns Viewer.
 */
export const createSimViewer: SimViewerFactory = (canvas, overlay, layout) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  const dpr = typeof devicePixelRatio === 'number' ? Math.min(2, devicePixelRatio) : 1
  renderer.setPixelRatio(dpr)
  const plant: PlantScene = createPlantScene(layout)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000)
  const overview = overviewCamera(layout)
  let pose: CameraPose = overview
  let width = 1
  let height = 1
  const labels = new Map<string, HTMLElement>()
  const scratch = new THREE.Vector3()
  let time = 0

  const placeLabels = (): void => {
    const seen = new Set<string>()
    for (const anchor of plant.labels()) {
      seen.add(anchor.id)
      let el = labels.get(anchor.id)
      if (!el) {
        el = labelElement(overlay, anchor)
        labels.set(anchor.id, el)
      }
      if (el.textContent !== anchor.text) el.textContent = anchor.text
      if (anchor.colour) el.style.borderColor = anchor.colour
      scratch.set(...anchor.position)
      const near = !anchor.near || scratch.distanceTo(camera.position) < NEAR_LABEL_M
      scratch.project(camera)
      const visible =
        near && scratch.z < 1 && Math.abs(scratch.x) < 1.1 && Math.abs(scratch.y) < 1.1
      el.style.display = visible ? '' : 'none'
      if (!visible) continue
      const x = ((scratch.x + 1) / 2) * width
      const y = ((1 - scratch.y) / 2) * height
      el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    }
    for (const [id, el] of labels) {
      if (seen.has(id)) continue
      el.remove()
      labels.delete(id)
    }
  }

  return {
    frame(snapshot, dt) {
      time += dt
      plant.sync(snapshot, time)
      const goal = snapshot.focusPose ? followCamera(snapshot.focusPose) : overview
      pose = stepCamera(pose, goal, dt)
      camera.position.set(...pose.position)
      camera.lookAt(...pose.target)
      renderer.render(plant.scene, camera)
      placeLabels()
    },
    resize(nextWidth, nextHeight) {
      if (nextWidth <= 0 || nextHeight <= 0) return
      width = nextWidth
      height = nextHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    },
    dispose() {
      for (const el of labels.values()) el.remove()
      labels.clear()
      plant.dispose()
      renderer.dispose()
    },
  }
}
