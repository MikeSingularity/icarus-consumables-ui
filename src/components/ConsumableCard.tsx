import { Flag, PackageOpen, Satellite } from 'lucide-react'
import {
  formatLifetime,
  formatEffectKey,
  formatEffectValue,
  formatBaseStatLabel,
  formatBuffLabel,
  formatRecipeLabel,
  formatTalentLabel,
} from '@/utils/formatters'
import { getEffectiveRecipeId, getAvailableRecipeIds } from '@/utils/farmingCalc'
import { getEffectiveTier } from '@/utils/requirements'
import { getRequirementColour } from '@/utils/dlcbadge'
import { BASE_STAT_DISPLAY_ORDER } from '@/constants/categories'
import type { Item, Modifier, Recipe, StatMetadataEntry, Generic } from '@/types/consumables'

interface ConsumableCardProps {
  item: Item
  modifiers: Record<string, Modifier>
  recipes: Record<string, Recipe>
  statMetadata: Record<string, StatMetadataEntry>
  /** When true, the card is rendered at reduced opacity (talent not unlocked). */
  dimmed: boolean
  /** When true, the card cannot be selected (filter requirement unchecked); click has no effect. */
  selectionDisabled: boolean
  /** When true, the card is highlighted as part of the active loadout. */
  selected: boolean
  /** When true, the card shares a modifier with a selected item and cannot be added. */
  conflicted: boolean
  /** Called when the card is clicked to add or remove it from the loadout. */
  onClick: () => void
  /** When 'recipe', the card shows recipe inputs and recipe/generic selectors instead of modifiers. */
  viewMode: 'modifiers' | 'recipe'
  /** When true, recipe view shows dropdowns for recipe and generic choices. */
  isInLoadout: boolean
  /** Full items map for resolving effective recipe (pieces, etc.). */
  itemsMap: Record<string, Item>
  /** Loadout item name -> recipe ID override. */
  recipeOverrides: Record<string, string>
  /** Generic id -> selected item name. */
  genericSelections: Record<string, string>
  /** Generic id -> Generic object. */
  genericsMap: Record<string, Generic>
  /** Requirement ID -> display name; used for hover labels on icons. */
  requirementsRegistry: Record<string, string>
  /** Feature ID -> display name; used for DLC hover labels. */
  featureNames: Record<string, string>
  /** Feature ID -> Tailwind colour class (order-based). */
  featureColors: Record<string, string>
  /** Mission ID -> Tailwind colour class (order-based). */
  missionColors: Record<string, string>
  onSetRecipe: (itemName: string, recipeId: string) => void
  onSetGeneric: (genericId: string, itemName: string) => void
}

/**
 * Modifier effect key promoted out of the buff list and shown inline with base stats.
 * Virtually every food item carries this at value 1; hoisting it avoids a repetitive effect row.
 */
const PROMOTED_EFFECT_KEY = 'BaseFoodStomachSlots_+'

/** Colour classes for the tier badge by tier.total value. */
const TIER_COLOURS: Record<number, string> = {
  0: 'bg-slate-700 text-slate-200',
  1: 'bg-amber-600 text-amber-50',
  2: 'bg-emerald-700 text-emerald-100',
  3: 'bg-blue-700 text-blue-100',
  4: 'bg-purple-700 text-purple-100',
}

/**
 * Renders a single food consumable card with tier badge, base stats,
 * timed modifier buffs, and crafting bench label.
 */
export function ConsumableCard({
  item,
  modifiers,
  recipes,
  statMetadata,
  dimmed,
  selectionDisabled,
  selected,
  conflicted,
  onClick,
  viewMode,
  isInLoadout,
  itemsMap,
  recipeOverrides,
  genericSelections,
  genericsMap,
  requirementsRegistry,
  featureNames,
  featureColors,
  missionColors,
  onSetRecipe,
  onSetGeneric,
}: ConsumableCardProps): React.JSX.Element {
  const effectiveTier = getEffectiveTier(item)
  const tierColour = TIER_COLOURS[effectiveTier] ?? 'bg-gray-700 text-gray-200'

  const effectiveRecipeId = getEffectiveRecipeId(item, itemsMap, recipeOverrides)
  const effectiveRecipe = effectiveRecipeId !== undefined ? recipes[effectiveRecipeId] : undefined
  const availableRecipeIds = getAvailableRecipeIds(item, itemsMap)

  const craftingBench = (() => {
    const firstRecipe = effectiveRecipe ?? (item.recipes[0] !== undefined ? recipes[item.recipes[0]] : undefined)
    const bench = firstRecipe?.benches[0]
    if (item.traits?.is_harvested) return bench !== undefined ? `Gathered / ${bench}` : 'Gathered'
    if (bench !== undefined) return bench
    if (item.requirements?.workshop !== undefined) return 'Workshop'
    return 'Unknown'
  })()

  const resolvedModifiers = item.modifiers
    .map((mid) => modifiers[mid])
    .filter((m): m is Modifier => m !== undefined)

  const presentBaseStats = BASE_STAT_DISPLAY_ORDER.filter(
    (k) => Object.prototype.hasOwnProperty.call(item.base_stats, k) && item.base_stats[k] !== 0,
  )

  // Extract the promoted effect value (FoodStomachSlots) from any modifier that carries it.
  const promotedSlots = resolvedModifiers
    .map((m) => m.stats[PROMOTED_EFFECT_KEY])
    .find((v): v is number => v !== undefined)

  const opacityClass = conflicted ? 'opacity-50' : dimmed ? 'opacity-35' : 'opacity-100'
  const borderClass = selected
    ? 'border-blue-500 ring-1 ring-blue-500'
    : 'border-gray-700' + (conflicted || selectionDisabled ? '' : ' hover:border-gray-500')

  const notClickable = conflicted || selectionDisabled

  /** Stop propagation so clicking a select does not toggle the card. */
  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  const missionId = item.requirements?.mission
  const missionLabel =
    missionId !== undefined
      ? requirementsRegistry[String(missionId)] ?? formatTalentLabel(String(missionId))
      : undefined

  const featureIds = item.requirements?.features ?? []
  const featureLabel =
    featureIds.length > 0
      ? featureIds
          .map((id) => featureNames[id] ?? id)
          .join(', ')
      : undefined

  return (
    <div
      role={notClickable ? undefined : 'button'}
      tabIndex={notClickable ? -1 : 0}
      onClick={notClickable ? undefined : onClick}
      onKeyDown={
        notClickable
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
      }
      aria-disabled={notClickable}
      className={`flex select-none flex-col rounded-lg border bg-gray-800 transition-all ${
        notClickable ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${borderClass} ${opacityClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${tierColour}`}>
            T{effectiveTier > Math.floor(item.tier.total) ? effectiveTier : item.tier.total}
          </span>
          <span className="text-sm font-semibold text-gray-100 leading-tight">
            {item.display_name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.requirements?.workshop !== undefined && (
            <span
              className="inline-flex"
              aria-label="Orbital Workshop"
              title="Orbital Workshop"
            >
              <Satellite size={14} className="mt-0.5 text-cyan-400" aria-hidden />
            </span>
          )}
          {missionId !== undefined && missionLabel !== undefined && (
            <span
              className="inline-flex"
              aria-label={missionLabel}
              title={missionLabel}
            >
              <Flag
                size={14}
                className={`mt-0.5 ${getRequirementColour(String(missionId), missionColors)}`}
                aria-hidden
              />
            </span>
          )}
          {featureIds.length > 0 && (
            <span
              className="inline-flex"
              aria-label={featureLabel !== undefined ? `DLC: ${featureLabel}` : 'DLC requirement'}
              title={featureLabel}
            >
              <PackageOpen
                size={14}
                className={`mt-0.5 ${getRequirementColour(featureIds[0]!, featureColors)}`}
                aria-hidden
              />
            </span>
          )}
        </div>
      </div>

      {/* Min-height keeps card from shrinking when switching to modifiers view, preventing scroll jump. */}
      <div className="flex min-h-[10rem] flex-1 flex-col">
        <div className="flex-1">
          {viewMode === 'recipe' ? (
            <>
              {/* Recipe view: recipe selector, inputs. Only selects stop propagation so card click works. */}
              <div className="mt-2 space-y-2 px-3">
                {availableRecipeIds.length > 1 && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-400">
                    Recipe
                    <select
                      value={effectiveRecipeId ?? ''}
                      onChange={(e) => onSetRecipe(item.name, e.target.value)}
                      onClick={stopProp}
                      onMouseDown={stopProp}
                      className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
                    >
                      {availableRecipeIds.map((rid) => (
                        <option key={rid} value={rid}>
                          {formatRecipeLabel(rid, recipes[rid])}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {effectiveRecipe !== undefined ? (
                  <ul className="space-y-1">
                    {effectiveRecipe.inputs.map((input) => {
                      if (input.is_generic) {
                        const generic = genericsMap[input.name]
                        const options = generic?.items ?? []
                        const selectedName = genericSelections[input.name] ?? options[0]
                        const displayValue = selectedName
                          ? itemsMap[selectedName]?.display_name ?? selectedName.replace(/_/g, ' ')
                          : input.display_name
                        return (
                          <li key={input.name} className="flex flex-wrap items-center justify-between gap-1 text-xs">
                            <span className="text-gray-400">
                              {input.display_name} {input.count}
                            </span>
                            {isInLoadout && options.length > 1 && !generic?.is_leaf ? (
                              <select
                                value={selectedName ?? ''}
                                onChange={(e) => onSetGeneric(input.name, e.target.value)}
                                onClick={stopProp}
                                onMouseDown={stopProp}
                                className="max-w-[10rem] truncate rounded border border-gray-600 bg-gray-800 px-1 py-0.5 text-gray-200 focus:border-blue-500 focus:outline-none"
                              >
                                {options.map((name) => (
                                  <option key={name} value={name}>
                                    {itemsMap[name]?.display_name ?? name.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-200">
                                {generic?.is_leaf ? '' : `(${displayValue})`}
                              </span>
                            )}
                          </li>
                        )
                      }
                      return (
                        <li key={input.name} className="flex justify-between text-xs">
                          <span className="text-gray-400">{input.display_name}</span>
                          <span className="text-gray-200">{input.count}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">No recipe</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Base stats + promoted slot count */}
              {(presentBaseStats.length > 0 || promotedSlots !== undefined) && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-3">
                  {presentBaseStats.map((k) => (
                    <span key={k} className="text-xs text-gray-300">
                      <span className="text-gray-400">
                        {formatBaseStatLabel(statMetadata[k]?.display_name ?? k)}
                      </span>{' '}
                      <span className={(item.base_stats[k] ?? 0) < 0 ? 'text-red-400' : ''}>
                        {item.base_stats[k]}
                      </span>
                    </span>
                  ))}
                  {promotedSlots !== undefined && (
                    <span className="text-xs text-gray-300">
                      <span className="text-gray-400">Slots</span> {promotedSlots}
                    </span>
                  )}
                </div>
              )}

              {/* Modifier buffs */}
              {resolvedModifiers.length > 0 && (
                <div className="mt-2 space-y-1.5 px-3">
                  {resolvedModifiers.map((mod) => (
                    <div key={mod.id}>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-medium text-gray-200">{formatBuffLabel(mod.display_name)}</span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatLifetime(mod.lifetime)}
                        </span>
                      </div>
                      <ul className="mt-0.5 space-y-0.5">
                        {Object.entries(mod.stats)
                          .filter(([statKey]) => statKey !== PROMOTED_EFFECT_KEY)
                          .map(([statKey, value]) => (
                            <li key={statKey} className="flex justify-between text-xs">
                              <span
                                className={statKey in statMetadata ? 'text-gray-400' : 'text-yellow-600'}
                              >
                                {formatEffectKey(statKey, statMetadata)}
                              </span>
                              <span className="text-gray-200">{formatEffectValue(statKey, value)}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-auto px-3 pb-2 pt-2">
          <span className="text-xs text-gray-500">{craftingBench}</span>
        </div>
      </div>
    </div>
  )
}
