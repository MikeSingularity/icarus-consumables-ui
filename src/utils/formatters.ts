import { BUFF_ABBREVIATIONS } from '@/constants/buffAbbreviations';
import type { StatMetadataEntry, DisplayOperation, Item } from '@/types/consumables';

/**
 * Returns an abbreviated label for long buff/stat names when available.
 * Used for modifier display_name and stat_metadata display_name in the UI.
 */
export function formatBuffLabel(label: string): string {
  return BUFF_ABBREVIATIONS[label] ?? label;
}

/**
 * Formats a modifier lifetime in seconds into a human-readable duration string.
 * Returns "Instant" for lifetime === 0 (defensive case; not expected for food items).
 */
export function formatLifetime(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded === 0) return 'Instant';
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (remainingSeconds === 0) return `${minutes} min`;
  return `${minutes} min ${remainingSeconds}s`;
}

/**
 * Returns the display label for a modifier effect stat key.
 * Uses stats.display_name when available; otherwise derives a label from the key name
 * by stripping the operator suffix (_+, _%, _+%, _?) then the "Base"/"Granted" prefix,
 * and splitting CamelCase into words.
 */
export function formatEffectKey(
  statKey: string,
  statMetadata: Record<string, StatMetadataEntry>
): string {
  const meta = statMetadata[statKey];
  if (meta) return formatBuffLabel(meta.display_name);

  let key = statKey.replace(/_[+%?]*$/, ''); // strip suffix e.g. _+, _%, _+%, _?
  if (key.startsWith('Base')) key = key.slice(4);
  if (key.startsWith('Granted')) key = key.slice(7);
  // Split CamelCase into words
  return key.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Applies a sequence of math operations to a value.
 */
export function applyDisplayOperations(value: number, ops?: DisplayOperation[]): number {
  if (!ops || ops.length === 0) return value;
  return ops.reduce((acc, op) => {
    switch (op.operation) {
      case 'multiply':
        return acc * op.value;
      case 'division':
        return acc / op.value;
      case 'addition':
        return acc + op.value;
      case 'subtraction':
        return acc - op.value;
      default:
        return acc;
    }
  }, value);
}

/**
 * Formats a modifier effect value for display.
 * Keys ending in "%" are treated as percentage values (20 → "+20%").
 * All other keys are treated as absolute values (75 → "+75").
 * A leading "+" is prepended for non-negative values.
 * Supports custom display operations from metadata.
 */
export function formatEffectValue(
  statKey: string,
  value: number,
  displayOperations?: DisplayOperation[],
  unit?: string
): string {
  const adjustedValue = applyDisplayOperations(value, displayOperations);
  const prefix = adjustedValue >= 0 ? '+' : '';

  // If unit is explicitly provided, use it.
  // If not, and statKey ends with %, use %.
  const finalUnit = unit ?? (statKey.endsWith('%') ? '%' : '');

  if (finalUnit === '%') {
    return `${prefix}${Math.round(adjustedValue)}%`;
  }

  // Strip trailing zeros from fractional results via Number()
  const formatted = adjustedValue % 1 !== 0 ? Number(adjustedValue) : adjustedValue;
  return `${prefix}${formatted}${finalUnit && finalUnit !== '%' ? finalUnit : finalUnit}`;
}

/**
 * Formats an item quantity count for display, applying display operations and units.
 */
export function formatQuantity(count: number, item?: Item): string {
  const adjustedCount = applyDisplayOperations(count, item?.display_operations);
  const unit = item?.unit ?? '';
  const formatted = adjustedCount % 1 !== 0 ? Number(adjustedCount) : adjustedCount;
  return `${formatted}${unit}`;
}

/**
 * Converts an underscore-separated talent key into a human-readable label.
 * Example: "Glass_Jar_Jam" → "Glass Jar Jam"
 */
export function formatTalentLabel(talentKey: string): string {
  return talentKey.replace(/_/g, ' ');
}

/**
 * Returns a display label for a recipe. Uses recipe.display_name when present
 * (e.g. from data); otherwise humanizes the recipe id (e.g. "Crispy_Bacon_Butter" → "Crispy Bacon Butter").
 */
export function formatRecipeLabel(
  recipeId: string,
  recipe?: { display_name?: string; benches?: string[] } | null
): string {
  if (recipe?.display_name) return recipe.display_name;
  return recipeId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns a short label for a base stat display name.
 * Maps technical keys (BaseFoodRecovery_+, etc.) to friendly names and
 * strips " when Consumed" suffixes.
 */
export function formatBaseStatLabel(displayName: string): string {
  if (displayName.includes('FoodRecovery')) return 'Food';
  if (displayName.includes('WaterRecovery')) return 'Water';
  if (displayName.includes('HealthRecover')) return 'Health';
  if (displayName.includes('OxygenRecovery')) return 'Oxygen';

  const whenIdx = displayName.indexOf(' when ');
  return whenIdx !== -1 ? displayName.slice(0, whenIdx) : displayName;
}
