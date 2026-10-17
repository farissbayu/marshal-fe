import { describe, expect, it } from 'vitest'
import {
  addCar,
  addDecision,
  colourToRgb,
  createInitialState,
  firstFreeSimSlot,
  pointToSlot,
  rgbToColourName,
  setSlot,
  slotToPoint,
  yardCells,
  yardSlotIds,
} from '../state'

const car = {
  vin: 'VIN-1',
  colour: 'blue',
  expectedColour: 'blue',
  stage: 'to_gate' as const,
  location: 'line_end',
  decisions: [],
}

describe('state', () => {
  it('builds an 8x10 yard with rows A-H', () => {
    const slots = yardSlotIds()
    expect(slots).toHaveLength(80)
    expect(slots[0]).toBe('A1')
    expect(slots.at(-1)).toBe('H10')
    expect(Object.values(createInitialState().layout).every((vin) => vin === null)).toBe(true)
  })

  it('maps row A columns 1-8 to the sim yard points', () => {
    expect(slotToPoint('A7')).toBe('yard.Y7')
    expect(slotToPoint('A9')).toBeUndefined()
    expect(slotToPoint('B1')).toBeUndefined()
    expect(pointToSlot('yard.Y3')).toBe('A3')
    expect(pointToSlot('yard.entry')).toBeUndefined()
  })

  it('round-trips colour names through RGB', () => {
    for (const name of ['blue', 'red', 'white']) {
      expect(rgbToColourName(colourToRgb(name))).toBe(name)
    }
  })

  it('derives KPIs from cars and the feed without mutating the input', () => {
    const empty = createInitialState()
    const withCar = addCar(empty, car)
    const logged = addDecision(withCar, 'VIN-1', {
      at: 1,
      tag: 'GEMINI',
      text: 'Gate PASS',
      exception: false,
    })
    expect(empty.order).toEqual([])
    expect(withCar.cars['VIN-1'].decisions).toEqual([])
    expect(logged.cars['VIN-1'].decisions).toHaveLength(1)
    expect(logged.feed[0]).toMatchObject({ vin: 'VIN-1', tag: 'GEMINI' })
    expect(logged.kpis).toMatchObject({ offLine: 1, decisions: 1, inYard: 0 })
  })

  it('assigns the first free, unreserved row-A slot and reports cell states', () => {
    let state = setSlot(addCar(createInitialState(), car), 'A1', 'VIN-0')
    state = { ...state, reserved: ['A2'] }
    expect(firstFreeSimSlot(state)).toBe('A3')
    state = addCar(state, { ...car, vin: 'VIN-2', stage: 'to_slot', slot: 'A3' })
    expect(firstFreeSimSlot(state)).toBe('A4')
    const cells = yardCells(state)
    expect(cells.A1).toBe('parked')
    expect(cells.A3).toBe('res')
    expect(cells.A4).toBe('empty')
  })
})
