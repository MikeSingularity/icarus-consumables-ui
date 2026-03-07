import { useEffect, useMemo, useState } from 'react'
import { useConsumablesData } from '@/hooks/useConsumablesData'
import { useFilterState } from '@/hooks/useFilterState'
import { useLoadoutState } from '@/hooks/useLoadoutState'
import { useFarmingState } from '@/hooks/useFarmingState'
import { buildSortOptions } from '@/utils/sortItems'
import { buildItemsMap, buildGenericsMap } from '@/utils/farmingCalc'
import {
  buildCanonicalSearchString,
  filterCanonicalParamsToRelevant,
  type RelevantUrlContext,
} from '@/utils/urlState'
import { computeFarmingResult } from '@/utils/farmingCalc'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FilterBar } from '@/components/FilterBar'
import { ConsumableGrid } from '@/components/ConsumableGrid'
import { LoadoutPanel } from '@/components/LoadoutPanel'
import { FarmingPanel } from '@/components/FarmingPanel'
import { HowToModal } from '@/components/HowToModal'
import { QrCodeModal } from '@/components/QrCodeModal'
import { ISSUES_URL } from '@/constants/appLinks'

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

  const [cardViewMode, setCardViewMode] = useState<'modifiers' | 'recipe'>('modifiers')
  const [howToOpen, setHowToOpen] = useState(false)
  const [qrCodeOpen, setQrCodeOpen] = useState(false)

  const itemsMap = useMemo(() => (data !== null ? buildItemsMap(data.items) : {}), [data])
  const genericsMap = useMemo(() => (data !== null ? buildGenericsMap(data.generics) : {}), [data])

  const loadoutItemsWithModifiers = useMemo(
    () => selectedItems.filter((item) => item.modifiers.length > 0),
    [selectedItems],
  )

  const farmingResultForUrl = useMemo(() => {
    if (data === null) return null
    return computeFarmingResult({
      loadoutItems: loadoutItemsWithModifiers,
      itemsMap,
      recipes: data.recipes,
      modifiers: data.modifiers,
      genericsMap,
      servingsOverrides,
      recipeOverrides,
      genericSelections,
      derivedRecipeOverrides,
      statMetadata: data.stats,
    })
  }, [
    data,
    loadoutItemsWithModifiers,
    itemsMap,
    genericsMap,
    servingsOverrides,
    recipeOverrides,
    genericSelections,
    derivedRecipeOverrides,
  ])

  const relevantUrlContext = useMemo((): RelevantUrlContext => {
    const loadoutItemNames = new Set(selectedItems.map((i) => i.name))
    if (farmingResultForUrl === null) {
      return {
        loadoutItemNames,
        derivedIngredientNames: new Set(),
        genericIds: new Set(),
      }
    }
    return {
      loadoutItemNames,
      derivedIngredientNames: new Set(farmingResultForUrl.derivedRecipeChoices.map((c) => c.ingredientName)),
      genericIds: new Set(farmingResultForUrl.genericChoices.map((g) => g.genericId)),
    }
  }, [selectedItems, farmingResultForUrl])

  useEffect(() => {
    if (data === null) return
    const params = filterCanonicalParamsToRelevant(
      {
        itemNames: selectedItems.map((i) => i.name),
        slotCount,
        recipeOverrides,
        genericSelections,
        derivedRecipeOverrides,
        servingsOverrides,
      },
      relevantUrlContext,
    )
    const search = buildCanonicalSearchString(params)
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
    relevantUrlContext,
  ])

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

  const {
    client_version,
    last_sync_date,
    patchnotes_url,
    latest_week,
    parser_version,
    generated_date,
  } = data.metadata

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-lg font-bold text-gray-100">Icarus Consumables</h1>
            <span className="text-sm text-gray-400">
              Icarus Version{' '}
              {patchnotes_url ? (
                <a
                  href={patchnotes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 underline hover:text-gray-100"
                >
                  {client_version}
                </a>
              ) : (
                client_version
              )}
              {latest_week ? ` (Week ${latest_week})` : ''} · Update Date {last_sync_date}
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-100"
              onClick={() => setHowToOpen(true)}
            >
              How to use
            </button>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-100"
              onClick={() => setQrCodeOpen(true)}
            >
              QR code
            </button>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-100"
            >
              Bug reports
            </a>
          </nav>
        </div>
      </header>
      {howToOpen && <HowToModal onClose={() => setHowToOpen(false)} />}
      {qrCodeOpen && <QrCodeModal onClose={() => setQrCodeOpen(false)} />}

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

      <div className="min-h-0 flex-1 flex flex-col lg:flex-row lg:items-start">
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

        <aside className="w-full min-h-[calc(100vh-6.5rem)] border-t border-gray-800 bg-gray-900 lg:sticky lg:top-[6.5rem] lg:max-h-[calc(100vh-6.5rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-96">
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

      <footer className="mt-auto border-t border-gray-800 bg-gray-900 px-4 py-2 text-center text-xs text-gray-500">
        Parser {parser_version} · Parsed {generated_date}
      </footer>
    </div>
  )
}
