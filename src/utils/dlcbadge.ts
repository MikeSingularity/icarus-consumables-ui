/**
 * Distinct Tailwind colour classes for DLC/feature badges.
 * Same mapping is used on cards and in the DLC filter modal so icons match.
 */

const DLC_COLOURS = [
  'text-amber-400',
  'text-rose-400',
  'text-violet-400',
  'text-lime-400',
  'text-sky-400',
  'text-orange-400',
] as const

/**
 * Returns a stable Tailwind text colour class for a feature ID.
 * Hashing the name gives the same colour on cards and in the feature modal.
 */
export function dlcColour(feature: string): string {
  let hash = 0
  for (let i = 0; i < feature.length; i++) {
    hash = (hash * 31 + feature.charCodeAt(i)) >>> 0
  }
  return DLC_COLOURS[hash % DLC_COLOURS.length] ?? 'text-amber-400'
}
