import { useEffect, useRef, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { useEcosystem } from './useEcosystem'
import type { AppLabels, Organization } from './types'
import { STORAGE_NAMESPACE } from './product'

const STORAGE_VERSION = 3
const collectionNames: Record<string, string> = {
  'rem:congregations': 'congregations',
  'rem:people': 'people',
  'rem:groups': 'groups',
  'rem:discipleships': 'discipleships',
  'rem:presence': 'presence',
  'rem:group-meetings': 'groupMeetings',
  'rem:join-requests': 'joinRequests',
  'rem:team': 'teamAssignments',
  'rem:audit': 'audit',
  'rem:retention': 'retentionRequests',
}

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

export function usePersistentState<T>(key: string, initial: T) {
  const ecosystem = useEcosystem()
  const currentRef = useRef(initial)
  const [value, setValue] = useState<T>(() => {
    if (ecosystem.isCloud && ecosystem.organizationId) return cloudDefault(key, initial, ecosystem.organizationId, ecosystem.organization)
    try {
      const stored = window.localStorage.getItem(key)
      if (!stored) return initial
      const parsed = JSON.parse(stored) as T | { version: number; value: T }
      return typeof parsed === 'object' && parsed !== null && 'version' in parsed ? parsed.value : parsed
    } catch { return initial }
  })
  useEffect(() => { currentRef.current = value }, [value])

  useEffect(() => {
    if (!ecosystem.isCloud || !ecosystem.organizationId || !db) return
    const organizationId = ecosystem.organizationId
    const productPath = ['organizations', organizationId, 'products', STORAGE_NAMESPACE] as const
    const collectionName = collectionNames[key]
    if (collectionName) {
      return onSnapshot(collection(db, ...productPath, collectionName), (snapshot) => {
        const items = snapshot.docs.map((snapshotDocument) => {
          const { _updatedAt, _updatedBy, ...data } = snapshotDocument.data()
          void _updatedAt; void _updatedBy
          if (key === 'rem:audit' && data.createdAt && typeof data.createdAt.toDate === 'function') {
            data.createdAt = data.createdAt.toDate().toISOString()
          }
          return { ...data, id: snapshotDocument.id }
        })
        setValue(items as T)
      }, (syncError) => window.dispatchEvent(new CustomEvent('rem:sync-error', { detail: syncError.message })))
    }
    const id = key === 'rem:week-done' ? 'implementation' : key.replace(/^rem:/, '')
    const bucket = key === 'rem:week-done' ? 'implementation' : 'settings'
    const reference = doc(db, ...productPath, bucket, id)
    const fallback = cloudDefault(key, initial, organizationId, ecosystem.organization)
    return onSnapshot(reference, (snapshot) => {
      setValue(snapshot.exists() && 'value' in snapshot.data() ? snapshot.data().value as T : fallback)
    }, (syncError) => window.dispatchEvent(new CustomEvent('rem:sync-error', { detail: syncError.message })))
  }, [ecosystem.isCloud, ecosystem.organization, ecosystem.organizationId, initial, key])

  const update: React.Dispatch<React.SetStateAction<T>> = (next) => {
    const previous = currentRef.current
    const resolved = typeof next === 'function' ? (next as (current: T) => T)(previous) : next
    currentRef.current = resolved
    setValue(resolved)
    if (!ecosystem.isCloud || !ecosystem.organizationId || !ecosystem.user || !db) return

    const organizationId = ecosystem.organizationId
    const productPath = ['organizations', organizationId, 'products', STORAGE_NAMESPACE] as const
    const collectionName = collectionNames[key]
    if (collectionName && Array.isArray(resolved)) {
      const previousById = new Map((Array.isArray(previous) ? previous : []).map((item: { id?: string }) => [item.id, item]))
      const batch = writeBatch(db)
      let changes = 0
      for (const rawItem of resolved as Array<Record<string, unknown> & { id?: string }>) {
        const documentId = rawItem.id
        if (!documentId) continue
        const prior = previousById.get(documentId)
        if (prior && JSON.stringify(clean(prior)) === JSON.stringify(clean(rawItem))) continue
        if (key === 'rem:audit' && prior) continue
        const { id, ...item } = clean(rawItem)
        const storedItem = key === 'rem:audit'
          ? { ...item, actorId: ecosystem.user.uid, createdAt: serverTimestamp() }
          : key === 'rem:retention' && !prior
            ? { ...item, requestedBy: ecosystem.user.uid }
            : item
        batch.set(doc(db, ...productPath, collectionName, String(id || documentId)), {
          ...storedItem, organizationId, _updatedAt: serverTimestamp(), _updatedBy: ecosystem.user.uid,
        }, { merge: true })
        changes += 1
      }
      if (changes) void batch.commit().catch((syncError) => window.dispatchEvent(new CustomEvent('rem:sync-error', { detail: syncError.message })))
      return
    }

    const id = key === 'rem:week-done' ? 'implementation' : key.replace(/^rem:/, '')
    const bucket = key === 'rem:week-done' ? 'implementation' : 'settings'
    void setDoc(doc(db, ...productPath, bucket, id), {
      organizationId, value: clean(resolved), _updatedAt: serverTimestamp(), _updatedBy: ecosystem.user.uid,
    }, { merge: true }).catch((syncError) => window.dispatchEvent(new CustomEvent('rem:sync-error', { detail: syncError.message })))
  }

  useEffect(() => {
    if (!ecosystem.isCloud) window.localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, value }))
  }, [ecosystem.isCloud, key, value])
  return [value, update] as const
}

function cloudDefault<T>(key: string, initial: T, organizationId: string, source: Record<string, unknown> | null): T {
  if (key === 'rem:organization') return {
    ...(initial as Organization), id: organizationId,
    name: String(source?.name || 'Minha igreja'), slug: String(source?.slug || organizationId),
  } as T
  if (key === 'rem:labels') return { reception: 'Presença', table: 'Mesa Aberta', care: 'Cuidado e Conexão', group: 'Casa de Paz', discipleship: 'Raiz' } as T as AppLabels & T
  if (key === 'rem:week-done') return {} as T
  if (Array.isArray(initial)) return [] as T
  return initial
}
