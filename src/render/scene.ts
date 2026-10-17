import * as THREE from 'three'
import type { CarSnapshot } from '#/sim/vehicle'
import { type World, YARD_SLOTS } from '#/sim/world'
import { createCarMesh, updateCarMesh } from './cars'

export type ActorSnapshot = {
  id: string
  kind: 'box' | 'walker' | 'vehicle'
  x: number
  y: number
}

export type YardScene = {
  scene: THREE.Scene
  syncCars(snaps: CarSnapshot[]): void
  syncActors(actors: ActorSnapshot[]): void
  dispose(): void
}

function standard(colour: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness })
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  return mesh
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((node: THREE.Object3D) => {
    const mesh = node as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      for (const item of material) item.dispose()
    } else {
      material?.dispose()
    }
  })
}

export function createYardScene(world: World): YardScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f1115)

  const points = Object.values(world.points)
  const minX = Math.min(...points.map((p) => p.x))
  const maxX = Math.max(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxY = Math.max(...points.map((p) => p.y))

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(maxX - minX + 40, maxY - minY + 40),
    standard(0x24272b, 0.95),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set((minX + maxX) / 2, -0.02, (minY + maxY) / 2)
  scene.add(floor)

  const roadMaterial = standard(0x3a3d42)
  const markingMaterial = standard(0xd8d8d8)
  for (const segment of world.segments) {
    const from = world.point(segment.from)
    const to = world.point(segment.to)
    const dx = to.x - from.x
    const dz = to.y - from.y
    const length = Math.hypot(dx, dz)
    if (length === 0) continue
    const angle = -Math.atan2(dz, dx)
    const midX = (from.x + to.x) / 2
    const midZ = (from.y + to.y) / 2

    const road = box(length, 0.04, 4.5, roadMaterial, midX, 0.01, midZ)
    road.rotation.y = angle
    scene.add(road)

    const marking = box(length, 0.02, 0.12, markingMaterial, midX, 0.04, midZ)
    marking.rotation.y = angle
    scene.add(marking)
  }

  const gate = world.point('inspection_gate')
  const frameMaterial = standard(0xf0b429, 0.6)
  scene.add(box(0.3, 3, 0.3, frameMaterial, gate.x, 1.5, gate.y - 3.2))
  scene.add(box(0.3, 3, 0.3, frameMaterial, gate.x, 1.5, gate.y + 3.2))
  scene.add(box(0.3, 0.3, 6.7, frameMaterial, gate.x, 3, gate.y))

  const track = world.point('test_track')
  const poleMaterial = standard(0x6f757d, 0.7)
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff0b0,
    emissive: 0xfff0b0,
    emissiveIntensity: 1.5,
  })
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    const x = gate.x + (track.x - gate.x) * t
    const z = gate.y + (track.y - gate.y) * t + (i % 2 === 0 ? 5 : -5)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), poleMaterial)
    pole.position.set(x, 2, z)
    scene.add(pole)
    scene.add(box(0.35, 0.18, 0.35, lampMaterial, x, 4, z))
  }

  const slotMaterial = standard(0x30353b)
  for (const slot of YARD_SLOTS) {
    const point = world.point(slot)
    scene.add(box(6, 0.06, 4, slotMaterial, point.x, 0.03, point.y))
  }

  const loading = world.point('loading_bay')
  scene.add(box(12, 0.06, 10, standard(0x3b4148), loading.x, 0.03, loading.y))
  const truckMaterial = standard(0xd7d7d7, 0.6)
  scene.add(box(8, 3, 2.6, truckMaterial, loading.x - 8, 1.5, loading.y + 8))
  scene.add(box(2.5, 2, 2.4, truckMaterial, loading.x - 3.5, 1, loading.y + 8))

  const elevation = THREE.MathUtils.degToRad(35)
  const radius = 100
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(
    Math.cos(elevation) * radius * Math.SQRT1_2,
    Math.sin(elevation) * radius,
    Math.cos(elevation) * radius * Math.SQRT1_2,
  )
  scene.add(sun)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  const cars = new Map<string, THREE.Group>()
  const actors = new Map<string, THREE.Object3D>()

  function syncCars(snaps: CarSnapshot[]): void {
    const seen = new Set<string>()
    for (const car of snaps) {
      seen.add(car.vin)
      const existing = cars.get(car.vin)
      if (existing) {
        updateCarMesh(existing, car)
        continue
      }
      const mesh = createCarMesh(car)
      cars.set(car.vin, mesh)
      scene.add(mesh)
    }
    for (const [vin, mesh] of cars) {
      if (seen.has(vin)) continue
      scene.remove(mesh)
      disposeObject(mesh)
      cars.delete(vin)
    }
  }

  function createActor(actor: ActorSnapshot): THREE.Object3D {
    if (actor.kind === 'walker') {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
        standard(0xf08a24, 0.8),
      )
      mesh.position.y = 0.8
      return mesh
    }
    if (actor.kind === 'vehicle') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 1.8), standard(0x4f6b8f, 0.6))
      mesh.position.y = 0.7
      return mesh
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), standard(0xb07b4f, 0.9))
    mesh.position.y = 0.45
    return mesh
  }

  function syncActors(snaps: ActorSnapshot[]): void {
    const seen = new Set<string>()
    for (const actor of snaps) {
      seen.add(actor.id)
      let object = actors.get(actor.id)
      if (!object) {
        object = createActor(actor)
        actors.set(actor.id, object)
        scene.add(object)
      }
      object.position.x = actor.x
      object.position.z = actor.y
    }
    for (const [id, object] of actors) {
      if (seen.has(id)) continue
      scene.remove(object)
      disposeObject(object)
      actors.delete(id)
    }
  }

  function dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    scene.traverse((node: THREE.Object3D) => {
      const mesh = node as THREE.Mesh
      if (mesh.geometry) geometries.add(mesh.geometry)
      const material = mesh.material
      if (Array.isArray(material)) {
        for (const item of material) materials.add(item)
      } else if (material) {
        materials.add(material)
      }
    })
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
    cars.clear()
    actors.clear()
    scene.clear()
  }

  return { scene, syncCars, syncActors, dispose }
}
