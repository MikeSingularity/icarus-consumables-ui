import { useState, useEffect } from 'react'
import { DATA_URL } from '@/constants/api'
import type { ConsumablesData } from '@/types/consumables'

/**
 * Module-level cache. Populated on first successful fetch and reused for
 * the lifetime of the browser session without re-fetching.
 */
let cachedData: ConsumablesData | null = null

/**
 * Fetches and caches the consumables dataset from DATA_URL.
 * The fetch is skipped on subsequent calls once the cache is populated.
 * Returns loading and error states for explicit UI handling.
 */
export function useConsumablesData(): {
  data: ConsumablesData | null
  loading: boolean
  error: string | null
} {
  const [data, setData] = useState<ConsumablesData | null>(cachedData)
  const [loading, setLoading] = useState<boolean>(cachedData === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedData !== null) return

    let cancelled = false

    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json() as Promise<ConsumablesData>
      })
      .then((json) => {
        if (cancelled) return
        cachedData = json
        setData(json)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load consumables data'
        setError(message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
