/**
 * stat_metadata category names used for binary modifier-effect grouping in the sort dropdown.
 *
 * Excluded categories:
 * - "Other"  — primarily BaseFoodStomachSlots; present on nearly every item, not useful for sorting.
 * - "Flags"  — internal markers, not player-facing stats.
 */
export const MODIFIER_SORT_CATEGORIES = [
  'Health',
  'Stamina',
  'Combat',
  'Movement',
  'Utility',
  'Taming',
] as const

/**
 * Display order and labels for base_stat keys on item cards.
 * These keys are not present in stat_metadata and are displayed as-is.
 */
export const BASE_STAT_DISPLAY_ORDER: readonly string[] = ['Food', 'Water', 'Health', 'Oxygen']

/**
 * localStorage keys used to persist filter state across sessions.
 */
export const LS_KEYS = {
  TIER: 'icarus:tier',
  SORT: 'icarus:sort',
  DISABLED_TALENTS: 'icarus:disabledTalents',
  DISABLED_FEATURES: 'icarus:disabledFeatures',
} as const
