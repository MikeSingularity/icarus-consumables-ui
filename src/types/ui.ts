/**
 * A single option in the sort dropdown.
 */
export interface SortOption {
  /** Opaque sort key string used by sortItems(). */
  key: string
  /** Human-readable label shown in the dropdown. */
  label: string
}
