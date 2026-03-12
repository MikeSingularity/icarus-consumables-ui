import { useState } from 'react'
import { FilterModal } from './FilterModal'
import type { SortOption } from '@/types/ui'

interface FilterBarProps {
  tier: number
  onTierChange: (tier: number) => void
  sortKey: string
  onSortChange: (key: string) => void
  sortOptions: SortOption[]
  talents: string[]
  features: string[]
  blueprints: string[]
  missions: string[]
  requirementsRegistry: Record<string, string>
  featureNames: Record<string, string>
  featureColors: Record<string, string>
  missionColors: Record<string, string>
  disabledTalents: Set<string>
  disabledFeatures: Set<string>
  disabledBlueprints: Set<string>
  disabledMissions: Set<string>
  /** When true, items with any workshop requirement are dimmed. */
  workshopDisabled: boolean
  /** True if any item has a workshop requirement. */
  hasWorkshopItems: boolean
  /** True if any item has a mission requirement. */
  hasMissionItems: boolean
  onToggleTalent: (talent: string) => void
  onToggleFeature: (feature: string) => void
  onToggleBlueprint: (blueprint: string) => void
  onToggleMission: (mission: string) => void
  onToggleWorkshop: () => void
  onEnableAllRequirements: () => void
  cardViewMode: 'modifiers' | 'recipe'
  onCardViewModeChange: (mode: 'modifiers' | 'recipe') => void
}

/**
 * Filter and sort controls rendered above the consumables grid.
 * Contains the tier slider, sort dropdown, and a single Filter button that opens
 * the combined requirements modal (talents, DLC, blueprints).
 */
export function FilterBar({
  tier,
  onTierChange,
  sortKey,
  onSortChange,
  sortOptions,
  talents,
  features,
  blueprints,
  missions,
  requirementsRegistry,
  featureNames,
  featureColors,
  missionColors,
  disabledTalents,
  disabledFeatures,
  disabledBlueprints,
  disabledMissions,
  workshopDisabled,
  hasWorkshopItems,
  hasMissionItems,
  onToggleTalent,
  onToggleFeature,
  onToggleBlueprint,
  onToggleMission,
  onToggleWorkshop,
  onEnableAllRequirements,
  cardViewMode,
  onCardViewModeChange,
}: FilterBarProps): React.JSX.Element {
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  const disabledCount =
    disabledTalents.size +
    disabledFeatures.size +
    disabledBlueprints.size +
    disabledMissions.size +
    (workshopDisabled ? 1 : 0)
  const showFilterButton =
    talents.length > 0 ||
    features.length > 0 ||
    blueprints.length > 0 ||
    hasWorkshopItems ||
    hasMissionItems

  return (
    <>
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
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

          {/* Card view: Modifiers | Recipe */}
          <div className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800 p-0.5">
            <button
              type="button"
              onClick={() => onCardViewModeChange('modifiers')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                cardViewMode === 'modifiers'
                  ? 'bg-gray-600 text-gray-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Modifiers
            </button>
            <button
              type="button"
              onClick={() => onCardViewModeChange('recipe')}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                cardViewMode === 'recipe'
                  ? 'bg-gray-600 text-gray-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Recipe
            </button>
          </div>

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

          {/* Single Filter button (talents + DLC + blueprints + workshop) */}
          {showFilterButton && (
            <button
              onClick={() => setFilterModalOpen(true)}
              className="rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:border-gray-500 hover:text-gray-100"
            >
              Filter
              {disabledCount > 0 && (
                <span className="ml-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">
                  {disabledCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {filterModalOpen && (
        <FilterModal
          talents={talents}
          features={features}
          blueprints={blueprints}
          missions={missions}
          hasWorkshopItems={hasWorkshopItems}
          requirementsRegistry={requirementsRegistry}
          featureNames={featureNames}
          featureColors={featureColors}
          missionColors={missionColors}
          disabledTalents={disabledTalents}
          disabledFeatures={disabledFeatures}
          disabledBlueprints={disabledBlueprints}
          disabledMissions={disabledMissions}
          workshopDisabled={workshopDisabled}
          onToggleTalent={onToggleTalent}
          onToggleFeature={onToggleFeature}
          onToggleBlueprint={onToggleBlueprint}
          onToggleMission={onToggleMission}
          onToggleWorkshop={onToggleWorkshop}
          onEnableAllRequirements={onEnableAllRequirements}
          onClose={() => setFilterModalOpen(false)}
        />
      )}
    </>
  )
}
