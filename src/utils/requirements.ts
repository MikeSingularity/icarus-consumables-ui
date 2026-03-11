import type { Item } from '@/types/consumables'

/**
 * Returns the effective tier for an item: the maximum of the item's base tier
 * and any tier requirement. Used for filtering and display so that e.g. a T2
 * food that requires T3 is treated as T3.
 */
export function getEffectiveTier(item: Item): number {
  const baseTier = Math.floor(item.tier.total)
  const requiredTier = item.requirements?.tier ?? 0
  return Math.max(baseTier, requiredTier)
}
