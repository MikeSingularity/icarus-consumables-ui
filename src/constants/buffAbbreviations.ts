/**
 * Maps long buff/stat display names from the data to shorter labels for the UI.
 * Keys must match the display_name values from modifiers or stat_metadata exactly.
 */
export const BUFF_ABBREVIATIONS: Record<string, string> = {
  'Chance to find additional Stone while Mining': "Add'l Stone while Mining",
  'Experience Gained for Tamed Creatures': 'Exp. Gain for Tames',
  'Chance to Return Melee Physical Damage to Attacker': 'Reflect Melee Damage',
  'Melee Physical Damage Returned': 'Melee Damage Returned',
}
