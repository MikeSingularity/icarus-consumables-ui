import { useMemo } from 'react'
import { useConsumablesData } from '@/hooks/useConsumablesData'
import { useFilterState } from '@/hooks/useFilterState'
import { useLoadoutState } from '@/hooks/useLoadoutState'
import { buildSortOptions } from '@/utils/sortItems'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FilterBar } from '@/components/FilterBar'
import { ConsumableGrid } from '@/components/ConsumableGrid'
import { LoadoutPanel } from '@/components/LoadoutPanel'

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
    () => (data !== null ? data.items.filter((item) => item.category === 'Food') : null),
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
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-100">Icarus Consumables</h1>
      </header>

      <div className="sticky top-0 z-10">
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
        />

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
      </div>

      <ConsumableGrid
        items={items}
        modifiers={data.modifiers}
        recipes={data.recipes}
        statMetadata={data.stats}
        filterState={{ ...filterState, sortKey: validSortKey }}
        selectedNames={selectedNames}
        blockedModIds={blockedModIds}
        onToggleItem={toggleItem}
      />
    </div>
  )
}
