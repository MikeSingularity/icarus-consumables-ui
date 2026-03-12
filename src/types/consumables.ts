/**
 * Type definitions for icarus_consumables.min.json.
 * See docs/minified_README.md for the full schema.
 */

/** Value in the top-level requirements registry: display name string or object with display_name. */
export type RequirementRegistryValue = string | { display_name: string }

export interface ConsumablesData {
  metadata: Metadata
  items: Item[]
  recipes: Record<string, Recipe>
  generics: Generic[]
  modifiers: Record<string, Modifier>
  stats: Record<string, StatMetadataEntry>
  features?: Record<string, string>
  /** Requirement ID -> display name (string or { display_name }). Used for talent, blueprint, mission, etc. */
  requirements?: Record<string, RequirementRegistryValue>
}

export interface Metadata {
  parser_version: string
  client_version: string
  /** URL to SteamDB patchnotes for this build. Optional for backward compatibility. */
  patchnotes_url?: string
  /** Integer week number from version title. Optional. */
  latest_week?: string
  /** Date both versions were successfully synchronized (YYYY-MM-DD). */
  last_sync_date: string
  /** Date the minified file was finalized. */
  generated_date: string
}

/** Item category values from the minified data. */
export type ItemCategory =
  | 'Animal Parts'
  | 'Drink'
  | 'Food'
  | 'Ingredient'
  | 'Miscellaneous'
  | 'Plant'
  | 'Resources'

export interface Item {
  name: string
  display_name: string
  description?: string
  category: ItemCategory
  tier: { total: number; anchor: string }
  base_stats: Record<string, number>
  modifiers: string[]
  modifier_stats: Record<string, number>
  recipes: string[]
  source_ids?: Record<string, string>
  source_item?: string
  requirements?: Requirements
  traits?: ItemTraits
  growth_data?: { growth_time: number; harvest_min: number; harvest_max: number }
}

/**
 * Unlock prerequisites shared by items and recipes.
 * Keys like talent, blueprint, and workshop are internal IDs that resolve
 * via the top-level requirements registry to human-readable display names.
 */
export interface Requirements {
  talent?: string
  blueprint?: string
  workshop?: string
  mission?: string
  tier?: number
  features?: string[]
  character?: number
  /** Backend-only; not used by UI. */
  session?: unknown
}

/**
 * Item traits (boolean flags) from the minified data.
 * See docs/minified_README.md § Item Traits.
 */
export interface ItemTraits {
  is_berry?: boolean
  is_cake?: boolean
  is_cooked?: boolean
  is_cooked_chicken?: boolean
  is_cooked_egg?: boolean
  is_cooked_fish?: boolean
  is_cooked_fruit?: boolean
  is_cooked_fungi?: boolean
  is_cooked_grain?: boolean
  is_cooked_honey?: boolean
  is_cooked_meat?: boolean
  is_cooked_vege?: boolean
  is_corn?: boolean
  is_decay_product?: boolean
  is_fruit?: boolean
  is_grain?: boolean
  is_harvested?: boolean
  is_herb?: boolean
  is_honey?: boolean
  is_inedible?: boolean
  is_ingredient?: boolean
  is_override?: boolean
  is_pumpkin?: boolean
  is_raw?: boolean
  is_raw_prime?: boolean
  is_speciality?: boolean
  is_spoiled?: boolean
  is_squash?: boolean
  is_vegetable?: boolean
  is_watermelon?: boolean
}

export interface Recipe {
  id: string
  /** Optional localized name for the recipe (e.g. to distinguish alternates that share a bench). */
  display_name?: string
  inputs: RecipeInput[]
  /** @deprecated Use multiple recipes with same output (Option B) instead. */
  alternate_inputs?: RecipeInput[] | RecipeInput[][]
  outputs: RecipeOutput[]
  benches: string[]
  requirements: Requirements
}

export interface RecipeInput {
  name: string
  count: number
  display_name: string
  is_generic: boolean
}

export interface RecipeOutput {
  name: string
  display_name: string
  yields_count: number
  recipe_produces?: { name: string; yields_count: number }
  /** Backend internal item ID; optional, not used by UI. */
  yields_item?: string | null
  yields_min?: number
  yields_max?: number
}

export interface Generic {
  id: string
  /** Localized display name for the generic category. */
  display_name: string
  /**
   * If true, the generic is treated as a base ingredient (stockpile leaf).
   * Selection can still happen, but recursion stops and the generic's display_name is used.
   */
  is_leaf?: boolean
  items: string[]
}

export interface Modifier {
  id: string
  display_name: string
  lifetime: number
  stats: Record<string, number>
}

export interface StatMetadataEntry {
  display_name: string
  unit?: string
  categories: string[]
}
