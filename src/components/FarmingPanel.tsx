import { useMemo } from 'react'
import {
  computeFarmingResult,
  buildItemsMap,
  buildGenericsMap,
  needsServingsOverride,
  getItemsPerHour,
  getAvailableRecipeIds,
  getEffectiveRecipeId,
  getDurationMultiplier,
} from '@/utils/farmingCalc'
import { formatLifetime, formatRecipeLabel } from '@/utils/formatters'
import type { Item, Recipe, Modifier, Generic, StatMetadataEntry } from '@/types/consumables'

interface FarmingPanelProps {
  selectedItems: Item[]
  allItems: Item[]
  recipes: Record<string, Recipe>
  modifiers: Record<string, Modifier>
  generics: Generic[]
  statMetadata: Record<string, StatMetadataEntry>
  servingsOverrides: Record<string, number>
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  derivedRecipeOverrides: Record<string, string>
  onSetServings: (itemName: string, value: number) => void
  onSetRecipe: (itemName: string, recipeId: string) => void
  onSetGeneric: (genericId: string, itemName: string) => void
  onSetDerivedRecipe: (ingredientName: string, recipeId: string) => void
}

/**
 * Farming Calculator panel.
 * Shown below the item grid when at least one item is selected in the loadout.
 * Displays crop plot requirements and stockpile needs based on consumption rates.
 */
export function FarmingPanel({
  selectedItems,
  allItems,
  recipes,
  modifiers,
  generics,
  statMetadata,
  servingsOverrides,
  recipeOverrides,
  genericSelections,
  derivedRecipeOverrides,
  onSetServings,
  onSetRecipe,
  onSetGeneric,
  onSetDerivedRecipe,
}: FarmingPanelProps): React.JSX.Element | null {
  const itemsMap = useMemo(() => buildItemsMap(allItems), [allItems])
  const genericsMap = useMemo(() => buildGenericsMap(generics), [generics])

  const loadoutItemsWithModifiers = useMemo(
    () => selectedItems.filter((item) => item.modifiers.length > 0),
    [selectedItems],
  )

  const result = useMemo(
    () =>
      computeFarmingResult({
        loadoutItems: loadoutItemsWithModifiers,
        itemsMap,
        recipes,
        modifiers,
        genericsMap,
        servingsOverrides,
        recipeOverrides,
        genericSelections,
        derivedRecipeOverrides,
        statMetadata,
      }),
    [
      loadoutItemsWithModifiers,
      itemsMap,
      recipes,
      modifiers,
      genericsMap,
      servingsOverrides,
      recipeOverrides,
      genericSelections,
      derivedRecipeOverrides,
      statMetadata,
    ],
  )

  if (selectedItems.length === 0) return null

  const isEmpty = result.cropPlots.length === 0 && result.stockpile.length === 0

  return (
    <section className="border-t border-gray-800 bg-gray-900 px-4 py-4">
      <h2 className="mb-3 text-base font-semibold text-gray-200">Farming Calculator</h2>

      {/* Per-item configuration: only for items with modifiers */}
      <div className="mb-5 flex flex-wrap gap-4">
        {loadoutItemsWithModifiers.map((item) => {
          const needsServings = needsServingsOverride(item, modifiers)
          const availableRecipes = getAvailableRecipeIds(item, itemsMap)
          const activeRecipeId = getEffectiveRecipeId(item, itemsMap, recipeOverrides)
          const durationMultiplier = getDurationMultiplier(
            loadoutItemsWithModifiers,
            modifiers,
            statMetadata,
          )
          const itemsPerHr = getItemsPerHour(
            item,
            modifiers,
            servingsOverrides,
            durationMultiplier,
          )

          // Skip items that need no configuration
          if (!needsServings && availableRecipes.length <= 1) return null

          return (
            <div key={item.name} className="rounded border border-gray-700 bg-gray-900 px-3 py-2">
              <p className="mb-2 text-xs font-medium text-gray-300">{item.display_name}</p>
              <div className="flex flex-wrap items-center gap-3">
                {needsServings ? (
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    Servings/hr
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={servingsOverrides[item.name] ?? 1}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) onSetServings(item.name, v)
                      }}
                      className="w-16 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-right text-gray-200 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                ) : (
                  <span className="text-xs text-gray-500">{itemsPerHr.toFixed(1)}/hr</span>
                )}

                {availableRecipes.length > 1 && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    Recipe
                    <select
                      value={activeRecipeId ?? ''}
                      onChange={(e) => onSetRecipe(item.name, e.target.value)}
                      className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
                    >
                      {availableRecipes.map((rid) => {
                        const r = recipes[rid]
                        return (
                          <option key={rid} value={rid}>
                            {formatRecipeLabel(rid, r)}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Generic ingredient selectors */}
      {result.genericChoices.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {result.genericChoices.map(({ genericId, displayName, options }) => (
            <label key={genericId} className="flex items-center gap-1.5 text-xs text-gray-400">
              {displayName}
              <select
                value={genericSelections[genericId] ?? options[0] ?? ''}
                onChange={(e) => onSetGeneric(genericId, e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
              >
                {options.map((name) => {
                  const item = itemsMap[name]
                  return (
                    <option key={name} value={name}>
                      {item?.display_name ?? name.replace(/_/g, ' ')}
                    </option>
                  )
                })}
              </select>
            </label>
          ))}
        </div>
      )}

      {/* Derived recipe selectors: one per ingredient with multiple recipes (applies to all uses) */}
      {result.derivedRecipeChoices.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {result.derivedRecipeChoices.map((choice) => {
            const activeRecipeId =
              derivedRecipeOverrides[choice.ingredientName] ?? choice.recipeIds[0]
            const isValid = choice.recipeIds.includes(activeRecipeId)
            const value = isValid ? activeRecipeId : choice.recipeIds[0]
            return (
              <label
                key={choice.ingredientName}
                className="flex items-center gap-1.5 text-xs text-gray-400"
                title={`Recipe for ${choice.ingredientDisplayName} (used by all loadout items)`}
              >
                <span className="shrink-0">{choice.ingredientDisplayName}</span>
                <select
                  value={value}
                  onChange={(e) =>
                    onSetDerivedRecipe(choice.ingredientName, e.target.value)
                  }
                  className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
                >
                  {choice.recipeIds.map((rid) => {
                    const r = recipes[rid]
                    return (
                      <option key={rid} value={rid}>
                        {formatRecipeLabel(rid, r)}
                      </option>
                    )
                  })}
                </select>
              </label>
            )
          })}
        </div>
      )}

      {isEmpty ? (
        <p className="text-sm text-gray-600">No crafting recipes found for selected items.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Crop Plots — always first */}
          {result.cropPlots.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Crop Plots
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1 pr-3 font-medium">Crop</th>
                    <th className="pb-1 pr-3 text-right font-medium">Plots</th>
                    <th className="pb-1 pr-3 text-right font-medium">Units/hr</th>
                    <th className="pb-1 text-right font-medium">Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cropPlots.map((entry) => (
                    <tr key={entry.name} className="border-t border-gray-800">
                      <td className="py-1 pr-3 text-gray-200">{entry.display_name}</td>
                      <td className="py-1 pr-3 text-right font-semibold text-blue-300">
                        {entry.plotsNeeded}
                      </td>
                      <td className="py-1 pr-3 text-right text-gray-400">
                        {entry.unitsPerHour.toFixed(1)}
                      </td>
                      <td className="py-1 text-right text-gray-500">
                        {entry.harvestMin}–{entry.harvestMax} / {formatLifetime(entry.growthTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stockpile — always under Crop Plots for more room */}
          {result.stockpile.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stockpile
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1 pr-3 font-medium">Ingredient</th>
                    <th className="pb-1 text-right font-medium">Units/hr</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stockpile.map((entry) => (
                    <tr key={entry.name} className="border-t border-gray-800">
                      <td className="py-1 pr-3 text-gray-200">{entry.display_name}</td>
                      <td className="py-1 text-right text-gray-400">
                        {entry.unitsPerHour.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
