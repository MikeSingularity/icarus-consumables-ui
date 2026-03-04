export interface ConsumablesData {
  metadata: Metadata
  items: Item[]
  recipes: Record<string, Recipe>
  generics: Generic[]
  modifiers: Record<string, Modifier>
  stat_metadata: Record<string, StatMetadataEntry>
  features?: Record<string, string>
}

export interface Metadata {
  game_version: string
  build_guid: string
  parser_version: string
  parse_date: string
  generated_date: string
}

export interface Item {
  name: string
  display_name: string
  category: 'Food' | 'Drink' | 'Animal Food' | 'Medicine' | 'Workshop'
  base_stats: Record<string, number>
  tier: { total: number; anchor: string }
  modifiers: string[]
  recipes: string[]
  traits?: {
    is_harvested?: boolean
    is_orbital?: boolean
    is_decay_product?: boolean
    is_override?: boolean
  }
  source_item?: string
  talent_requirement?: string
  required_features?: string[]
  growth_data?: { growth_time: number; harvest_min: number; harvest_max: number }
}

export interface Recipe {
  id: string
  inputs: RecipeInput[]
  alternate_inputs?: RecipeInput[]
  outputs: RecipeOutput[]
  benches: string[]
  requirements: { talent?: string; character?: number; required_features?: string[] }
}

export interface RecipeInput {
  name: string
  count: number
  display_name: string
  is_generic: boolean
}

export interface RecipeOutput {
  name: string
  yields_count: number
  display_name: string
  yields_item?: string
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
  effects: Record<string, number>
}

export interface StatMetadataEntry {
  label: string
  categories: string[]
}
