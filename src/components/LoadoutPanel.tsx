import { aggregateBaseStats, aggregateModifierEffects, collectModifiers } from '@/utils/aggregateStats'
import { formatLifetime, formatEffectKey, formatEffectValue, formatBaseStatLabel } from '@/utils/formatters'
import { BASE_STAT_DISPLAY_ORDER } from '@/constants/categories'
import type { Item, Modifier, StatMetadataEntry } from '@/types/consumables'
import type { ConflictInfo } from '@/hooks/useLoadoutState'

/** Effect key promoted out of the modifier list into the base stats row. */
const PROMOTED_EFFECT_KEY = 'BaseFoodStomachSlots'

interface LoadoutPanelProps {
  selectedItems: Item[]
  slotCount: number
  conflict: ConflictInfo | null
  modifiers: Record<string, Modifier>
  statMetadata: Record<string, StatMetadataEntry>
  onRemoveItem: (item: Item) => void
  onSetSlotCount: (n: number) => void
  onClear: () => void
  onDismissConflict: () => void
}

/**
 * Loadout panel: slot count stepper, selected item pills, conflict notification,
 * and aggregated base stats + modifier effects for the current selection.
 */
export function LoadoutPanel({
  selectedItems,
  slotCount,
  conflict,
  modifiers,
  statMetadata,
  onRemoveItem,
  onSetSlotCount,
  onClear,
  onDismissConflict,
}: LoadoutPanelProps): React.JSX.Element {
  const aggBaseStats = aggregateBaseStats(selectedItems)
  const aggEffects = aggregateModifierEffects(selectedItems, modifiers)
  const activeModifiers = collectModifiers(selectedItems, modifiers)

  const presentBaseKeys = BASE_STAT_DISPLAY_ORDER.filter((k) => k in aggBaseStats)
  const promotedSlots = aggEffects[PROMOTED_EFFECT_KEY]
  const effectEntries = Object.entries(aggEffects).filter(([k]) => k !== PROMOTED_EFFECT_KEY)

  return (
    <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
      {/* Header row */}
      <div className="mb-3 flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-200">Loadout</span>

        {/* Slot count stepper */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSetSlotCount(slotCount - 1)}
            disabled={slotCount <= 1}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-100 disabled:opacity-40"
            aria-label="Decrease slots"
          >
            −
          </button>
          <span className="w-4 text-center text-sm text-gray-300">{slotCount}</span>
          <button
            onClick={() => onSetSlotCount(slotCount + 1)}
            disabled={slotCount >= 5}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-100 disabled:opacity-40"
            aria-label="Increase slots"
          >
            +
          </button>
          <span className="ml-1 text-xs text-gray-500">slots</span>
        </div>

        {selectedItems.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-300">
            Clear
          </button>
        )}
      </div>

      {/* Conflict notification */}
      {conflict !== null && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-800 bg-red-950/50 px-3 py-2">
          <span className="text-xs text-red-300">
            Conflicts with{' '}
            <span className="font-semibold">{conflict.conflictsWith.display_name}</span> — same buff
            active
          </span>
          <button
            onClick={onDismissConflict}
            className="ml-3 shrink-0 text-xs text-red-400 hover:text-red-200"
            aria-label="Dismiss conflict"
          >
            ✕
          </button>
        </div>
      )}

      {/* Item slots */}
      <div className="flex gap-2">
        {Array.from({ length: slotCount }).map((_, i) => {
          const item = selectedItems[i]
          return (
            <div
              key={i}
              className={`flex min-w-0 flex-1 items-center justify-between rounded border px-2 py-1.5 ${
                item !== undefined
                  ? 'border-blue-700 bg-gray-800'
                  : 'border-dashed border-gray-700 bg-gray-800/40'
              }`}
            >
              {item !== undefined ? (
                <>
                  <span className="truncate text-xs text-gray-200">{item.display_name}</span>
                  <button
                    onClick={() => onRemoveItem(item)}
                    className="ml-1 shrink-0 text-gray-500 hover:text-gray-200"
                    aria-label={`Remove ${item.display_name}`}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-600">empty</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Aggregated stats — only shown when at least one item is selected */}
      {selectedItems.length > 0 && (
        <div className="mt-3 flex flex-col gap-y-3">
          {/* Aggregated base stats */}
          {(presentBaseKeys.length > 0 || promotedSlots !== undefined) && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Base Stats
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {presentBaseKeys.map((k) => (
                  <span key={k} className="text-xs text-gray-300">
                    <span className="text-gray-400">{formatBaseStatLabel(statMetadata[k]?.display_name ?? k)}</span>{' '}
                    {aggBaseStats[k]}
                  </span>
                ))}
                {promotedSlots !== undefined && (
                  <span className="text-xs text-gray-300">
                    <span className="text-gray-400">Slots</span> {promotedSlots}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Active modifier buffs + summed effects */}
          {activeModifiers.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Active Buffs
              </p>
              {/* Per-modifier names with lifetimes */}
              <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                {activeModifiers.map((mod) => (
                  <span key={mod.id} className="text-xs text-gray-300">
                    {mod.display_name}
                    <span className="ml-1 text-gray-500">{formatLifetime(mod.lifetime)}</span>
                  </span>
                ))}
              </div>
              {/* Summed effects across all active modifiers */}
              {effectEntries.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {effectEntries.map(([statKey, value]) => (
                    <span key={statKey} className="text-xs">
                      <span className={statKey in statMetadata ? 'text-gray-400' : 'text-yellow-600'}>
                        {formatEffectKey(statKey, statMetadata)}
                      </span>{' '}
                      <span className="text-gray-200">{formatEffectValue(statKey, value)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
