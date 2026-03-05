import type { Item, Modifier } from '@/types/consumables'

/**
 * Sums base_stats values across all selected items, per stat key.
 */
export function aggregateBaseStats(items: Item[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of items) {
    for (const [key, value] of Object.entries(item.base_stats)) {
      result[key] = (result[key] ?? 0) + value
    }
  }
  return result
}

/**
 * Sums modifier effect values per stat key across all unique modifier IDs
 * attached to the selected items. Each modifier ID is counted at most once,
 * even if multiple items share it (the hard block prevents this in practice).
 */
export function aggregateModifierEffects(
  items: Item[],
  modifiers: Record<string, Modifier>,
): Record<string, number> {
  const seenMods = new Set<string>()
  const result: Record<string, number> = {}
  for (const item of items) {
    for (const mid of item.modifiers) {
      if (seenMods.has(mid)) continue
      seenMods.add(mid)
      const mod = modifiers[mid]
      if (mod === undefined) continue
      for (const [key, value] of Object.entries(mod.stats)) {
        result[key] = (result[key] ?? 0) + value
      }
    }
  }
  return result
}

/**
 * Returns the unique Modifier objects (in encounter order) across all selected items.
 * Used to display per-modifier lifetimes alongside the summed effect totals.
 */
export function collectModifiers(
  items: Item[],
  modifiers: Record<string, Modifier>,
): Modifier[] {
  const seen = new Set<string>()
  const result: Modifier[] = []
  for (const item of items) {
    for (const mid of item.modifiers) {
      if (seen.has(mid)) continue
      seen.add(mid)
      const mod = modifiers[mid]
      if (mod !== undefined) result.push(mod)
    }
  }
  return result
}
