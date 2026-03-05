import { ConsumableCard } from './ConsumableCard'
import { sortItems } from '@/utils/sortItems'
import type { Item, Modifier, Recipe, StatMetadataEntry } from '@/types/consumables'
import type { FilterState } from '@/hooks/useFilterState'

interface ConsumableGridProps {
  items: Item[]
  modifiers: Record<string, Modifier>
  recipes: Record<string, Recipe>
  statMetadata: Record<string, StatMetadataEntry>
  filterState: FilterState
  selectedNames: Set<string>
  blockedModIds: Set<string>
  onToggleItem: (item: Item) => void
}

/**
 * Renders the responsive card grid of food consumables.
 * Applies tier filtering, sorting, talent dimming, and feature dimming based on filterState.
 */
export function ConsumableGrid({
  items,
  modifiers,
  recipes,
  statMetadata,
  filterState,
  selectedNames,
  blockedModIds,
  onToggleItem,
}: ConsumableGridProps): React.JSX.Element {
  const { tier, sortKey, disabledTalents, disabledFeatures } = filterState

  const tierFiltered = items.filter((item) => item.tier.total <= tier)
  const sorted = sortItems(tierFiltered, sortKey)

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <p className="text-sm text-gray-500">No items match your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((item) => {
        const dimmed =
          (item.talent_requirement !== undefined &&
            disabledTalents.has(item.talent_requirement)) ||
          (item.required_features?.some((f) => disabledFeatures.has(f)) ?? false)
        return (
          <ConsumableCard
            key={item.name}
            item={item}
            modifiers={modifiers}
            recipes={recipes}
            statMetadata={statMetadata}
            dimmed={dimmed}
            selected={selectedNames.has(item.name)}
            conflicted={
              !selectedNames.has(item.name) &&
              item.modifiers.some((mid) => blockedModIds.has(mid))
            }
            onClick={() => onToggleItem(item)}
          />
        )
      })}
    </div>
  )
}
