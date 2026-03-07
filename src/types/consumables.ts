/**
 * Type definitions for icarus_consumables.min.json.
 * See docs/minified_item_readme.md for the full schema.
 */

export interface ConsumablesData {
  metadata: Metadata
  items: Item[]
  recipes: Record<string, Recipe>
  generics: Generic[]
  modifiers: Record<string, Modifier>
  stats: Record<string, StatMetadataEntry>
  features?: Record<string, string>
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
  talent_requirement?: string
  required_features?: string[]
  traits?: ItemTraits
  growth_data?: { growth_time: number; harvest_min: number; harvest_max: number }
}

/**
 * Item traits (boolean flags) from the minified data.
 * See docs/minified_item_readme.md § Item Traits.
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
  is_orbital?: boolean
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
  requirements: RecipeRequirements
}

export interface RecipeRequirements {
  talent?: string
  character?: number
  required_features?: string[]
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
  yields_min?: number
  yields_max?: number
}

export interface Generic {
  id: string
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
