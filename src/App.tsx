import { useEffect, useMemo, useState } from 'react'
import { useConsumablesData } from '@/hooks/useConsumablesData'
import { useFilterState } from '@/hooks/useFilterState'
import { useLoadoutState } from '@/hooks/useLoadoutState'
import { useFarmingState } from '@/hooks/useFarmingState'
import { buildSortOptions } from '@/utils/sortItems'
import { buildItemsMap, buildGenericsMap } from '@/utils/farmingCalc'
import { buildCanonicalSearchString } from '@/utils/urlState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FilterBar } from '@/components/FilterBar'
import { ConsumableGrid } from '@/components/ConsumableGrid'
import { LoadoutPanel } from '@/components/LoadoutPanel'
import { FarmingPanel } from '@/components/FarmingPanel'

/**
 * Root application component.
 * Fetches consumables data, manages filter and loadout state, and composes the page layout.
 */
export default function App(): React.JSX.Element {
  const { data, loading, error } = useConsumablesData()
  const {
    filterState,
    setTier,
    setSortKey,
    toggleTalent,
    enableAllTalents,
    toggleFeature,
    enableAllFeatures,
  } = useFilterState()

  // Memoized so the array reference is stable across re-renders.
  // useLoadoutState depends on this reference to know when to run the URL restore effect —
  // a new reference on every render would cause it to re-run and race with state updates.
  const foodItems = useMemo(
    () =>
      data !== null
        ? data.items.filter(
            (item) => item.traits?.is_inedible !== true && item.modifiers.length > 0,
          )
        : null,
    [data],
  )

  const {
    selectedItems,
    slotCount,
    conflict,
    toggleItem,
    setSlotCount,
    clearLoadout,
    dismissConflict,
  } = useLoadoutState(foodItems)

  const farmingValidationContext = useMemo(() => {
    if (data === null) return null
    return {
      recipeIds: new Set(Object.keys(data.recipes)),
      genericIds: new Set(data.generics.map((g) => g.id)),
      genericIdToItems: buildGenericsMap(data.generics),
    }
  }, [data])

  const {
    servingsOverrides,
    recipeOverrides,
    genericSelections,
    derivedRecipeOverrides,
    setServingsOverride,
    setRecipeOverride,
    setGenericSelection,
    setDerivedRecipeOverride,
  } = useFarmingState(farmingValidationContext)

  useEffect(() => {
    if (data === null) return
    const search = buildCanonicalSearchString({
      itemNames: selectedItems.map((i) => i.name),
      slotCount,
      recipeOverrides,
      genericSelections,
      derivedRecipeOverrides,
      servingsOverrides,
    })
    const url = window.location.pathname + search + window.location.hash
    window.history.replaceState(null, '', url)
  }, [
    data,
    selectedItems,
    slotCount,
    recipeOverrides,
    genericSelections,
    derivedRecipeOverrides,
    servingsOverrides,
  ])

  const [cardViewMode, setCardViewMode] = useState<'modifiers' | 'recipe'>('modifiers')

  const itemsMap = useMemo(() => (data !== null ? buildItemsMap(data.items) : {}), [data])
  const genericsMap = useMemo(() => (data !== null ? buildGenericsMap(data.generics) : {}), [data])

  if (loading) return <LoadingSpinner />

  if (error !== null || data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="max-w-md rounded-lg border border-red-800 bg-gray-900 p-6 text-center">
          <p className="text-sm font-medium text-red-400">Failed to load consumables data</p>
          {error !== null && <p className="mt-1 text-xs text-gray-500">{error}</p>}
        </div>
      </div>
    )
  }

  // foodItems is guaranteed non-null past this point.
  const items = foodItems!

  const talents = [
    ...new Set(
      items.map((item) => item.talent_requirement).filter((t): t is string => t !== undefined),
    ),
  ].sort()

  // Build a display-name dict for DLC features.
  // Prefer the top-level features dict when present; otherwise fall back to raw IDs from items.
  const featureNames: Record<string, string> =
    data.features != null && Object.keys(data.features).length > 0
      ? data.features
      : Object.fromEntries(
          [...new Set(items.flatMap((item) => item.required_features ?? []))].map((f) => [f, f]),
        )

  const sortOptions = buildSortOptions(items, data.stats)

  // Validate persisted sort key against current options; fall back to 'tier' if stale.
  const validSortKey = sortOptions.some((o) => o.key === filterState.sortKey)
    ? filterState.sortKey
    : 'tier'

  const selectedNames = new Set(selectedItems.map((item) => item.name))
  const blockedModIds = new Set(selectedItems.flatMap((item) => item.modifiers))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-100">Icarus Consumables</h1>
      </header>

      <div className="sticky top-[3.25rem] z-10 border-b border-gray-800 bg-gray-900">
        <FilterBar
          tier={filterState.tier}
          onTierChange={setTier}
          sortKey={validSortKey}
          onSortChange={setSortKey}
          sortOptions={sortOptions}
          talents={talents}
          disabledTalents={filterState.disabledTalents}
          onToggleTalent={toggleTalent}
          onEnableAllTalents={enableAllTalents}
          featureNames={featureNames}
          disabledFeatures={filterState.disabledFeatures}
          onToggleFeature={toggleFeature}
          onEnableAllFeatures={enableAllFeatures}
          cardViewMode={cardViewMode}
          onCardViewModeChange={setCardViewMode}
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start">
        <main className="min-w-0 flex-1">
          <ConsumableGrid
            items={items}
            modifiers={data.modifiers}
            recipes={data.recipes}
            statMetadata={data.stats}
            filterState={{ ...filterState, sortKey: validSortKey }}
            selectedNames={selectedNames}
            blockedModIds={blockedModIds}
            onToggleItem={toggleItem}
            cardViewMode={cardViewMode}
            itemsMap={itemsMap}
            recipeOverrides={recipeOverrides}
            genericSelections={genericSelections}
            genericsMap={genericsMap}
            onSetRecipe={setRecipeOverride}
            onSetGeneric={setGenericSelection}
          />
        </main>

        <aside className="w-full border-t border-gray-800 bg-gray-900 lg:sticky lg:top-[6.5rem] lg:max-h-[calc(100vh-6.5rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-96">
          <LoadoutPanel
            selectedItems={selectedItems}
            slotCount={slotCount}
            conflict={conflict}
            modifiers={data.modifiers}
            statMetadata={data.stats}
            onRemoveItem={toggleItem}
            onSetSlotCount={setSlotCount}
            onClear={clearLoadout}
            onDismissConflict={dismissConflict}
          />
          <FarmingPanel
            selectedItems={selectedItems}
            allItems={data.items}
            recipes={data.recipes}
            modifiers={data.modifiers}
            generics={data.generics}
            statMetadata={data.stats}
            servingsOverrides={servingsOverrides}
            recipeOverrides={recipeOverrides}
            genericSelections={genericSelections}
            derivedRecipeOverrides={derivedRecipeOverrides}
            onSetServings={setServingsOverride}
            onSetRecipe={setRecipeOverride}
            onSetGeneric={setGenericSelection}
            onSetDerivedRecipe={setDerivedRecipeOverride}
          />
        </aside>
      </div>
    </div>
  )
}
