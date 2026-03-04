import { formatTalentLabel } from '@/utils/formatters'

interface TalentModalProps {
  /** All unique talent_requirement values derived from food items. */
  talents: string[]
  /** Set of talent keys currently disabled (items requiring these are dimmed). */
  disabledTalents: Set<string>
  /** Called when a talent checkbox is toggled. */
  onToggle: (talent: string) => void
  /** Called when the "Enable All" button is clicked. */
  onEnableAll: () => void
  /** Called when the modal should be closed. */
  onClose: () => void
}

/**
 * Modal dialog for configuring the talent filter.
 * All talents are enabled by default; deselecting a talent dims items that require it.
 * Items with no talent requirement are never dimmed.
 */
export function TalentModal({
  talents,
  disabledTalents,
  onToggle,
  onEnableAll,
  onClose,
}: TalentModalProps): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">Talent Filter</h2>
          <button
            className="text-xs text-gray-400 hover:text-gray-100"
            onClick={onClose}
            aria-label="Close talent filter"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-gray-400">
            Deselect talents you have not unlocked. Items requiring those talents will be dimmed.
          </p>
          <button
            className="mb-3 text-xs text-blue-400 hover:text-blue-300"
            onClick={onEnableAll}
          >
            Enable All
          </button>
          <ul className="space-y-2">
            {talents.map((talent) => (
              <li key={talent} className="flex items-center gap-2">
                <input
                  id={`talent-${talent}`}
                  type="checkbox"
                  checked={!disabledTalents.has(talent)}
                  onChange={() => onToggle(talent)}
                  className="h-4 w-4 accent-blue-400"
                />
                <label
                  htmlFor={`talent-${talent}`}
                  className="cursor-pointer text-sm text-gray-200"
                >
                  {formatTalentLabel(talent)}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
