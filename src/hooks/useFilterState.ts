import { useState, useCallback } from 'react'
import { LS_KEYS } from '@/constants/categories'

/**
 * The active filter and sort state for the food browser.
 */
export interface FilterState {
  /** Maximum tier to show; items with tier.total > tier are hidden. */
  tier: number
  /** Active sort key string understood by sortItems(). */
  sortKey: string
  /** Set of talent_requirement values whose items should be dimmed. */
  disabledTalents: Set<string>
  /** Set of feature values whose items should be dimmed. */
  disabledFeatures: Set<string>
}

/**
 * Reads a value from localStorage, returning a fallback on any error or missing key.
 */
function readLs<T>(key: string, fallback: T, parse: (v: string) => T): T {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? parse(v) : fallback
  } catch {
    return fallback
  }
}

function parseSet(v: string): Set<string> {
  const parsed = JSON.parse(v) as unknown
  return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set<string>()
}

/**
 * Manages tier, sort, talent, and feature filter state with localStorage persistence.
 * All state is initialized from localStorage on first render.
 */
export function useFilterState(): {
  filterState: FilterState
  setTier: (tier: number) => void
  setSortKey: (key: string) => void
  toggleTalent: (talent: string) => void
  enableAllTalents: () => void
  toggleFeature: (feature: string) => void
  enableAllFeatures: () => void
} {
  const [tier, setTierState] = useState<number>(() =>
    readLs(LS_KEYS.TIER, 4, (v) => {
      const n = parseInt(v, 10)
      return isNaN(n) ? 4 : Math.min(4, Math.max(0, n))
    }),
  )

  const [sortKey, setSortKeyState] = useState<string>(() =>
    readLs(LS_KEYS.SORT, 'tier', (v) => v),
  )

  const [disabledTalents, setDisabledTalents] = useState<Set<string>>(() =>
    readLs(LS_KEYS.DISABLED_TALENTS, new Set<string>(), parseSet),
  )

  const [disabledFeatures, setDisabledFeatures] = useState<Set<string>>(() =>
    readLs(LS_KEYS.DISABLED_FEATURES, new Set<string>(), parseSet),
  )

  const setTier = useCallback((t: number) => {
    setTierState(t)
    localStorage.setItem(LS_KEYS.TIER, String(t))
  }, [])

  const setSortKey = useCallback((k: string) => {
    setSortKeyState(k)
    localStorage.setItem(LS_KEYS.SORT, k)
  }, [])

  const toggleTalent = useCallback((talent: string) => {
    setDisabledTalents((prev) => {
      const next = new Set(prev)
      if (next.has(talent)) {
        next.delete(talent)
      } else {
        next.add(talent)
      }
      localStorage.setItem(LS_KEYS.DISABLED_TALENTS, JSON.stringify([...next]))
      return next
    })
  }, [])

  const enableAllTalents = useCallback(() => {
    setDisabledTalents(new Set())
    localStorage.setItem(LS_KEYS.DISABLED_TALENTS, JSON.stringify([]))
  }, [])

  const toggleFeature = useCallback((feature: string) => {
    setDisabledFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(feature)) {
        next.delete(feature)
      } else {
        next.add(feature)
      }
      localStorage.setItem(LS_KEYS.DISABLED_FEATURES, JSON.stringify([...next]))
      return next
    })
  }, [])

  const enableAllFeatures = useCallback(() => {
    setDisabledFeatures(new Set())
    localStorage.setItem(LS_KEYS.DISABLED_FEATURES, JSON.stringify([]))
  }, [])

  return {
    filterState: { tier, sortKey, disabledTalents, disabledFeatures },
    setTier,
    setSortKey,
    toggleTalent,
    enableAllTalents,
    toggleFeature,
    enableAllFeatures,
  }
}
