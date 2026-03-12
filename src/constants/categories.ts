/**
 * modifier_stats category names shown as sort options.
 * Only categories with ≥10 food items carrying that category are included;
 * "Consumption" is always excluded (present on nearly every food item, not useful for sorting).
 * Sort uses item.modifier_stats[category] descending.
 */
export const MODIFIER_SORT_CATEGORIES = [
  'Health',
  'Stamina',
  'Experience',
  'Weather',
  'Mining',
  'Melee Weapon',
  'Ranged Weapon',
] as const

/**
 * Display order for base_stat keys on item cards and in the sort dropdown.
 * Keys must match the exact stat key names used in item.base_stats.
 */
export const BASE_STAT_DISPLAY_ORDER: readonly string[] = [
  'BaseFoodRecovery_+',
  'BaseWaterRecovery_+',
  'BaseHealthRecovery_+',
  'BaseOxygenRecovery_+',
]

/**
 * localStorage keys used to persist filter state across sessions.
 */
export const LS_KEYS = {
  TIER: 'icarus:tier',
  SORT: 'icarus:sort',
  DISABLED_TALENTS: 'icarus:disabledTalents',
  DISABLED_FEATURES: 'icarus:disabledFeatures',
  DISABLED_BLUEPRINTS: 'icarus:disabledBlueprints',
  DISABLED_MISSIONS: 'icarus:disabledMissions',
  WORKSHOP_DISABLED: 'icarus:workshopDisabled',
  SLOTS: 'icarus:slots',
} as const
