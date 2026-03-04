import type { Item, Modifier, StatMetadataEntry } from '@/types/consumables'
import type { SortOption } from '@/types/ui'
import { BASE_STAT_DISPLAY_ORDER, MODIFIER_SORT_CATEGORIES } from '@/constants/categories'

/**
 * Sort key prefix for base_stat sorts (e.g. "base:Food").
 */
const PREFIX_BASE = 'base:'

/**
 * Sort key prefix for modifier category binary-grouping sorts (e.g. "modcat:Health").
 */
const PREFIX_MODCAT = 'modcat:'

/**
 * Returns true if the item has at least one modifier whose effects include a stat key
 * that belongs to the given stat_metadata category.
 */
export function itemHasModifierCategory(
  item: Item,
  category: string,
  modifiers: Record<string, Modifier>,
  statMetadata: Record<string, StatMetadataEntry>,
): boolean {
  return item.modifiers.some((mid) => {
    const mod = modifiers[mid]
    if (!mod) return false
    return Object.keys(mod.effects).some((k) => {
      const meta = statMetadata[k]
      return meta !== undefined && meta.categories.includes(category)
    })
  })
}

/**
 * Builds the ordered list of sort options for the dropdown, derived from the loaded data.
 * Order: Tier, then base stat keys (in display order), then modifier categories.
 */
export function buildSortOptions(
  items: Item[],
  modifiers: Record<string, Modifier>,
  statMetadata: Record<string, StatMetadataEntry>,
): SortOption[] {
  const presentBaseStats = BASE_STAT_DISPLAY_ORDER.filter((k) =>
    items.some((item) => Object.prototype.hasOwnProperty.call(item.base_stats, k)),
  )

  const presentModCats = MODIFIER_SORT_CATEGORIES.filter((cat) =>
    items.some((item) => itemHasModifierCategory(item, cat, modifiers, statMetadata)),
  )

  return [
    { key: 'tier', label: 'Tier' },
    ...presentBaseStats.map((k) => ({ key: `${PREFIX_BASE}${k}`, label: k })),
    ...presentModCats.map((cat) => ({ key: `${PREFIX_MODCAT}${cat}`, label: `${cat} Buffs` })),
  ]
}

/**
 * Sorts a copy of the items array according to the given sort key.
 *
 * - "tier": descending by tier.total
 * - "base:<key>": descending by base_stats[key]; items without the stat sort last
 * - "modcat:<category>": binary grouping — items with any modifier effect in that
 *   stat_metadata category appear first; secondary sort is tier.total descending
 *
 * The original array is not mutated.
 */
export function sortItems(
  items: Item[],
  sortKey: string,
  modifiers: Record<string, Modifier>,
  statMetadata: Record<string, StatMetadataEntry>,
): Item[] {
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
      const aHas = itemHasModifierCategory(a, category, modifiers, statMetadata) ? 1 : 0
      const bHas = itemHasModifierCategory(b, category, modifiers, statMetadata) ? 1 : 0
      if (bHas !== aHas) return bHas - aHas
      return b.tier.total - a.tier.total
    }

    return 0
  })
}
