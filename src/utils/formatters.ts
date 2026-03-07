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
 * Uses stats.display_name when available; otherwise derives a label from the key name
 * by stripping the operator suffix (_+, _%, _+%, _?) then the "Base"/"Granted" prefix,
 * and splitting CamelCase into words.
 */
export function formatEffectKey(
  statKey: string,
  statMetadata: Record<string, StatMetadataEntry>,
): string {
  const meta = statMetadata[statKey]
  if (meta) return meta.display_name

  let key = statKey.replace(/_[+%?]*$/, '') // strip suffix e.g. _+, _%, _+%, _?
  if (key.startsWith('Base')) key = key.slice(4)
  if (key.startsWith('Granted')) key = key.slice(7)
  // Split CamelCase into words
  return key.replace(/([A-Z])/g, ' $1').trim()
}

/**
 * Formats a modifier effect value for display.
 * Keys ending in "%" are treated as percentage values (20 → "+20%").
 * All other keys are treated as absolute values (75 → "+75").
 * A leading "+" is prepended for non-negative values.
 */
export function formatEffectValue(statKey: string, value: number): string {
  const prefix = value >= 0 ? '+' : ''
  if (statKey.endsWith('%')) {
    return `${prefix}${Math.round(value)}%`
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

/**
 * Returns a display label for a recipe. Uses recipe.display_name when present
 * (e.g. from data); otherwise humanizes the recipe id (e.g. "Crispy_Bacon_Butter" → "Crispy Bacon Butter").
 * Most alternate recipes share the same bench, so the id-based label is more useful than the bench name.
 */
export function formatRecipeLabel(
  recipeId: string,
  recipe?: { display_name?: string } | null,
): string {
  if (recipe?.display_name) return recipe.display_name
  return recipeId.replace(/_/g, ' ')
}

/**
 * Returns a short label for a base stat display name by stripping the " when ..." suffix.
 * Example: "Food when Consumed" → "Food", "Health when Consumed" → "Health".
 * Falls back to the full display_name if no such suffix is present.
 */
export function formatBaseStatLabel(displayName: string): string {
  const whenIdx = displayName.indexOf(' when ')
  return whenIdx !== -1 ? displayName.slice(0, whenIdx) : displayName
}
