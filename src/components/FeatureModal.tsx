interface FeatureModalProps {
  /** Dict mapping feature IDs to their display names. */
  featureNames: Record<string, string>
  /** Set of feature IDs currently disabled (items requiring these are dimmed). */
  disabledFeatures: Set<string>
  /** Called when a feature checkbox is toggled. */
  onToggle: (feature: string) => void
  /** Called when the "Enable All" button is clicked. */
  onEnableAll: () => void
  /** Called when the modal should be closed. */
  onClose: () => void
}

/**
 * Modal dialog for configuring the DLC feature filter.
 * All features are enabled by default; deselecting a feature dims items that require it.
 */
export function FeatureModal({
  featureNames,
  disabledFeatures,
  onToggle,
  onEnableAll,
  onClose,
}: FeatureModalProps): React.JSX.Element {
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
          <h2 className="text-sm font-semibold text-gray-100">DLC Features</h2>
          <button
            className="text-xs text-gray-400 hover:text-gray-100"
            onClick={onClose}
            aria-label="Close feature filter"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-gray-400">
            Deselect DLC packs you have not purchased. Items from those packs will be dimmed.
          </p>
          <button
            className="mb-3 text-xs text-blue-400 hover:text-blue-300"
            onClick={onEnableAll}
          >
            Enable All
          </button>
          <ul className="space-y-2">
            {Object.entries(featureNames).map(([id, displayName]) => (
              <li key={id} className="flex items-center gap-2">
                <input
                  id={`feature-${id}`}
                  type="checkbox"
                  checked={!disabledFeatures.has(id)}
                  onChange={() => onToggle(id)}
                  className="h-4 w-4 accent-blue-400"
                />
                <label
                  htmlFor={`feature-${id}`}
                  className="cursor-pointer text-sm text-gray-200"
                >
                  {displayName}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
