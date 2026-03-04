import type { StatMetadataEntry } from '@/types/consumables'

/**
 * Formats a modifier lifetime in seconds into a human-readable duration string.
 * Returns "Instant" for lifetime === 0 (defensive case; not expected for food items).
 */
export function formatLifetime(seconds: number): string {
  if (seconds === 0) return 'Instant'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) return `${minutes} min`
  return `${minutes} min ${remainingSeconds}s`
}

/**
 * Returns the display label for a modifier effect stat key.
 * Uses stat_metadata.label when available; otherwise derives a label from the key name
 * by stripping the "Base" prefix and splitting CamelCase into words.
 */
export function formatEffectKey(
  statKey: string,
  statMetadata: Record<string, StatMetadataEntry>,
): string {
  const meta = statMetadata[statKey]
  if (meta) return meta.label

  let key = statKey.endsWith('%') ? statKey.slice(0, -1) : statKey
  if (key.startsWith('Base')) key = key.slice(4)
  if (key.startsWith('Granted')) key = key.slice(7)
  // Split CamelCase into words
  return key.replace(/([A-Z])/g, ' $1').trim()
}

/**
 * Formats a modifier effect value for display.
 * Keys ending in "%" are treated as fractional percentages (0.2 → "+20%").
 * All other keys are treated as absolute values (75 → "+75").
 * A leading "+" is prepended for non-negative values.
 */
export function formatEffectValue(statKey: string, value: number): string {
  const prefix = value >= 0 ? '+' : ''
  if (statKey.endsWith('%')) {
    return `${prefix}${Math.round(value * 100)}%`
  }
  return `${prefix}${value}`
}

/**
 * Converts an underscore-separated talent key into a human-readable label.
 * Example: "Glass_Jar_Jam" → "Glass Jar Jam"
 */
export function formatTalentLabel(talentKey: string): string {
  return talentKey.replace(/_/g, ' ')
}
