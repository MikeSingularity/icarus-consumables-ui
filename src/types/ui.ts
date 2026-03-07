/**
 * A single option in the sort dropdown.
 */
export interface SortOption {
  /** Opaque sort key string used by sortItems(). */
  key: string
  /** Human-readable label shown in the dropdown. */
  label: string
}

/**
 * A farmable crop ingredient with plot calculation results.
 */
export interface CropPlotEntry {
  name: string
  display_name: string
  /** Total units needed per hour across all loadout items. */
  unitsPerHour: number
  /** Number of crop plots required to meet demand. */
  plotsNeeded: number
  growthTime: number
  harvestMin: number
  harvestMax: number
}

/**
 * A non-farmable leaf ingredient (meat, fish, foraged items, etc.).
 */
export interface StockpileEntry {
  name: string
  display_name: string
  /** Total units needed per hour across all loadout items. */
  unitsPerHour: number
}

/**
 * A generic ingredient input that requires player selection.
 */
export interface GenericChoice {
  /** The generic tag ID (e.g. "Any_Vegetable"). */
  genericId: string
  /** Display name derived from the tag (e.g. "Any Vegetable"). */
  displayName: string
  /** Item names that satisfy this generic. */
  options: string[]
}

/**
 * A derived ingredient (used in loadout recipe trees) that has multiple recipes.
 * One dropdown per ingredient: the player picks one recipe that applies to all uses.
 */
export interface DerivedRecipeChoice {
  /** Ingredient item name (resolved after generic selection when the input is generic). */
  ingredientName: string
  /** Human-readable name for the ingredient. */
  ingredientDisplayName: string
  /** Recipe IDs that produce this ingredient (player picks one per ingredient). */
  recipeIds: string[]
}

/**
 * Full output of the farming calculator for the current loadout.
 */
export interface FarmingResult {
  cropPlots: CropPlotEntry[]
  stockpile: StockpileEntry[]
  /** Generic inputs encountered during resolution that need a player selection. */
  genericChoices: GenericChoice[]
  /** Derived ingredients with multiple recipes, for per-context recipe dropdowns. */
  derivedRecipeChoices: DerivedRecipeChoice[]
}
