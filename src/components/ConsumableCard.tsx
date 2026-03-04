import { PackageOpen, Satellite } from 'lucide-react'
import { formatLifetime, formatEffectKey, formatEffectValue } from '@/utils/formatters'
import { BASE_STAT_DISPLAY_ORDER } from '@/constants/categories'
import type { Item, Modifier, Recipe, StatMetadataEntry } from '@/types/consumables'

interface ConsumableCardProps {
  item: Item
  modifiers: Record<string, Modifier>
  recipes: Record<string, Recipe>
  statMetadata: Record<string, StatMetadataEntry>
  /** When true, the card is rendered at reduced opacity (talent not unlocked). */
  dimmed: boolean
}

/**
 * Modifier effect key promoted out of the buff list and shown inline with base stats.
 * Virtually every food item carries this at value 1; hoisting it avoids a repetitive effect row.
 */
const PROMOTED_EFFECT_KEY = 'BaseFoodStomachSlots'

/**
 * Distinct Tailwind colour classes cycled per DLC feature name.
 * Hashing the name string gives a stable colour across renders and data changes.
 */
const DLC_COLOURS = [
  'text-amber-400',
  'text-rose-400',
  'text-violet-400',
  'text-lime-400',
  'text-sky-400',
  'text-orange-400',
] as const

function dlcColour(feature: string): string {
  let hash = 0
  for (let i = 0; i < feature.length; i++) {
    hash = (hash * 31 + feature.charCodeAt(i)) >>> 0
  }
  return DLC_COLOURS[hash % DLC_COLOURS.length] ?? 'text-amber-400'
}

/** Colour classes for the tier badge by tier.total value. */
const TIER_COLOURS: Record<number, string> = {
  1: 'bg-gray-600 text-gray-200',
  2: 'bg-emerald-700 text-emerald-100',
  3: 'bg-blue-700 text-blue-100',
  4: 'bg-purple-700 text-purple-100',
}

/**
 * Renders a single food consumable card with tier badge, base stats,
 * timed modifier buffs, and crafting bench label.
 */
export function ConsumableCard({
  item,
  modifiers,
  recipes,
  statMetadata,
  dimmed,
}: ConsumableCardProps): React.JSX.Element {
  const tierColour = TIER_COLOURS[item.tier.total] ?? 'bg-gray-700 text-gray-200'

  const craftingBench = (() => {
    const firstRecipe = item.recipes[0] !== undefined ? recipes[item.recipes[0]] : undefined
    return firstRecipe?.benches[0] ?? undefined
  })()

  const resolvedModifiers = item.modifiers
    .map((mid) => modifiers[mid])
    .filter((m): m is Modifier => m !== undefined)

  const presentBaseStats = BASE_STAT_DISPLAY_ORDER.filter(
    (k) => Object.prototype.hasOwnProperty.call(item.base_stats, k) && item.base_stats[k] !== 0,
  )

  // Extract the promoted effect value (FoodStomachSlots) from any modifier that carries it.
  const promotedSlots = resolvedModifiers
    .map((m) => m.effects[PROMOTED_EFFECT_KEY])
    .find((v): v is number => v !== undefined)

  return (
    <div
      className={`flex flex-col rounded-lg border border-gray-700 bg-gray-800 transition-opacity ${
        dimmed ? 'opacity-35' : 'opacity-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${tierColour}`}>
            T{item.tier.total}
          </span>
          <span className="text-sm font-semibold text-gray-100 leading-tight">
            {item.display_name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.traits?.is_orbital && (
            <Satellite size={14} className="mt-0.5 text-cyan-400" aria-label="Orbital" />
          )}
          {item.required_features !== undefined && item.required_features.length > 0 && (
            <PackageOpen
              size={14}
              className={`mt-0.5 ${dlcColour(item.required_features[0]!)}`}
              aria-label={`DLC: ${item.required_features.join(', ')}`}
            />
          )}
        </div>
      </div>

      {/* Base stats + promoted slot count */}
      {(presentBaseStats.length > 0 || promotedSlots !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-3">
          {presentBaseStats.map((k) => (
            <span key={k} className="text-xs text-gray-300">
              <span className="text-gray-400">{k}</span>{' '}
              <span className={(item.base_stats[k] ?? 0) < 0 ? 'text-red-400' : ''}>
                {item.base_stats[k]}
              </span>
            </span>
          ))}
          {promotedSlots !== undefined && (
            <span className="text-xs text-gray-300">
              <span className="text-gray-400">Slots</span> {promotedSlots}
            </span>
          )}
        </div>
      )}

      {/* Modifier buffs */}
      {resolvedModifiers.length > 0 && (
        <div className="mt-2 space-y-1.5 px-3">
          {resolvedModifiers.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-medium text-gray-200">{mod.display_name}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatLifetime(mod.lifetime)}
                </span>
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {Object.entries(mod.effects)
                  .filter(([statKey]) => statKey !== PROMOTED_EFFECT_KEY)
                  .map(([statKey, value]) => (
                  <li key={statKey} className="flex justify-between text-xs">
                    <span className={statKey in statMetadata ? 'text-gray-400' : 'text-yellow-600'}>
                      {formatEffectKey(statKey, statMetadata)}
                    </span>
                    <span className="text-gray-200">{formatEffectValue(statKey, value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {craftingBench !== undefined && (
        <div className="mt-auto px-3 pb-2 pt-2">
          <span className="text-xs text-gray-500">{craftingBench}</span>
        </div>
      )}
    </div>
  )
}
