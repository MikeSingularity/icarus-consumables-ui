import type { Item, Recipe, Modifier, Generic, StatMetadataEntry } from '@/types/consumables'
import type {
  CropPlotEntry,
  StockpileEntry,
  FarmingResult,
  GenericChoice,
  DerivedRecipeChoice,
} from '@/types/ui'

/** Display name used in stats metadata for the Food Effects Duration buff. */
const FOOD_EFFECTS_DURATION_LABEL = 'Food Effects Duration'

/**
 * Returns the stat key whose display_name is "Food Effects Duration", or undefined.
 */
function getFoodEffectsDurationStatKey(
  statMetadata: Record<string, StatMetadataEntry>,
): string | undefined {
  for (const [key, meta] of Object.entries(statMetadata)) {
    if (meta.display_name === FOOD_EFFECTS_DURATION_LABEL) return key
  }
  return undefined
}

/**
 * Sums the "Food Effects Duration" bonus from each loadout item (each food contributes once).
 * Used so e.g. three foods each +10% give 30% total, not 10% from a single unique modifier.
 */
function sumFoodEffectsDurationBonus(
  loadoutItems: Item[],
  modifiers: Record<string, Modifier>,
  durationKey: string | undefined,
): number {
  if (durationKey === undefined) return 0
  let total = 0
  for (const item of loadoutItems) {
    if (item.modifiers.length === 0) continue
    const mod = modifiers[item.modifiers[0]]
    if (mod !== undefined) total += mod.stats[durationKey] ?? 0
  }
  return total
}

/**
 * Returns the duration multiplier (>= 1) for the loadout from "Food Effects Duration" bonus.
 * Each loadout item contributes its modifier's duration value (e.g. three foods each +10% → 30%).
 * That total applies once to every food: e.g. 10 min base × 1.3 = 13 min each.
 */
export function getDurationMultiplier(
  loadoutItems: Item[],
  modifiers: Record<string, Modifier>,
  statMetadata: Record<string, StatMetadataEntry>,
): number {
  const durationKey = getFoodEffectsDurationStatKey(statMetadata)
  const bonusPct = sumFoodEffectsDurationBonus(loadoutItems, modifiers, durationKey)
  return 1 + bonusPct / 100
}

/**
 * Parameters for computeFarmingResult.
 */
export interface FarmingParams {
  /** The items currently selected in the loadout. */
  loadoutItems: Item[]
  /** Full item name→Item lookup (all categories, not just Food). */
  itemsMap: Record<string, Item>
  /** Full recipes dict from data. */
  recipes: Record<string, Recipe>
  /** Full modifiers dict from data. */
  modifiers: Record<string, Modifier>
  /** Generic tag ID → Generic object. */
  genericsMap: Record<string, Generic>
  /**
   * Player-configured servings/hour for items with no timed modifier.
   * Falls back to 1 for items not present in this map.
   */
  servingsOverrides: Record<string, number>
  /**
   * Player-chosen recipe ID per loadout item (item.name → recipe ID).
   * Falls back to the item's (or source item's) first recipe.
   */
  recipeOverrides: Record<string, string>
  /**
   * Player-chosen specific item per generic ingredient (genericId → item name).
   * Falls back to the first option when not set.
   */
  genericSelections: Record<string, string>
  /**
   * Player-chosen recipe ID per ingredient name for derived ingredients (one choice per ingredient).
   * Key: ingredientName. Falls back to the ingredient's first recipe when not set.
   */
  derivedRecipeOverrides?: Record<string, string>
  /**
   * Optional stat metadata to resolve "Food Effects Duration" and extend buff lifetimes.
   */
  statMetadata?: Record<string, StatMetadataEntry>
}


/**
 * Converts the generics array (from data.generics) into a lookup dict
 * keyed by generic tag ID.
 */
export function buildGenericsMap(generics: Generic[]): Record<string, Generic> {
  return Object.fromEntries(generics.map((g) => [g.id, g]))
}

/**
 * Converts the items array into a name→Item lookup for O(1) access.
 */
export function buildItemsMap(items: Item[]): Record<string, Item> {
  return Object.fromEntries(items.map((item) => [item.name, item]))
}

/**
 * Returns true when the item's consumption rate cannot be derived from modifier lifetime
 * and must be supplied by the player as servings/hour.
 *
 * This applies when:
 * - The item has no modifiers, OR
 * - Its first modifier has lifetime === 0 (instant/permanent effect)
 */
export function needsServingsOverride(item: Item, modifiers: Record<string, Modifier>): boolean {
  const mod = item.modifiers.length > 0 ? modifiers[item.modifiers[0]] : undefined
  return mod === undefined || mod.lifetime === 0
}

/**
 * Returns the items-per-hour consumption rate for a loadout item.
 *
 * - Timed modifier (lifetime > 0): 3600 / effectiveLifetime, where effectiveLifetime
 *   is base lifetime multiplied by (1 + foodEffectsDurationBonus%/100) when applicable.
 * - No modifier or instant modifier: servingsOverrides[item.name] ?? 1
 */
export function getItemsPerHour(
  item: Item,
  modifiers: Record<string, Modifier>,
  servingsOverrides: Record<string, number>,
  durationMultiplier: number = 1,
): number {
  const mod = item.modifiers.length > 0 ? modifiers[item.modifiers[0]] : undefined
  if (mod !== undefined && mod.lifetime > 0) {
    const effectiveLifetime = mod.lifetime * durationMultiplier
    return 3600 / effectiveLifetime
  }
  return servingsOverrides[item.name] ?? 1
}

/**
 * Returns the number of units of itemName produced by a single craft of recipe.
 * Defaults to 1 if no matching output is found.
 */
export function getRecipeYieldCount(itemName: string, recipe: Recipe): number {
  for (const output of recipe.outputs) {
    if (output.name === itemName) {
      return Math.max(1, output.yields_count)
    }
  }
  return 1
}

/**
 * Resolves the recipe ID to use for a loadout item, respecting player overrides.
 *
 * Pieces (items with source_item set) carry their own recipes whose outputs reference
 * the source_item name rather than the piece name. The piece's own recipes are always
 * preferred; the parent item's recipes are used only as a fallback when the piece has
 * none of its own.
 *
 * Returns undefined if no recipe is available.
 */
export function getEffectiveRecipeId(
  item: Item,
  itemsMap: Record<string, Item>,
  recipeOverrides: Record<string, string>,
): string | undefined {
  const override = recipeOverrides[item.name]
  if (override !== undefined) return override

  // Prefer the item's own recipes (true for pieces like chocolatecakepiece)
  if (item.recipes.length > 0) return item.recipes[0]

  // Fallback: use the parent item's first recipe when the piece has none
  if (item.source_item !== undefined) {
    return itemsMap[item.source_item]?.recipes[0]
  }

  return undefined
}

/**
 * Returns the available recipe IDs for a loadout item.
 * Prefers the item's own recipes; falls back to the parent item's recipes
 * for source_item pieces that have no recipe of their own.
 */
export function getAvailableRecipeIds(item: Item, itemsMap: Record<string, Item>): string[] {
  if (item.recipes.length > 0) return item.recipes
  if (item.source_item !== undefined) {
    return itemsMap[item.source_item]?.recipes ?? []
  }
  return []
}

// ---- Internal accumulator types ----

interface CropAcc {
  display_name: string
  unitsPerHour: number
  growthTime: number
  harvestMin: number
  harvestMax: number
}

interface StockpileAcc {
  display_name: string
  unitsPerHour: number
}

/**
 * Recursively walks a recipe's inputs, accumulating leaf ingredients.
 * Generic inputs are resolved via genericSelections (or the first valid option).
 * Derived ingredients with multiple recipes use derivedRecipeOverrides when set.
 * Recursion stops at depth 8 to guard against unexpected cycles.
 */
function walkIngredients(
  recipeId: string,
  craftsPerHour: number,
  params: FarmingParams,
  cropAcc: Map<string, CropAcc>,
  stockpileAcc: Map<string, StockpileAcc>,
  collectedGenerics: Map<string, GenericChoice>,
  collectedDerived: Map<string, DerivedRecipeChoice>,
  depth: number,
): void {
  if (depth > 8) return

  const recipe = params.recipes[recipeId]
  if (recipe === undefined) return

  for (const input of recipe.inputs) {
    const unitsPerHour = craftsPerHour * input.count
    let ingredientName = input.name
    let ingredientDisplayName = input.display_name

    if (input.is_generic) {
      const generic = params.genericsMap[input.name]
      const options = generic?.items ?? []
      const selected = params.genericSelections[input.name] ?? options[0]

      // Record this generic for the UI to show a selector, unless it's a leaf
      if (!collectedGenerics.has(input.name) && options.length > 0 && !generic?.is_leaf) {
        collectedGenerics.set(input.name, {
          genericId: input.name,
          displayName: generic?.display_name ?? input.name.replace(/_/g, ' '),
          options,
        })
      }

      // If the generic is marked as a leaf, stop recursion and add to stockpile
      if (generic?.is_leaf) {
        const existing = stockpileAcc.get(input.name)
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour
        } else {
          stockpileAcc.set(input.name, {
            display_name: generic.display_name,
            unitsPerHour,
          })
        }
        continue
      }

      if (selected === undefined) continue
      ingredientName = selected
      const item = params.itemsMap[ingredientName]
      ingredientDisplayName = item?.display_name ?? selected
    }

    const ingredientItem = params.itemsMap[ingredientName]

    // Recurse if this ingredient has a crafting sub-recipe.
    // Skip recursion for harvested items (is_harvested: true) — those are obtained by
    // hunting/gathering and should appear as stockpile leaves rather than be decomposed
    // into their carcass/source inputs.
    const availableRecipeIds = ingredientItem
      ? getAvailableRecipeIds(ingredientItem, params.itemsMap)
      : []
    const overrideRecipeId = params.derivedRecipeOverrides?.[ingredientName]
    const subRecipeId =
      overrideRecipeId !== undefined && availableRecipeIds.includes(overrideRecipeId)
        ? overrideRecipeId
        : availableRecipeIds[0]
    const subRecipe = subRecipeId !== undefined ? params.recipes[subRecipeId] : undefined

    if (subRecipe !== undefined && ingredientItem !== undefined && !ingredientItem.traits?.is_harvested) {
      if (availableRecipeIds.length > 1 && !collectedDerived.has(ingredientName)) {
        collectedDerived.set(ingredientName, {
          ingredientName,
          ingredientDisplayName,
          recipeIds: availableRecipeIds,
        })
      }
      const yieldCount = getRecipeYieldCount(ingredientName, subRecipe)
      walkIngredients(
        subRecipeId,
        unitsPerHour / yieldCount,
        params,
        cropAcc,
        stockpileAcc,
        collectedGenerics,
        collectedDerived,
        depth + 1,
      )
    } else {
      // Leaf ingredient — classify as farmable or stockpile
      if (ingredientItem?.growth_data !== undefined) {
        const { growth_time, harvest_min, harvest_max } = ingredientItem.growth_data
        const existing = cropAcc.get(ingredientName)
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour
        } else {
          cropAcc.set(ingredientName, {
            display_name: ingredientDisplayName,
            unitsPerHour,
            growthTime: growth_time,
            harvestMin: harvest_min,
            harvestMax: harvest_max,
          })
        }
      } else {
        const existing = stockpileAcc.get(ingredientName)
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour
        } else {
          stockpileAcc.set(ingredientName, {
            display_name: ingredientDisplayName,
            unitsPerHour,
          })
        }
      }
    }
  }
}

/**
 * Calculates the number of crop plots needed to meet demand for a crop.
 * Formula: ceil(required_units_per_hour / units_per_plot_per_hour)
 * where units_per_plot_per_hour = avg(harvest_min, harvest_max) / (growth_time / 3600)
 */
function calcPlotsNeeded(acc: CropAcc): number {
  const avgHarvest = (acc.harvestMin + acc.harvestMax) / 2
  const unitsPerPlotPerHour = avgHarvest / (acc.growthTime / 3600)
  if (unitsPerPlotPerHour <= 0) return 0
  return Math.ceil(acc.unitsPerHour / unitsPerPlotPerHour)
}

/**
 * Computes the full farming result for the current loadout and player configuration.
 *
 * Returns:
 * - cropPlots: farmable crop ingredients with plot count calculations
 * - stockpile: non-farmable ingredients with units/hour
 * - genericChoices: generic ingredient inputs needing player selection
 *
 * Items with no recipe are silently skipped (they have no ingredients to resolve).
 */
export function computeFarmingResult(params: FarmingParams): FarmingResult {
  const cropAcc = new Map<string, CropAcc>()
  const stockpileAcc = new Map<string, StockpileAcc>()
  const collectedGenerics = new Map<string, GenericChoice>()
  const collectedDerived = new Map<string, DerivedRecipeChoice>()

  const durationKey = params.statMetadata
    ? getFoodEffectsDurationStatKey(params.statMetadata)
    : undefined
  const durationBonusPct = sumFoodEffectsDurationBonus(
    params.loadoutItems,
    params.modifiers,
    durationKey,
  )
  const durationMultiplier = 1 + durationBonusPct / 100

  for (const item of params.loadoutItems) {
    const recipeId = getEffectiveRecipeId(item, params.itemsMap, params.recipeOverrides)
    if (recipeId === undefined) continue

    const recipe = params.recipes[recipeId]
    if (recipe === undefined) continue

    const itemsPerHour = getItemsPerHour(
      item,
      params.modifiers,
      params.servingsOverrides,
      durationMultiplier,
    )

    // Items may be crafted in batches — scale crafting rate by output yield.
    const yieldCount = getRecipeYieldCount(item.name, recipe)
    const craftsPerHour = itemsPerHour / yieldCount

    walkIngredients(
      recipeId,
      craftsPerHour,
      params,
      cropAcc,
      stockpileAcc,
      collectedGenerics,
      collectedDerived,
      0,
    )
  }

  const cropPlots: CropPlotEntry[] = Array.from(cropAcc.entries())
    .map(([name, acc]) => ({
      name,
      display_name: acc.display_name,
      unitsPerHour: acc.unitsPerHour,
      plotsNeeded: calcPlotsNeeded(acc),
      growthTime: acc.growthTime,
      harvestMin: acc.harvestMin,
      harvestMax: acc.harvestMax,
    }))
    .sort((a, b) => b.plotsNeeded - a.plotsNeeded || a.display_name.localeCompare(b.display_name))

  const stockpile: StockpileEntry[] = Array.from(stockpileAcc.entries())
    .map(([name, acc]) => ({
      name,
      display_name: acc.display_name,
      unitsPerHour: acc.unitsPerHour,
    }))
    .sort((a, b) => b.unitsPerHour - a.unitsPerHour || a.display_name.localeCompare(b.display_name))

  const derivedRecipeChoices = Array.from(collectedDerived.values()).sort((a, b) =>
    a.ingredientDisplayName.localeCompare(b.ingredientDisplayName),
  )

  return {
    cropPlots,
    stockpile,
    genericChoices: Array.from(collectedGenerics.values()),
    derivedRecipeChoices,
  }
}
