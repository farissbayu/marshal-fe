// Body colour palette shared by the renderer, the truth capture and the manifest.
// Build-sheet colour names are the source of truth; hex is what the 3D body uses.

export const BUILD_COLOURS = {
  blue: '#2f6fed',
  white: '#f2f2f2',
  grey: '#8a8f98',
  black: '#1c1c1c',
} as const

export type ColourName = keyof typeof BUILD_COLOURS

/** Spawn colour for a `wrong_colour` car: declared blue/white/grey/black, spawned red. */
export const WRONG_COLOUR = { name: 'red', hex: '#e23b2e' } as const

export function colourHex(name: string): string {
  if (name in BUILD_COLOURS) return BUILD_COLOURS[name as ColourName]
  if (name === WRONG_COLOUR.name) return WRONG_COLOUR.hex
  return BUILD_COLOURS.grey
}

export function colourName(hex: string): string {
  const normalized = hex.toLowerCase()
  for (const [name, value] of Object.entries(BUILD_COLOURS)) {
    if (value.toLowerCase() === normalized) return name
  }
  if (WRONG_COLOUR.hex.toLowerCase() === normalized) return WRONG_COLOUR.name
  return 'unknown'
}
