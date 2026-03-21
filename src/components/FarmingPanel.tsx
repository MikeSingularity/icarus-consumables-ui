import { useMemo, useState } from 'react'
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

/**
 * A controlled numeric input that manages its own string state internally
 * to allow for a better typing experience (e.g. clearing the field or typing
 * multi-digit numbers without jumping).
 */
function NumericInput({
  value,
  onChange,
  className,
  min,
  max,
  step,
}: {
  value: number
  onChange: (v: number) => void
  className: string
  min?: number
  max?: number
  step?: string
}) {
  const [localValue, setLocalValue] = useState<string>(value.toString())
  const [prevValue, setPrevValue] = useState<number>(value)

  if (value !== prevValue) {
    setPrevValue(value)
    const parsedLocal = parseFloat(localValue)
    if (isNaN(parsedLocal) || parsedLocal !== value) {
      if (!(localValue === '' && value === 0)) {
        setLocalValue(value.toString())
      }
    }
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={localValue}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const val = e.target.value
        setLocalValue(val)
        const v = parseFloat(val)
        if (!isNaN(v)) {
          onChange(v)
        } else {
          // If empty, assume 0 for calculations but keep it empty in text
          onChange(0)
        }
      }}
      className={className}
    />
  )
}

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
  /** Global farming growth speed bonus in percent (e.g. 10 for +10%). */
  farmingGrowthBonusPct: number
  /** Global farming yield bonus in percent (e.g. 10 for +10%). */
  farmingYieldBonusPct: number
  onSetServings: (itemName: string, value: number) => void
  onSetRecipe: (itemName: string, recipeId: string) => void
  onSetGeneric: (genericId: string, itemName: string) => void
  onSetDerivedRecipe: (ingredientName: string, recipeId: string) => void
  onSetFarmingGrowthBonusPct: (bonusPct: number) => void
  onSetFarmingYieldBonusPct: (bonusPct: number) => void
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
  farmingGrowthBonusPct,
  farmingYieldBonusPct,
  onSetServings,
  onSetRecipe,
  onSetGeneric,
  onSetDerivedRecipe,
  onSetFarmingGrowthBonusPct,
  onSetFarmingYieldBonusPct,
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
        farmingGrowthBonusPct,
        farmingYieldBonusPct,
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
      farmingGrowthBonusPct,
      farmingYieldBonusPct,
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
                    <NumericInput
                      min={0.1}
                      step="0.5"
                      value={servingsOverrides[item.name] ?? 1}
                      onChange={(v) => onSetServings(item.name, v)}
                      className="w-16 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-right text-gray-200 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

      {/* Global farming modifiers (affect crop growth speed and yield) */}
      <div className="mb-5 flex flex-col gap-2 text-xs text-gray-400">
        <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
          Growth speed
          <div className="flex items-center gap-1.5">
            <NumericInput
              step="5"
              min={-90}
              max={500}
              value={Math.round(farmingGrowthBonusPct)}
              onChange={(v) => onSetFarmingGrowthBonusPct(v)}
              className="w-16 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-right text-gray-200 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>%</span>
          </div>
        </label>
        <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
          Yield per harvest
          <div className="flex items-center gap-1.5">
            <NumericInput
              step="5"
              min={-90}
              max={500}
              value={Math.round(farmingYieldBonusPct)}
              onChange={(v) => onSetFarmingYieldBonusPct(v)}
              className="w-16 rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-right text-gray-200 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>%</span>
          </div>
        </label>
        <span className="mt-1 text-[11px] text-gray-500">
          These only affect crop plots (growth time, yield, and plots needed), not buff durations.
        </span>
      </div>

      {/* Derived recipe selectors: one per ingredient with multiple recipes (applies to all uses) */}
      {result.derivedRecipeChoices.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Choose Recipe
          </h3>
          {result.derivedRecipeChoices.map((choice) => {
            const activeRecipeId =
              derivedRecipeOverrides[choice.ingredientName] ?? choice.recipeIds[0]
            const isValid = choice.recipeIds.includes(activeRecipeId)
            const value = isValid ? activeRecipeId : choice.recipeIds[0]
            return (
              <label
                key={choice.ingredientName}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-xs text-gray-400"
                title={`Recipe for ${choice.ingredientDisplayName} (used by all loadout items)`}
              >
                <span className="min-w-0 truncate">{choice.ingredientDisplayName}</span>
                <select
                  value={value}
                  onChange={(e) =>
                    onSetDerivedRecipe(choice.ingredientName, e.target.value)
                  }
                  className="w-full min-w-[8rem] rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
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
