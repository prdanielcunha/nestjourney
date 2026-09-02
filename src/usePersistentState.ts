import { useEffect, useState } from 'react'

const STORAGE_VERSION = 2

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (!stored) return initial
      const parsed = JSON.parse(stored) as T | { version: number; value: T }
      return typeof parsed === 'object' && parsed !== null && 'version' in parsed
        ? parsed.value
        : parsed
    } catch { return initial }
  })
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, value }))
  }, [key, value])
  return [value, setValue] as const
}
