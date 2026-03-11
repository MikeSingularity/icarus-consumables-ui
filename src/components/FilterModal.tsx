import { PackageOpen, Satellite } from 'lucide-react'
import { formatTalentLabel } from '@/utils/formatters'
import { dlcColour } from '@/utils/dlcbadge'

interface FilterModalProps {
  /** All unique talent requirement IDs derived from food items. */
  talents: string[]
  /** All unique feature IDs (DLC) derived from items. */
  features: string[]
  /** All unique blueprint requirement IDs derived from items. */
  blueprints: string[]
  /** Whether any item has a workshop requirement (e.g. Orbital Workshop). */
  hasWorkshopItems: boolean
  /** Requirement ID -> display name; used for human-readable labels. */
  requirementsRegistry: Record<string, string>
  /** Feature ID -> display name. */
  featureNames: Record<string, string>
  /** Set of talent IDs currently disabled (items requiring these are dimmed). */
  disabledTalents: Set<string>
  /** Set of feature IDs currently disabled. */
  disabledFeatures: Set<string>
  /** Set of blueprint IDs currently disabled. */
  disabledBlueprints: Set<string>
  /** When true, items with any workshop requirement are dimmed. */
  workshopDisabled: boolean
  onToggleTalent: (talent: string) => void
  onToggleFeature: (feature: string) => void
  onToggleBlueprint: (blueprint: string) => void
  onToggleWorkshop: () => void
  /** Enables all talents, features, blueprints, and workshop. */
  onEnableAllRequirements: () => void
  onClose: () => void
}

/**
 * Modal for configuring requirement filters: talents, DLC (features), blueprints, and Orbital Workshop.
 * Deselecting a requirement dims items that depend on it. One "Enable All" clears all.
 */
export function FilterModal({
  talents,
  features,
  blueprints,
  hasWorkshopItems,
  requirementsRegistry,
  featureNames,
  disabledTalents,
  disabledFeatures,
  disabledBlueprints,
  workshopDisabled,
  onToggleTalent,
  onToggleFeature,
  onToggleBlueprint,
  onToggleWorkshop,
  onEnableAllRequirements,
  onClose,
}: FilterModalProps): React.JSX.Element {
  const hasAny =
    talents.length > 0 || features.length > 0 || blueprints.length > 0 || hasWorkshopItems

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-gray-100">Filter</h2>
          <button
            className="text-xs text-gray-400 hover:text-gray-100"
            onClick={onClose}
            aria-label="Close filter"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-gray-400">
            Deselect requirements you have not unlocked. Items requiring those will be dimmed.
          </p>
          <button
            className="mb-4 text-xs text-blue-400 hover:text-blue-300"
            onClick={onEnableAllRequirements}
          >
            Enable All
          </button>

          {!hasAny && (
            <p className="text-xs text-gray-500">
              No talent, DLC, blueprint, or workshop requirements in this data.
            </p>
          )}

          {talents.length > 0 && (
            <section className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Talents</h3>
              <ul className="space-y-2">
                {talents.map((talent) => (
                  <li key={talent} className="flex items-center gap-2">
                    <input
                      id={`filter-talent-${talent}`}
                      type="checkbox"
                      checked={!disabledTalents.has(talent)}
                      onChange={() => onToggleTalent(talent)}
                      className="h-4 w-4 accent-blue-400"
                    />
                    <label
                      htmlFor={`filter-talent-${talent}`}
                      className="cursor-pointer text-sm text-gray-200"
                    >
                      {requirementsRegistry[talent] ?? formatTalentLabel(talent)}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {features.length > 0 && (
            <section className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">DLC</h3>
              <ul className="space-y-2">
                {features.map((id) => {
                  const displayName = featureNames[id] ?? id
                  return (
                    <li key={id} className="flex items-center gap-2">
                      <input
                        id={`filter-feature-${id}`}
                        type="checkbox"
                        checked={!disabledFeatures.has(id)}
                        onChange={() => onToggleFeature(id)}
                        className="h-4 w-4 accent-blue-400"
                      />
                      <label
                        htmlFor={`filter-feature-${id}`}
                        className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-gray-200"
                      >
                        {displayName}
                        <PackageOpen
                          size={14}
                          className={`shrink-0 ${dlcColour(id)}`}
                          aria-hidden
                        />
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {blueprints.length > 0 && (
            <section className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Blueprints</h3>
              <ul className="space-y-2">
                {blueprints.map((blueprint) => (
                  <li key={blueprint} className="flex items-center gap-2">
                    <input
                      id={`filter-blueprint-${blueprint}`}
                      type="checkbox"
                      checked={!disabledBlueprints.has(blueprint)}
                      onChange={() => onToggleBlueprint(blueprint)}
                      className="h-4 w-4 accent-blue-400"
                    />
                    <label
                      htmlFor={`filter-blueprint-${blueprint}`}
                      className="cursor-pointer text-sm text-gray-200"
                    >
                      {requirementsRegistry[blueprint] ?? formatTalentLabel(blueprint)}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasWorkshopItems && (
            <section className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Workshop</h3>
              <div className="flex items-center gap-2">
                <input
                  id="filter-workshop"
                  type="checkbox"
                  checked={!workshopDisabled}
                  onChange={onToggleWorkshop}
                  className="h-4 w-4 accent-blue-400"
                />
                <label
                  htmlFor="filter-workshop"
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-200"
                >
                  Orbital Workshop
                  <Satellite size={14} className="shrink-0 text-cyan-400" aria-hidden />
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Uncheck to dim all items that require the Orbital Workshop.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
