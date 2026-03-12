import { ConsumableCard } from './ConsumableCard'
import { sortItems } from '@/utils/sortItems'
import { getEffectiveTier } from '@/utils/requirements'
import type { Item, Modifier, Recipe, StatMetadataEntry, Generic } from '@/types/consumables'
import type { FilterState } from '@/hooks/useFilterState'

interface ConsumableGridProps {
  items: Item[]
  modifiers: Record<string, Modifier>
  recipes: Record<string, Recipe>
  statMetadata: Record<string, StatMetadataEntry>
  filterState: FilterState
  selectedNames: Set<string>
  blockedModIds: Set<string>
  featureColors: Record<string, string>
  missionColors: Record<string, string>
  onToggleItem: (item: Item) => void
  cardViewMode: 'modifiers' | 'recipe'
  itemsMap: Record<string, Item>
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  genericsMap: Record<string, Generic>
  onSetRecipe: (itemName: string, recipeId: string) => void
  onSetGeneric: (genericId: string, itemName: string) => void
}

/**
 * Renders the responsive card grid of food consumables.
 * Applies tier filtering, sorting, talent dimming, and feature dimming based on filterState.
 * Items currently in the loadout are always shown even if they would be filtered out by tier.
 */
export default function ConsumableGrid({
  items,
  modifiers,
  recipes,
  statMetadata,
  filterState,
  selectedNames,
  blockedModIds,
  featureColors,
  missionColors,
  onToggleItem,
  cardViewMode,
  itemsMap,
  recipeOverrides,
  genericSelections,
  genericsMap,
  onSetRecipe,
  onSetGeneric,
}: ConsumableGridProps): React.JSX.Element {
  const { tier, sortKey, disabledTalents, disabledFeatures, disabledBlueprints, disabledMissions, workshopDisabled } =
    filterState

  const tierFiltered = items.filter((item) => getEffectiveTier(item) <= tier)
  const tierFilteredNames = new Set(tierFiltered.map((item) => item.name))
  const loadoutAdditions = items.filter(
    (item) => selectedNames.has(item.name) && !tierFilteredNames.has(item.name),
  )
  const itemsToShow = [...tierFiltered, ...loadoutAdditions]
  const sorted = sortItems(itemsToShow, sortKey)
  const shownOnlyAsLoadout = new Set(loadoutAdditions.map((item) => item.name))

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
        const filterDimmed =
          (item.requirements?.talent !== undefined &&
            disabledTalents.has(item.requirements.talent)) ||
          (item.requirements?.features?.some((f) => disabledFeatures.has(f)) ?? false) ||
          (item.requirements?.blueprint !== undefined &&
            disabledBlueprints.has(item.requirements.blueprint)) ||
          (item.requirements?.mission !== undefined &&
            disabledMissions.has(String(item.requirements.mission))) ||
          (item.requirements?.workshop !== undefined && workshopDisabled)
        const dimmed = filterDimmed || shownOnlyAsLoadout.has(item.name)
        return (
          <ConsumableCard
            key={item.name}
            item={item}
            modifiers={modifiers}
            recipes={recipes}
            statMetadata={statMetadata}
            dimmed={dimmed}
            selectionDisabled={filterDimmed}
            selected={selectedNames.has(item.name)}
            conflicted={
              !selectedNames.has(item.name) &&
              item.modifiers.some((mid) => blockedModIds.has(mid))
            }
            onClick={() => onToggleItem(item)}
            viewMode={cardViewMode}
            isInLoadout={selectedNames.has(item.name)}
            itemsMap={itemsMap}
            recipeOverrides={recipeOverrides}
            genericSelections={genericSelections}
            genericsMap={genericsMap}
            featureColors={featureColors}
            missionColors={missionColors}
            onSetRecipe={onSetRecipe}
            onSetGeneric={onSetGeneric}
          />
        )
      })}
    </div>
  )
}
