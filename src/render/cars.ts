import * as THREE from 'three'
import type { CarSnapshot } from '#/sim/vehicle'

const BODY_LENGTH = 4.2
const BODY_WIDTH = 1.8
const BODY_HEIGHT = 0.6
const LAMP_ON_EMISSIVE = 1.4
const LAMP_OFF_EMISSIVE = 0.02

type CarUserData = {
  bodyMaterial: THREE.MeshStandardMaterial
  headlightMaterials: THREE.MeshStandardMaterial[]
  brakeLightMaterials: THREE.MeshStandardMaterial[]
}

function lampMaterial(colour: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: LAMP_OFF_EMISSIVE,
    roughness: 0.35,
  })
}

function lamp(material: THREE.MeshStandardMaterial, x: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.45), material)
  mesh.position.set(x, 0.55, z)
  return mesh
}

/** Build a car mesh whose local +X is the nose. Caller positions and rotates it. */
export function createCarMesh(car: CarSnapshot): THREE.Group {
  const group = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: car.colour,
    roughness: 0.4,
    metalness: 0.15,
  })
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(BODY_LENGTH, BODY_HEIGHT, BODY_WIDTH),
    bodyMaterial,
  )
  body.position.y = 0.55
  group.add(body)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.55, BODY_WIDTH - 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.2, metalness: 0.3 }),
  )
  cabin.position.set(-0.2, 1.1, 0)
  group.add(cabin)

  const headlightMaterial = lampMaterial(0xfff2c4)
  const brakeLightMaterial = lampMaterial(0xff2a1f)
  const headlights = [
    lamp(headlightMaterial, BODY_LENGTH / 2, 0.6),
    lamp(headlightMaterial, BODY_LENGTH / 2, -0.6),
  ]
  const brakeLights = [
    lamp(brakeLightMaterial, -BODY_LENGTH / 2, 0.6),
    lamp(brakeLightMaterial, -BODY_LENGTH / 2, -0.6),
  ]
  group.add(...headlights, ...brakeLights)

  const data: CarUserData = {
    bodyMaterial,
    headlightMaterials: [headlightMaterial],
    brakeLightMaterials: [brakeLightMaterial],
  }
  group.userData = data

  updateCarMesh(group, car)
  return group
}

/** Sync colour, lamps, position and heading from a snapshot. */
export function updateCarMesh(group: THREE.Group, car: CarSnapshot): void {
  const data = group.userData as CarUserData
  data.bodyMaterial.color.set(car.colour)
  for (const material of data.headlightMaterials) {
    material.emissiveIntensity = car.lamps.headlights ? LAMP_ON_EMISSIVE : LAMP_OFF_EMISSIVE
  }
  for (const material of data.brakeLightMaterials) {
    material.emissiveIntensity = car.lamps.brake_lights ? LAMP_ON_EMISSIVE : LAMP_OFF_EMISSIVE
  }

  group.position.set(car.x, 0, car.y)
  group.rotation.y = -car.yaw
}
