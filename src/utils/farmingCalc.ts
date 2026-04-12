import type { Item, Recipe, Modifier, Generic, StatMetadataEntry } from '@/types/consumables';
import { isLeafNode } from './tagUtils';
import type {
  CropPlotEntry,
  StockpileEntry,
  FarmingResult,
  GenericChoice,
  DerivedRecipeChoice,
} from '@/types/ui';

/** Display name used in stats metadata for the Food Effects Duration buff. */
const FOOD_EFFECTS_DURATION_LABEL = 'Food Effects Duration';

/**
 * Returns the stat key whose display_name is "Food Effects Duration", or undefined.
 */
function getFoodEffectsDurationStatKey(
  statMetadata: Record<string, StatMetadataEntry>
): string | undefined {
  for (const [key, meta] of Object.entries(statMetadata)) {
    if (meta.display_name === FOOD_EFFECTS_DURATION_LABEL) return key;
  }
  return undefined;
}

/**
 * Sums the "Food Effects Duration" bonus from each loadout item (each food contributes once).
 * Used so e.g. three foods each +10% give 30% total, not 10% from a single unique modifier.
 */
function sumFoodEffectsDurationBonus(
  loadoutItems: Item[],
  modifiers: Record<string, Modifier>,
  durationKey: string | undefined
): number {
  if (durationKey === undefined) return 0;
  let total = 0;
  for (const item of loadoutItems) {
    const modifierIds = Object.keys(item.modifiers);
    if (modifierIds.length === 0) continue;
    const mod = modifiers[modifierIds[0]];
    if (mod !== undefined) total += mod.stats[durationKey] ?? 0;
  }
  return total;
}

/**
 * Returns the duration multiplier (>= 1) for the loadout from "Food Effects Duration" bonus.
 * Each loadout item contributes its modifier's duration value (e.g. three foods each +10% → 30%).
 * That total applies once to every food: e.g. 10 min base × 1.3 = 13 min each.
 */
export function getDurationMultiplier(
  loadoutItems: Item[],
  modifiers: Record<string, Modifier>,
  statMetadata: Record<string, StatMetadataEntry>
): number {
  const durationKey = getFoodEffectsDurationStatKey(statMetadata);
  const bonusPct = sumFoodEffectsDurationBonus(loadoutItems, modifiers, durationKey);
  return 1 + bonusPct / 100;
}

/**
 * Parameters for computeFarmingResult.
 */
export interface FarmingParams {
  /** The items currently selected in the loadout. */
  loadoutItems: Item[];
  /** Full item name→Item lookup (all categories, not just Food). */
  itemsMap: Record<string, Item>;
  /** Full recipes dict from data. */
  recipes: Record<string, Recipe>;
  /** Full modifiers dict from data. */
  modifiers: Record<string, Modifier>;
  /** Generic tag ID → Generic object. */
  genericsMap: Record<string, Generic>;
  /**
   * Player-configured servings/hour for items with no timed modifier.
   * Falls back to 1 for items not present in this map.
   */
  servingsOverrides: Record<string, number>;
  /**
   * Player-chosen recipe ID per loadout item (item.name → recipe ID).
   * Falls back to the item's (or source item's) first recipe.
   */
  recipeOverrides: Record<string, string>;
  /**
   * Player-chosen specific item per generic ingredient (genericId → item name).
   * Falls back to the first option when not set.
   */
  genericSelections: Record<string, string>;
  /**
   * Player-chosen recipe ID per ingredient name for derived ingredients (one choice per ingredient).
   * Key: ingredientName. Falls back to the ingredient's first recipe when not set.
   */
  derivedRecipeOverrides?: Record<string, string>;
  /**
   * Optional stat metadata to resolve "Food Effects Duration" and extend buff lifetimes.
   */
  statMetadata?: Record<string, StatMetadataEntry>;
  /**
   * Optional global farming growth speed bonus (%). For example, 10 means +10% faster growth.
   * Affects crop plot growth time/yield calculations only (does not modify buff duration).
   */
  farmingGrowthBonusPct?: number;
  /**
   * Optional global farming yield bonus (%). For example, 10 means +10% more units per harvest.
   */
  farmingYieldBonusPct?: number;
}

/**
 * Converts the generics array (from data.generics) into a lookup dict
 * keyed by generic tag ID.
 */
export function buildGenericsMap(generics: Generic[]): Record<string, Generic> {
  return Object.fromEntries(generics.map((g) => [g.id, g]));
}

/**
 * @deprecated Items are now provided as a Map (Record<string, Item>) from the data hook.
 */
export function buildItemsMap(items: Item[]): Record<string, Item> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
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
  const modifierIds = Object.keys(item.modifiers);
  const modId = modifierIds[0];
  const mod = modId !== undefined ? modifiers[modId] : undefined;
  const lifetime = modId !== undefined ? item.modifiers[modId] : 0;
  return mod === undefined || lifetime === 0;
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
  durationMultiplier: number = 1
): number {
  const modifierIds = Object.keys(item.modifiers);
  const modId = modifierIds[0];
  const mod = modId !== undefined ? modifiers[modId] : undefined;
  const lifetime = modId !== undefined ? item.modifiers[modId] : 0;
  if (mod !== undefined && lifetime > 0) {
    const effectiveLifetime = lifetime * durationMultiplier;
    return 3600 / effectiveLifetime;
  }
  return servingsOverrides[item.id] ?? 1;
}

/**
 * Returns the number of units of itemName produced by a single craft of recipe.
 * Defaults to 1 if no matching output is found.
 */
export function getRecipeYieldCount(itemName: string, recipe: Recipe): number {
  for (const output of recipe.outputs) {
    if (output.id === itemName) {
      return Math.max(1, output.count);
    }
  }
  return 1;
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
  recipeOverrides: Record<string, string>
): string | undefined {
  const override = recipeOverrides[item.id];
  if (override !== undefined) return override;

  // Prefer the item's own recipes (true for pieces like chocolatecakepiece)
  if (item.recipes.length > 0) return item.recipes[0];

  // Fallback: use the parent item's first recipe when the piece has none
  if (item.source_item !== undefined) {
    return itemsMap[item.source_item]?.recipes[0];
  }

  return undefined;
}

/**
 * Returns the available recipe IDs for a loadout item.
 * Prefers the item's own recipes; falls back to the parent item's recipes
 * for source_item pieces that have no recipe of their own.
 */
export function getAvailableRecipeIds(item: Item, itemsMap: Record<string, Item>): string[] {
  if (item.recipes.length > 0) return item.recipes;
  if (item.source_item !== undefined) {
    return itemsMap[item.source_item]?.recipes ?? [];
  }
  return [];
}

// ---- Internal accumulator types ----

interface CropAcc {
  display_name: string;
  unitsPerHour: number;
  growthTime: number;
  harvestMin: number;
  harvestMax: number;
}

interface StockpileAcc {
  display_name: string;
  unitsPerHour: number;
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
  depth: number
): void {
  if (depth > 8) return;

  const recipe = params.recipes[recipeId];
  if (recipe === undefined) return;

  for (const input of recipe.inputs) {
    const unitsPerHour = craftsPerHour * input.count;
    let ingredientName = input.id;
    let ingredientDisplayName = input.display_name;

    if (input.is_generic) {
      const generic = params.genericsMap[input.id];
      const options = generic?.items ?? [];
      const selected = params.genericSelections[input.id] ?? options[0];

      // Record this generic for the UI to show a selector, unless it's a leaf
      if (!collectedGenerics.has(input.id) && options.length > 0 && !generic?.is_leaf) {
        collectedGenerics.set(input.id, {
          genericId: input.id,
          displayName: generic?.display_name ?? input.id.replace(/_/g, ' '),
          options,
        });
      }

      // If the generic is marked as a leaf, stop recursion and add to stockpile
      if (generic?.is_leaf) {
        const existing = stockpileAcc.get(input.id);
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour;
        } else {
          stockpileAcc.set(input.id, {
            display_name: generic.display_name,
            unitsPerHour,
          });
        }
        continue;
      }

      if (selected === undefined) continue;
      ingredientName = selected as string;
      const item = params.itemsMap[ingredientName];
      ingredientDisplayName = item?.display_name ?? (selected as string).replace(/_/g, ' ');
    }

    const ingredientItem = params.itemsMap[ingredientName];
    if (!ingredientDisplayName && ingredientItem) {
      ingredientDisplayName = ingredientItem.display_name;
    }

    // Recurse if this ingredient has a crafting sub-recipe.
    // Skip recursion for leaf nodes (harvested items or containers).
    const availableRecipeIds = ingredientItem
      ? getAvailableRecipeIds(ingredientItem, params.itemsMap)
      : [];
    const overrideRecipeId = params.derivedRecipeOverrides?.[ingredientName as string];
    const subRecipeId =
      overrideRecipeId !== undefined && availableRecipeIds.includes(overrideRecipeId)
        ? overrideRecipeId
        : availableRecipeIds[0];
    const subRecipe = subRecipeId !== undefined ? params.recipes[subRecipeId] : undefined;

    if (
      subRecipe !== undefined &&
      subRecipeId !== undefined &&
      ingredientName !== undefined &&
      ingredientItem !== undefined &&
      !isLeafNode(ingredientItem)
    ) {
      if (availableRecipeIds.length > 1 && !collectedDerived.has(ingredientName as string)) {
        collectedDerived.set(ingredientName as string, {
          ingredientName: ingredientName as string,
          ingredientDisplayName:
            ingredientDisplayName ?? (ingredientName as string).replace(/_/g, ' '),
          recipeIds: availableRecipeIds,
        });
      }
      const yieldCount = getRecipeYieldCount(ingredientName as string, subRecipe);
      walkIngredients(
        subRecipeId as string,
        unitsPerHour / yieldCount,
        params,
        cropAcc,
        stockpileAcc,
        collectedGenerics,
        collectedDerived,
        depth + 1
      );
    } else if (ingredientName !== undefined) {
      // Leaf ingredient — classify as farmable or stockpile
      if (ingredientItem?.growth_data !== undefined) {
        const { growth_time, harvest_min, harvest_max } = ingredientItem.growth_data;
        const existing = cropAcc.get(ingredientName as string);
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour;
        } else {
          cropAcc.set(ingredientName as string, {
            display_name: ingredientDisplayName ?? (ingredientName as string).replace(/_/g, ' '),
            unitsPerHour,
            growthTime: growth_time,
            harvestMin: harvest_min,
            harvestMax: harvest_max,
          });
        }
      } else {
        const existing = stockpileAcc.get(ingredientName as string);
        if (existing !== undefined) {
          existing.unitsPerHour += unitsPerHour;
        } else {
          stockpileAcc.set(ingredientName as string, {
            display_name: ingredientDisplayName ?? (ingredientName as string).replace(/_/g, ' '),
            unitsPerHour,
          });
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
function calcPlotsNeeded(
  acc: CropAcc,
  growthBonusPct: number = 0,
  yieldBonusPct: number = 0
): number {
  const avgHarvest = (acc.harvestMin + acc.harvestMax) / 2;
  const growthMultiplier = 1 + growthBonusPct / 100;
  const yieldMultiplier = 1 + yieldBonusPct / 100;
  const effectiveAvgHarvest = avgHarvest * yieldMultiplier;
  const effectiveGrowthTime = acc.growthTime / growthMultiplier;
  const unitsPerPlotPerHour = effectiveAvgHarvest / (effectiveGrowthTime / 3600);
  if (unitsPerPlotPerHour <= 0) return 0;
  return Math.ceil(acc.unitsPerHour / unitsPerPlotPerHour);
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
  const cropAcc = new Map<string, CropAcc>();
  const stockpileAcc = new Map<string, StockpileAcc>();
  const collectedGenerics = new Map<string, GenericChoice>();
  const collectedDerived = new Map<string, DerivedRecipeChoice>();

  const durationKey = params.statMetadata
    ? getFoodEffectsDurationStatKey(params.statMetadata)
    : undefined;
  const durationBonusPctFromBuffs = sumFoodEffectsDurationBonus(
    params.loadoutItems,
    params.modifiers,
    durationKey
  );
  const farmingGrowthBonusPct = params.farmingGrowthBonusPct ?? 0;
  const farmingYieldBonusPct = params.farmingYieldBonusPct ?? 0;

  // Duration multiplier comes only from Food Effects Duration buffs.
  const durationMultiplier = 1 + durationBonusPctFromBuffs / 100;

  for (const item of params.loadoutItems) {
    const recipeId = getEffectiveRecipeId(item, params.itemsMap, params.recipeOverrides);
    if (recipeId === undefined) {
      // Support raw farmable items with no recipe
      if (item.growth_data !== undefined) {
        const itemsPerHour = getItemsPerHour(
          item,
          params.modifiers,
          params.servingsOverrides,
          durationMultiplier
        );
        const existing = cropAcc.get(item.id);
        if (existing !== undefined) {
          existing.unitsPerHour += itemsPerHour;
        } else {
          cropAcc.set(item.id, {
            display_name: item.display_name,
            unitsPerHour: itemsPerHour,
            growthTime: item.growth_data.growth_time,
            harvestMin: item.growth_data.harvest_min,
            harvestMax: item.growth_data.harvest_max,
          });
        }
      }
      continue;
    }

    const recipe = params.recipes[recipeId];
    if (recipe === undefined) continue;

    const itemsPerHour = getItemsPerHour(
      item,
      params.modifiers,
      params.servingsOverrides,
      durationMultiplier
    );

    // Items may be crafted in batches — scale crafting rate by output yield.
    const yieldCount = getRecipeYieldCount(item.id, recipe);
    const craftsPerHour = itemsPerHour / yieldCount;

    walkIngredients(
      recipeId,
      craftsPerHour,
      params,
      cropAcc,
      stockpileAcc,
      collectedGenerics,
      collectedDerived,
      0
    );
  }

  const cropPlots: CropPlotEntry[] = Array.from(cropAcc.entries())
    .map(([id, acc]) => ({
      id,
      display_name: acc.display_name,
      unitsPerHour: acc.unitsPerHour,
      plotsNeeded: calcPlotsNeeded(acc, farmingGrowthBonusPct, farmingYieldBonusPct),
      growthTime: acc.growthTime / (1 + farmingGrowthBonusPct / 100),
      harvestMin: acc.harvestMin * (1 + farmingYieldBonusPct / 100),
      harvestMax: acc.harvestMax * (1 + farmingYieldBonusPct / 100),
    }))
    .sort((a, b) => b.plotsNeeded - a.plotsNeeded || a.display_name.localeCompare(b.display_name));

  const stockpile: StockpileEntry[] = Array.from(stockpileAcc.entries())
    .map(([id, acc]) => ({
      id,
      display_name: acc.display_name,
      unitsPerHour: acc.unitsPerHour,
    }))
    .sort(
      (a, b) => b.unitsPerHour - a.unitsPerHour || a.display_name.localeCompare(b.display_name)
    );

  const derivedRecipeChoices = Array.from(collectedDerived.values()).sort((a, b) =>
    a.ingredientDisplayName.localeCompare(b.ingredientDisplayName)
  );

  return {
    cropPlots,
    stockpile,
    genericChoices: Array.from(collectedGenerics.values()),
    derivedRecipeChoices,
  };
}
