import { useConsumablesData } from '@/hooks/useConsumablesData'
import { useFilterState } from '@/hooks/useFilterState'
import { buildSortOptions } from '@/utils/sortItems'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FilterBar } from '@/components/FilterBar'
import { ConsumableGrid } from '@/components/ConsumableGrid'

/**
 * Root application component.
 * Fetches consumables data, manages filter state, and composes the page layout.
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

  const foodItems = data.items.filter((item) => item.category === 'Food')

  const talents = [
    ...new Set(
      foodItems.map((item) => item.talent_requirement).filter((t): t is string => t !== undefined),
    ),
  ].sort()

  // Build a display-name dict for DLC features.
  // Prefer the top-level features dict when present; otherwise fall back to raw IDs from items.
  const featureNames: Record<string, string> =
    data.features != null && Object.keys(data.features).length > 0
      ? data.features
      : Object.fromEntries(
          [
            ...new Set(
              foodItems.flatMap((item) => item.required_features ?? []),
            ),
          ].map((f) => [f, f]),
        )

  const sortOptions = buildSortOptions(foodItems, data.modifiers, data.stat_metadata)

  // Validate persisted sort key against current options; fall back to 'tier' if stale.
  const validSortKey = sortOptions.some((o) => o.key === filterState.sortKey)
    ? filterState.sortKey
    : 'tier'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-100">Icarus Consumables</h1>
      </header>

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

      <ConsumableGrid
        items={foodItems}
        modifiers={data.modifiers}
        recipes={data.recipes}
        statMetadata={data.stat_metadata}
        filterState={{ ...filterState, sortKey: validSortKey }}
      />
    </div>
  )
}
