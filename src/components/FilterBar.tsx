import { useState } from 'react'
import { TalentModal } from './TalentModal'
import { FeatureModal } from './FeatureModal'
import type { SortOption } from '@/types/ui'

interface FilterBarProps {
  tier: number
  onTierChange: (tier: number) => void
  sortKey: string
  onSortChange: (key: string) => void
  sortOptions: SortOption[]
  talents: string[]
  disabledTalents: Set<string>
  onToggleTalent: (talent: string) => void
  onEnableAllTalents: () => void
  featureNames: Record<string, string>
  disabledFeatures: Set<string>
  onToggleFeature: (feature: string) => void
  onEnableAllFeatures: () => void
}

/**
 * Filter and sort controls rendered above the consumables grid.
 * Contains the tier range slider, sort dropdown, talent filter, and feature filter modal triggers.
 */
export function FilterBar({
  tier,
  onTierChange,
  sortKey,
  onSortChange,
  sortOptions,
  talents,
  disabledTalents,
  onToggleTalent,
  onEnableAllTalents,
  featureNames,
  disabledFeatures,
  onToggleFeature,
  onEnableAllFeatures,
}: FilterBarProps): React.JSX.Element {
  const [talentModalOpen, setTalentModalOpen] = useState(false)
  const [featureModalOpen, setFeatureModalOpen] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tier slider */}
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <span className="whitespace-nowrap">Max Tier</span>
            <input
              type="range"
              min={0}
              max={4}
              value={tier}
              onChange={(e) => onTierChange(Number(e.target.value))}
              className="w-28 accent-blue-400"
            />
            <span className="w-4 text-center text-gray-100">{tier}</span>
          </label>

          {/* Sort dropdown */}
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <span>Sort</span>
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Talents button */}
          {talents.length > 0 && (
            <button
              onClick={() => setTalentModalOpen(true)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:border-gray-500 hover:text-gray-100"
            >
              Talents
              {disabledTalents.size > 0 && (
                <span className="ml-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">
                  {disabledTalents.size}
                </span>
              )}
            </button>
          )}

          {/* Features button */}
          {Object.keys(featureNames).length > 0 && (
            <button
              onClick={() => setFeatureModalOpen(true)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:border-gray-500 hover:text-gray-100"
            >
              DLC
              {disabledFeatures.size > 0 && (
                <span className="ml-1.5 rounded bg-amber-600 px-1.5 py-0.5 text-xs text-white">
                  {disabledFeatures.size}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {talentModalOpen && (
        <TalentModal
          talents={talents}
          disabledTalents={disabledTalents}
          onToggle={onToggleTalent}
          onEnableAll={onEnableAllTalents}
          onClose={() => setTalentModalOpen(false)}
        />
      )}

      {featureModalOpen && (
        <FeatureModal
          featureNames={featureNames}
          disabledFeatures={disabledFeatures}
          onToggle={onToggleFeature}
          onEnableAll={onEnableAllFeatures}
          onClose={() => setFeatureModalOpen(false)}
        />
      )}
    </>
  )
}
