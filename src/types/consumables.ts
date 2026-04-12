/**
 * Type definitions for data.json (new generalized format).
 * See new-data-format/minified-readme.md for the full schema.
 */

/** Value in the top-level requirements registry: display name string or object with display_name. */
export type RequirementRegistryValue = string | { display_name: string };

export interface ConsumablesData {
  metadata?: Metadata;
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  generics: Record<string, Generic>;
  modifiers: Record<string, Modifier>;
  stats: Record<string, StatMetadataEntry>;
  features?: Record<string, string>;
  /** Mapping of category ID to display name for modifier_stats. */
  stat_categories?: Record<string, string>;
  /** Requirement ID -> display name (string or { display_name }). Used for talent, blueprint, mission, etc. */
  requirements?: Record<string, RequirementRegistryValue>;
}

export interface Metadata {
  parser_version: string;
  client_version: string;
  /** URL to SteamDB patchnotes for this build. Optional for backward compatibility. */
  patchnotes_url?: string;
  /** Integer week number from version title. Optional. */
  latest_week?: string;
  /** Date both versions were successfully synchronized (YYYY-MM-DD). */
  last_sync_date: string;
  /** Date the minified file was finalized. */
  generated_date: string;
}

/** Item category values derived from IC.Category.* tags. */
export type ItemCategory =
  | 'Animal Parts'
  | 'Drink'
  | 'Food'
  | 'Ingredient'
  | 'Miscellaneous'
  | 'Plant'
  | 'Resources';

export type DisplayOpType = 'multiply' | 'division' | 'addition' | 'subtraction';

export interface DisplayOperation {
  operation: DisplayOpType;
  value: number;
}

export interface Item {
  id: string;
  display_name: string;
  description?: string;
  /** Derived from tags IC.Category.* during processing. */
  category?: ItemCategory;
  /** Total tier as string, e.g. "1.1". Anchor info is now missing. */
  tier: string;
  tags: string[];
  base_stats: Record<string, number>;
  /** Map of Modifier ID -> Duration in seconds. */
  modifiers: Record<string, number>;
  modifier_stats: Record<string, number>;
  recipes: string[];
  source_ids?: Record<string, string>;
  source_item?: string;
  /** Shifted to tags IC.Required.* for some items. */
  requirements?: Requirements;
  /** Derived from tags Traits.* or Item.* during processing. */
  growth_data?: { growth_time: number; harvest_min: number; harvest_max: number };
  /** (NEW) List of math operations to apply to quantity for display. */
  display_operations?: DisplayOperation[];
  /** (NEW) Unit for quantity display. e.g. "L". */
  unit?: string;
}

/**
 * Unlock prerequisites shared by items and recipes.
 * Keys like talent, blueprint, and workshop are internal IDs that resolve
 * via the top-level requirements registry to human-readable display names.
 * NOTE: Most of these are missing in the new data.json except FeatureLevel.
 */
export interface Requirements {
  talent?: string;
  blueprint?: string;
  workshop?: string;
  mission?: string;
  tier?: number;
  features?: string[];
  character?: number;
  /** Backend-only; not used by UI. */
  session?: unknown;
}

export interface Recipe {
  id: string;
  /** Optional localized name for the recipe (e.g. to distinguish alternates that share a bench). */
  display_name?: string;
  inputs: RecipeInput[];
  /** @deprecated No longer used in new format. */
  alternate_inputs?: RecipeInput[] | RecipeInput[][];
  outputs: RecipeOutput[];
  benches: string[];
  /** NOTE: Missing in new data.json. */
  requirements?: Requirements;
}

export interface RecipeInput {
  id: string;
  count: number;
  /** Resolved dynamically by UI. */
  display_name?: string;
  is_generic: boolean;
}

export interface RecipeOutput {
  id: string;
  count: number;
  /** Resolved dynamically by UI. */
  display_name?: string;
  recipe_produces?: { id: string; count: number };
  /** Backend internal item ID; optional, not used by UI. */
  yields_item?: string | null;
  yields_min?: number;
  yields_max?: number;
}

/** Not used directly as a top-level array anymore, but kept for type compatibility if needed. */
export interface Generic {
  id: string;
  display_name: string;
  is_leaf?: boolean;
  items: string[];
}

export interface Modifier {
  id: string;
  display_name: string;
  /** @deprecated Now moved to Item.modifiers object. */
  lifetime?: number;
  stats: Record<string, number>;
  affectors?: {
    lifetime?: string[];
    effectiveness?: string[];
  };
}

export interface StatMetadataEntry {
  display_name: string;
  unit?: string;
  category: string;
  /** (NEW) List of math operations to apply to stat value for display. */
  display_operations?: DisplayOperation[];
}
