import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { journeyCollectionPath } from './productIdentity'
import type { JourneyAccessContext, JourneyPersonRecord } from './journeyRepository'

export const FAMILY_RELATIONS = ['parent', 'child', 'spouse', 'sibling', 'relative', 'guardian', 'other'] as const
export type FamilyRelation = typeof FAMILY_RELATIONS[number]
export type FamilyEventAction = 'link' | 'unlink'

export interface JourneyFamily {
  id: string
  organizationId: string
  congregationId: string
  label: string
  createdAt?: string
}

export interface JourneyFamilyEvent {
  id: string
  organizationId: string
  congregationId: string
  familyId: string
  personId: string
  action: FamilyEventAction
  relationshipType: FamilyRelation
  guardianFlag: boolean
  recordedBy: string
  recordedAt: string
  reason?: string
}

const validRelation = (value: string): value is FamilyRelation => (FAMILY_RELATIONS as readonly string[]).includes(value)

export function canManageJourneyFamilies(access: JourneyAccessContext | null): boolean {
  return Boolean(access && (access.isSystemAdmin || access.isOwner || ['owner', 'admin', 'pastor', 'data_admin'].includes(access.organizationRole)))
}

function assertScope(access: JourneyAccessContext, congregationId: string) {
  if (!canManageJourneyFamilies(access)) throw new Error('families_forbidden')
  if (!congregationId || (!access.broadJourneyAccess && !access.congregationIds.includes(congregationId))) {
    throw new Error('families_unit_forbidden')
  }
}

/** Family records are explicit statements, not surname/address matches.
 * The latest event projects current membership; older events remain immutable. */
export function projectActiveFamilyLinks(events: JourneyFamilyEvent[]): JourneyFamilyEvent[] {
  const sorted = [...events].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id))
  const latest = new Map<string, JourneyFamilyEvent>()
  for (const event of sorted) {
    if (event.action !== 'link' && event.action !== 'unlink') continue
    if (!validRelation(event.relationshipType)) continue
    latest.set(`${event.familyId}:${event.personId}`, event)
  }
  return [...latest.values()].filter(event => event.action === 'link')
}

function toIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate as () => Date)().toISOString()
  }
  return typeof value === 'string' ? value : ''
}

export async function loadJourneyFamilies(access: JourneyAccessContext, congregationId: string) {
  assertScope(access, congregationId)
  const firestore = db
  if (!firestore) throw new Error('firebase_not_configured')
  const root = (part: string) => collection(firestore, journeyCollectionPath(access.organizationId, part))
  const [familyDocs, eventDocs] = await Promise.all([
    getDocs(query(root('families'), where('congregationId', '==', congregationId))),
    getDocs(query(root('familyEvents'), where('congregationId', '==', congregationId))),
  ])
  const families: JourneyFamily[] = familyDocs.docs.map(record => ({
    id: record.id,
    organizationId: access.organizationId,
    congregationId,
    label: String(record.data().label || '—'),
    createdAt: toIso(record.data().createdAt),
  })).sort((a, b) => a.label.localeCompare(b.label))
  const events: JourneyFamilyEvent[] = eventDocs.docs.map(record => {
    const data = record.data()
    return {
      id: record.id, organizationId: access.organizationId, congregationId,
      familyId: String(data.familyId || ''), personId: String(data.personId || ''),
      action: data.action === 'unlink' ? 'unlink' : 'link',
      relationshipType: validRelation(String(data.relationshipType || '')) ? data.relationshipType : 'other',
      guardianFlag: data.guardianFlag === true, recordedBy: String(data.recordedBy || ''),
      recordedAt: toIso(data.recordedAt), reason: String(data.reason || '') || undefined,
    }
  })
  return { families, events, activeLinks: projectActiveFamilyLinks(events) }
}

export async function createJourneyFamily(input: {
  access: JourneyAccessContext
  person: JourneyPersonRecord
  label: string
  relationshipType: FamilyRelation
  guardianFlag: boolean
}): Promise<string> {
  const { access, person } = input
  assertScope(access, person.congregationId)
  if (person.organizationId !== access.organizationId) throw new Error('families_tenant_mismatch')
  const label = input.label.trim().replace(/\s+/g, ' ')
  if (label.length < 2 || label.length > 80) throw new Error('families_label_invalid')
  if (!validRelation(input.relationshipType)) throw new Error('families_relation_invalid')
  if (input.guardianFlag && !['parent', 'guardian'].includes(input.relationshipType)) throw new Error('families_guardian_invalid')
  if (!db) throw new Error('firebase_not_configured')
  const familyRef = doc(collection(db, journeyCollectionPath(access.organizationId, 'families')))
  const eventRef = doc(collection(db, journeyCollectionPath(access.organizationId, 'familyEvents')))
  const batch = writeBatch(db)
  batch.set(familyRef, {
    organizationId: access.organizationId, congregationId: person.congregationId,
    label, createdBy: access.userId, createdAt: serverTimestamp(),
  })
  batch.set(eventRef, {
    organizationId: access.organizationId, congregationId: person.congregationId,
    familyId: familyRef.id, personId: person.id, action: 'link',
    relationshipType: input.relationshipType, guardianFlag: input.guardianFlag,
    recordedAt: serverTimestamp(), recordedBy: access.userId,
  })
  await batch.commit()
  return familyRef.id
}

export async function recordJourneyFamilyEvent(input: {
  access: JourneyAccessContext
  family: JourneyFamily
  person: JourneyPersonRecord
  action: FamilyEventAction
  relationshipType: FamilyRelation
  guardianFlag: boolean
  reason?: string
}) {
  const { access, family, person } = input
  assertScope(access, family.congregationId)
  if (family.organizationId !== access.organizationId || person.organizationId !== access.organizationId ||
      family.congregationId !== person.congregationId) throw new Error('families_scope_mismatch')
  if (!validRelation(input.relationshipType)) throw new Error('families_relation_invalid')
  if (input.guardianFlag && !['parent', 'guardian'].includes(input.relationshipType)) throw new Error('families_guardian_invalid')
  const reason = String(input.reason ?? '').trim()
  if (input.action === 'unlink' && (reason.length < 3 || reason.length > 200)) throw new Error('families_reason_required')
  if (!db) throw new Error('firebase_not_configured')
  const eventRef = doc(collection(db, journeyCollectionPath(access.organizationId, 'familyEvents')))
  const batch = writeBatch(db)
  batch.set(eventRef, {
    organizationId: access.organizationId, congregationId: family.congregationId,
    familyId: family.id, personId: person.id, action: input.action,
    relationshipType: input.relationshipType, guardianFlag: input.action === 'link' && input.guardianFlag,
    recordedAt: serverTimestamp(), recordedBy: access.userId,
    ...(input.action === 'unlink' ? { reason } : {}),
  })
  await batch.commit()
  return eventRef.id
}
