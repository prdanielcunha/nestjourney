import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) as T : initial
    } catch { return initial }
  })
  useEffect(() => { window.localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue] as const
}
