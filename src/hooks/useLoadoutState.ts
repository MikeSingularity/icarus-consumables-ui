import { useState, useEffect, useCallback, useRef } from 'react'
import { LS_KEYS } from '@/constants/categories'
import type { Item } from '@/types/consumables'

/** Information about a rejected selection due to a modifier conflict. */
export interface ConflictInfo {
  /** The item the player tried to add. */
  candidate: Item
  /** The already-selected item whose modifier(s) overlap. */
  conflictsWith: Item
}

interface LoadoutState {
  selectedItems: Item[]
  conflict: ConflictInfo | null
}

/** Reads the persisted slot count from localStorage (1–5, default 3). */
function readSlotCount(): number {
  try {
    const v = localStorage.getItem(LS_KEYS.SLOTS)
    if (v === null) return 3
    const n = parseInt(v, 10)
    return isNaN(n) ? 3 : Math.min(5, Math.max(1, n))
  } catch {
    return 3
  }
}

/** Returns item names encoded in the ?items= URL parameter. */
function readItemNamesFromUrl(): string[] {
  const params = new URLSearchParams(window.location.search)
  return params.get('items')?.split(',').filter(Boolean) ?? []
}

/** Writes selected item names into the URL without a page reload. */
function writeItemsToUrl(items: Item[]): void {
  const url = new URL(window.location.href)
  if (items.length === 0) {
    url.searchParams.delete('items')
  } else {
    url.searchParams.set('items', items.map((i) => i.name).join(','))
  }
  window.history.replaceState(null, '', url.toString())
}

/**
 * Returns the first already-selected item whose modifier IDs overlap with
 * the candidate, or undefined if there is no conflict.
 */
function findConflict(candidate: Item, selected: Item[]): Item | undefined {
  const candidateMods = new Set(candidate.modifiers)
  return selected.find((existing) => existing.modifiers.some((mid) => candidateMods.has(mid)))
}

/**
 * Manages loadout selection state with slot count, conflict detection, and URL sync.
 *
 * - Slot count persisted in localStorage (1–5, default 3).
 * - Selected items encoded in the URL (?items=name1,name2) for shareability.
 * - Hard block: items that share any modifier ID with an already-selected item
 *   are rejected; a ConflictInfo is returned so the UI can explain why.
 * - Accepts allItems as null while data is loading; URL restore runs once on load.
 */
export function useLoadoutState(allItems: Item[] | null): {
  selectedItems: Item[]
  slotCount: number
  conflict: ConflictInfo | null
  toggleItem: (item: Item) => void
  setSlotCount: (n: number) => void
  clearLoadout: () => void
  dismissConflict: () => void
} {
  const [slotCount, setSlotCountState] = useState<number>(readSlotCount)
  const [loadoutState, setLoadoutState] = useState<LoadoutState>({
    selectedItems: [],
    conflict: null,
  })

  // Captures the slot count at mount time so the URL-restore effect can read it
  // without being re-triggered whenever the user changes the slot count later.
  const slotCountRef = useRef(slotCount)

  // Restore selected items from URL once the dataset is available.
  useEffect(() => {
    if (allItems === null) return
    const names = readItemNamesFromUrl()
    if (names.length === 0) return
    const restored = names
      .map((name) => allItems.find((item) => item.name === name))
      .filter((item): item is Item => item !== undefined)
      .slice(0, slotCountRef.current)
    setLoadoutState({ selectedItems: restored, conflict: null })
  }, [allItems])

  const toggleItem = useCallback(
    (item: Item) => {
      setLoadoutState((prev) => {
        const { selectedItems } = prev

        // Deselect if already in the loadout.
        if (selectedItems.some((s) => s.name === item.name)) {
          const next = selectedItems.filter((s) => s.name !== item.name)
          writeItemsToUrl(next)
          return { selectedItems: next, conflict: null }
        }

        // Reject silently when all slots are occupied.
        if (selectedItems.length >= slotCount) {
          return { ...prev, conflict: null }
        }

        // Hard block: reject if any modifier ID is shared with a selected item.
        const conflicting = findConflict(item, selectedItems)
        if (conflicting !== undefined) {
          return { ...prev, conflict: { candidate: item, conflictsWith: conflicting } }
        }

        const next = [...selectedItems, item]
        writeItemsToUrl(next)
        return { selectedItems: next, conflict: null }
      })
    },
    [slotCount],
  )

  const setSlotCount = useCallback((n: number) => {
    const clamped = Math.min(5, Math.max(1, n))
    setSlotCountState(clamped)
    slotCountRef.current = clamped
    localStorage.setItem(LS_KEYS.SLOTS, String(clamped))
    setLoadoutState((prev) => {
      if (prev.selectedItems.length <= clamped) return prev
      const next = prev.selectedItems.slice(0, clamped)
      writeItemsToUrl(next)
      return { selectedItems: next, conflict: null }
    })
  }, [])

  const clearLoadout = useCallback(() => {
    setLoadoutState({ selectedItems: [], conflict: null })
    writeItemsToUrl([])
  }, [])

  const dismissConflict = useCallback(() => {
    setLoadoutState((prev) => ({ ...prev, conflict: null }))
  }, [])

  return {
    selectedItems: loadoutState.selectedItems,
    slotCount,
    conflict: loadoutState.conflict,
    toggleItem,
    setSlotCount,
    clearLoadout,
    dismissConflict,
  }
}
