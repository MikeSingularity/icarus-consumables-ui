import { useState, useCallback } from 'react'
import { LS_KEYS } from '@/constants/categories'

/**
 * The active filter and sort state for the food browser.
 */
export interface FilterState {
  /** Maximum tier to show; items with effective tier > tier are hidden. */
  tier: number
  /** Active sort key string understood by sortItems(). */
  sortKey: string
  /** Set of talent requirement IDs whose items should be dimmed. */
  disabledTalents: Set<string>
  /** Set of feature IDs whose items should be dimmed. */
  disabledFeatures: Set<string>
  /** Set of blueprint requirement IDs whose items should be dimmed. */
  disabledBlueprints: Set<string>
  /** Set of mission requirement IDs whose items should be dimmed. */
  disabledMissions: Set<string>
  /** When true, items with any workshop requirement (e.g. Orbital Workshop) are dimmed. */
  workshopDisabled: boolean
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
 * Manages tier, sort, talent, feature, and blueprint filter state with localStorage persistence.
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
  toggleBlueprint: (blueprint: string) => void
  enableAllBlueprints: () => void
  toggleMission: (mission: string) => void
  enableAllMissions: () => void
  workshopDisabled: boolean
  toggleWorkshop: () => void
  enableAllRequirements: () => void
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

  const [disabledBlueprints, setDisabledBlueprints] = useState<Set<string>>(() =>
    readLs(LS_KEYS.DISABLED_BLUEPRINTS, new Set<string>(), parseSet),
  )

  const [disabledMissions, setDisabledMissions] = useState<Set<string>>(() =>
    readLs(LS_KEYS.DISABLED_MISSIONS, new Set<string>(), parseSet),
  )

  const [workshopDisabled, setWorkshopDisabled] = useState<boolean>(() =>
    readLs(LS_KEYS.WORKSHOP_DISABLED, false, (v) => v === 'true'),
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

  const toggleBlueprint = useCallback((blueprint: string) => {
    setDisabledBlueprints((prev) => {
      const next = new Set(prev)
      if (next.has(blueprint)) {
        next.delete(blueprint)
      } else {
        next.add(blueprint)
      }
      localStorage.setItem(LS_KEYS.DISABLED_BLUEPRINTS, JSON.stringify([...next]))
      return next
    })
  }, [])

  const enableAllBlueprints = useCallback(() => {
    setDisabledBlueprints(new Set())
    localStorage.setItem(LS_KEYS.DISABLED_BLUEPRINTS, JSON.stringify([]))
  }, [])

  const toggleMission = useCallback((mission: string) => {
    setDisabledMissions((prev) => {
      const next = new Set(prev)
      if (next.has(mission)) {
        next.delete(mission)
      } else {
        next.add(mission)
      }
      localStorage.setItem(LS_KEYS.DISABLED_MISSIONS, JSON.stringify([...next]))
      return next
    })
  }, [])

  const enableAllMissions = useCallback(() => {
    setDisabledMissions(new Set())
    localStorage.setItem(LS_KEYS.DISABLED_MISSIONS, JSON.stringify([]))
  }, [])

  const toggleWorkshop = useCallback(() => {
    setWorkshopDisabled((prev) => {
      const next = !prev
      localStorage.setItem(LS_KEYS.WORKSHOP_DISABLED, String(next))
      return next
    })
  }, [])

  const enableAllRequirements = useCallback(() => {
    setDisabledTalents(new Set())
    setDisabledFeatures(new Set())
    setDisabledBlueprints(new Set())
    setDisabledMissions(new Set())
    setWorkshopDisabled(false)
    localStorage.setItem(LS_KEYS.DISABLED_TALENTS, JSON.stringify([]))
    localStorage.setItem(LS_KEYS.DISABLED_FEATURES, JSON.stringify([]))
    localStorage.setItem(LS_KEYS.DISABLED_BLUEPRINTS, JSON.stringify([]))
    localStorage.setItem(LS_KEYS.DISABLED_MISSIONS, JSON.stringify([]))
    localStorage.setItem(LS_KEYS.WORKSHOP_DISABLED, 'false')
  }, [])

  return {
    filterState: { tier, sortKey, disabledTalents, disabledFeatures, disabledBlueprints, disabledMissions, workshopDisabled },
    setTier,
    setSortKey,
    toggleTalent,
    enableAllTalents,
    toggleFeature,
    enableAllFeatures,
    toggleBlueprint,
    enableAllBlueprints,
    toggleMission,
    enableAllMissions,
    workshopDisabled,
    toggleWorkshop,
    enableAllRequirements,
  }
}
