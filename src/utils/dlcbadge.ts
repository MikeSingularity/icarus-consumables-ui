/**
 * Distinct Tailwind colour classes for DLC/feature and mission badges.
 * Same palette is used for both; colours are assigned by iterating in order
 * so the first DLC gets the first colour, second gets the second, etc.
 */

export const REQUIREMENT_PALETTE = [
  'text-amber-400',
  'text-rose-400',
  'text-violet-400',
  'text-sky-400',
  'text-lime-400',
  'text-orange-400',
  'text-cyan-400',
  'text-emerald-400',
  'text-fuchsia-400',
  'text-pink-400',
  'text-teal-400',
  'text-indigo-400',
] as const

const DEFAULT_COLOUR = REQUIREMENT_PALETTE[0]

/**
 * Returns a map of id -> Tailwind colour class by iterating through the
 * ordered list: first id gets first colour, second gets second, etc.,
 * wrapping after the palette length. Use for DLC features and missions
 * so each gets a stable, distinct colour.
 */
export function buildOrderedColorMap(orderedIds: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (let i = 0; i < orderedIds.length; i++) {
    map[orderedIds[i]!] = REQUIREMENT_PALETTE[i % REQUIREMENT_PALETTE.length] ?? DEFAULT_COLOUR
  }
  return map
}

/**
 * Returns the colour for an id from a pre-built map, or the default palette colour.
 */
export function getRequirementColour(
  id: string,
  colorMap: Record<string, string>,
): string {
  return colorMap[id] ?? DEFAULT_COLOUR
}
