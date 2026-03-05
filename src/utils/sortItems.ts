import type { Item, StatMetadataEntry } from '@/types/consumables'
import type { SortOption } from '@/types/ui'
import { BASE_STAT_DISPLAY_ORDER, MODIFIER_SORT_CATEGORIES } from '@/constants/categories'
import { formatBaseStatLabel } from '@/utils/formatters'

/**
 * Sort key prefix for base_stat sorts (e.g. "base:BaseFoodRecovery_+").
 */
const PREFIX_BASE = 'base:'

/**
 * Sort key prefix for modifier category sorts (e.g. "modcat:Health").
 */
const PREFIX_MODCAT = 'modcat:'

/**
 * Builds the ordered list of sort options for the dropdown, derived from the loaded data.
 * Order: Tier, then base stat keys (in display order), then modifier categories.
 * Base stat labels use stats.display_name. Modifier category options only appear when
 * at least one food item has a non-zero modifier_stats value for that category.
 */
export function buildSortOptions(
  items: Item[],
  statMetadata: Record<string, StatMetadataEntry>,
): SortOption[] {
  const presentBaseStats = BASE_STAT_DISPLAY_ORDER.filter((k) =>
    items.some((item) => Object.prototype.hasOwnProperty.call(item.base_stats, k)),
  )

  const presentModCats = MODIFIER_SORT_CATEGORIES.filter((cat) =>
    items.some((item) => (item.modifier_stats[cat] ?? 0) > 0),
  )

  return [
    { key: 'tier', label: 'Tier' },
    ...presentBaseStats.map((k) => ({
      key: `${PREFIX_BASE}${k}`,
      label: formatBaseStatLabel(statMetadata[k]?.display_name ?? k),
    })),
    ...presentModCats.map((cat) => ({ key: `${PREFIX_MODCAT}${cat}`, label: `${cat} Buffs` })),
  ]
}

/**
 * Sorts a copy of the items array according to the given sort key.
 *
 * - "tier": descending by tier.total
 * - "base:<key>": descending by base_stats[key]; items without the stat sort last
 * - "modcat:<category>": descending by modifier_stats[category] score;
 *   items without the stat sort last; secondary sort is tier.total descending
 *
 * The original array is not mutated.
 */
export function sortItems(items: Item[], sortKey: string): Item[] {
  return [...items].sort((a, b) => {
    if (sortKey === 'tier') {
      return b.tier.total - a.tier.total
    }

    if (sortKey.startsWith(PREFIX_BASE)) {
      const statKey = sortKey.slice(PREFIX_BASE.length)
      const aVal = a.base_stats[statKey] ?? -1
      const bVal = b.base_stats[statKey] ?? -1
      if (bVal !== aVal) return bVal - aVal
      return b.tier.total - a.tier.total
    }

    if (sortKey.startsWith(PREFIX_MODCAT)) {
      const category = sortKey.slice(PREFIX_MODCAT.length)
      const aVal = a.modifier_stats[category] ?? -1
      const bVal = b.modifier_stats[category] ?? -1
      if (bVal !== aVal) return bVal - aVal
      return b.tier.total - a.tier.total
    }

    return 0
  })
}
