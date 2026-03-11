/**
 * Modal that shows a short "How to use" guide for the Icarus Consumables UI.
 * Matches the style of FilterModal.
 */
interface HowToModalProps {
  /** Called when the modal should be closed. */
  onClose: () => void
}

export function HowToModal({ onClose }: HowToModalProps): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">How to use</h2>
          <button
            className="text-xs text-gray-400 hover:text-gray-100"
            onClick={onClose}
            aria-label="Close how to use"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-4 py-3 text-xs text-gray-300">
          <section>
            <h3 className="mb-1 font-medium text-gray-100">Browse and filter</h3>
            <p>
              Use the tier slider, sort dropdown, Talents, and DLC filters above the grid to narrow
              items. Toggle card view between &quot;Modifiers&quot; (buffs and stats) and
              &quot;Recipe&quot; (ingredients and bench).
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium text-gray-100">Build a loadout</h3>
            <p>
              Click a card to add the item to your loadout (sidebar). You can select up to the slot
              count shown; items that share the same buff cannot be selected together. Click again
              or use the sidebar to remove. Aggregated stats and effects appear in the loadout panel.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium text-gray-100">Farming calculator</h3>
            <p>
              With items in your loadout, the sidebar shows crop plots and stockpile needs per hour.
              Use the Recipe dropdown when an item has multiple recipes; use generic and
              &quot;derived recipe&quot; dropdowns to choose ingredient sources (e.g. sugar from
              honey vs sugarcane). Set servings per hour for items without a timed buff.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium text-gray-100">Share</h3>
            <p>
              The URL updates with your loadout and recipe choices. Copy or bookmark the link to
              share your setup or open it on another device.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
