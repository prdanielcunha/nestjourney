import {
  Timestamp, collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import { journeyCollectionPath } from './productIdentity'
import type { CarePromise, PresenceCheck, PresenceSession, PresenceSource, PresenceVerificationState } from './intelligence'

const SYSTEM_ROLES = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder'])
const BROAD_JOURNEY_ROLES = new Set(['owner', 'admin', 'pastor', 'data_admin'])
const PRESENCE_ROLES = new Set(['owner', 'admin', 'pastor', 'coordinator'])
const CARE_ROLES = new Set(['owner', 'admin', 'pastor', 'care'])

export interface JourneyAccessContext {
  organizationId: string
  userId: string
  role: string
  permissions: Record<string, boolean>
  congregationIds: string[]
  isSystemAdmin: boolean
  isOwner: boolean
  canManagePresence: boolean
  canManagePeople: boolean
  canManageCare: boolean
  broadJourneyAccess: boolean
}

export interface JourneyCongregation {
  id: string
  name: string
  city?: string
  active?: boolean
}

export interface PresencePerson {
  id: string
  organizationId: string
  congregationId: string
  name: string
  photoUrl?: string
  phone?: string
  consent?: boolean
  visits?: number
}

export interface PresenceSessionRecord extends PresenceSession {
  eventName?: string
  status: 'open' | 'closed'
  createdBy: string
  closedBy?: string
}

export interface MinimalVisitorInput {
  organizationId: string
  congregationId: string
  actorId: string
  name: string
  phone?: string
  consent: boolean
}

export type CareType =
  | 'first_contact'
  | 'prayer'
  | 'pastoral_contact'
  | 'group_interest'
  | 'absence_check'
  | 'operational_followup'

export type CareResolutionCode =
  | 'contact_completed'
  | 'pastoral_handoff'
  | 'declined_contact'
  | 'closed_no_response'
  | 'other_resolved'

export interface CareRequestRecord {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  careType: CareType
  source: 'manual' | 'visitor_registration'
  summary?: string
  status: 'open' | 'resolved'
  requestedAt: string
  requestedBy: string
  promiseHours: number
  dueAt: string
  ownerRef?: string
  assignedAt?: string
  assignedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionCode?: CareResolutionCode
  resolutionNote?: string
}

function requireDb(): Firestore {
  if (!db) throw new Error('firebase_not_configured')
  return db
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asBooleanMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => typeof item === 'boolean')) as Record<string, boolean>
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : []
}

function toIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return new Date(0).toISOString()
}

export function getActiveJourneyOrganizationId() {
  try { return sessionStorage.getItem('mn_ecosystem_org_id')?.trim() ?? '' } catch { return '' }
}

export async function loadJourneyAccess(userId: string, organizationId: string): Promise<JourneyAccessContext> {
  const firestore = requireDb()
  const nestedRef = doc(firestore, `organizations/${organizationId}/members/${userId}`)
  const legacyRef = doc(firestore, `organization_members/${userId}_${organizationId}`)
  const reverseLegacyRef = doc(firestore, `organization_members/${organizationId}_${userId}`)
  const userRef = doc(firestore, `users/${userId}`)
  const orgRef = doc(firestore, `organizations/${organizationId}`)

  const [nested, user, org] = await Promise.all([
    getDoc(nestedRef),
    getDoc(userRef),
    getDoc(orgRef),
  ])

  let membership = nested.exists() ? nested.data() : {}
  if (!nested.exists()) {
    for (const fallbackRef of [legacyRef, reverseLegacyRef]) {
      try {
        const fallback = await getDoc(fallbackRef)
        if (fallback.exists()) {
          membership = fallback.data()
          break
        }
      } catch {
        // A legacy fallback may be unreadable when its id does not belong to this user.
        // The canonical nested membership remains the preferred source of truth.
      }
    }
  }

  const userData = user.exists() ? user.data() : {}
  const orgData = org.exists() ? org.data() : {}
  const permissions = asBooleanMap(membership.permissions)
  const systemRole = asString(userData.systemRole)
  const isSystemAdmin = SYSTEM_ROLES.has(systemRole)
  const ownerUid = asString(orgData.ownerUid || orgData.ownerId)
  const isOwner = ownerUid === userId
  const role = asString(membership.organizationRole || membership.role || (isOwner ? 'owner' : ''))
  const congregationIds = asStringArray(membership.congregationIds)

  return {
    organizationId,
    userId,
    role,
    permissions,
    congregationIds,
    isSystemAdmin,
    isOwner,
    canManagePresence: isSystemAdmin || isOwner || PRESENCE_ROLES.has(role) || permissions.canManagePresence === true,
    canManagePeople: isSystemAdmin || isOwner || BROAD_JOURNEY_ROLES.has(role) || permissions.canManagePeople === true,
    canManageCare: isSystemAdmin || isOwner || CARE_ROLES.has(role) || permissions.canManageCare === true,
    broadJourneyAccess: isSystemAdmin || isOwner || BROAD_JOURNEY_ROLES.has(role),
  }
}

export async function listJourneyCongregations(access: JourneyAccessContext): Promise<JourneyCongregation[]> {
  const firestore = requireDb()
  const basePath = journeyCollectionPath(access.organizationId, 'congregations')

  if (access.broadJourneyAccess) {
    const snapshot = await getDocs(collection(firestore, basePath))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as JourneyCongregation)).filter((item) => item.active !== false)
  }

  const docs = await Promise.all(access.congregationIds.map((id) => getDoc(doc(firestore, `${basePath}/${id}`))))
  return docs.filter((item) => item.exists()).map((item) => ({ id: item.id, ...item.data() } as JourneyCongregation)).filter((item) => item.active !== false)
}

export async function listPresencePeople(organizationId: string, congregationId: string): Promise<PresencePerson[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'people')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      id: item.id,
      organizationId,
      congregationId,
      name: asString(data.name) || '—',
      photoUrl: asString(data.photoUrl || data.photoURL) || undefined,
      phone: asString(data.phone) || undefined,
      consent: Boolean(data.consent),
      visits: typeof data.visits === 'number' ? data.visits : undefined,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export async function listPresenceSessions(organizationId: string, congregationId: string): Promise<PresenceSessionRecord[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'presenceSessions')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): PresenceSessionRecord => {
    const data = item.data()
    const status: PresenceSessionRecord['status'] = data.status === 'closed' ? 'closed' : 'open'
    return {
      id: item.id,
      organizationId,
      congregationId,
      eventRef: asString(data.eventRef),
      eventName: asString(data.eventName) || undefined,
      openedAt: toIso(data.openedAt),
      closedAt: data.closedAt ? toIso(data.closedAt) : undefined,
      expectedPeopleCount: typeof data.expectedPeopleCount === 'number' ? data.expectedPeopleCount : 0,
      minimumCoveragePercent: typeof data.minimumCoveragePercent === 'number' ? data.minimumCoveragePercent : 90,
      status,
      createdBy: asString(data.createdBy),
      closedBy: asString(data.closedBy) || undefined,
    }
  }).sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt))
}

export async function listPresenceChecks(organizationId: string, congregationId: string, sessionId: string): Promise<PresenceCheck[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'presenceChecks')),
    where('congregationId', '==', congregationId),
    where('sessionId', '==', sessionId),
  ))

  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      id: item.id,
      organizationId,
      congregationId,
      sessionId,
      personId: asString(data.personId),
      state: data.state as PresenceVerificationState,
      source: data.source as PresenceSource,
      actorId: asString(data.actorId),
      recordedAt: toIso(data.recordedAt),
      correctedFromCheckId: asString(data.correctedFromCheckId) || undefined,
    }
  })
}

export async function createPresenceSession(input: {
  organizationId: string
  congregationId: string
  actorId: string
  eventName: string
  expectedPeopleCount: number
  minimumCoveragePercent: number
}) {
  const firestore = requireDb()
  const sessions = collection(firestore, journeyCollectionPath(input.organizationId, 'presenceSessions'))
  const sessionRef = doc(sessions)
  const factRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/presence-session-${sessionRef.id}`)
  const batch = writeBatch(firestore)
  const eventRef = `event:${sessionRef.id}`

  batch.set(sessionRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    eventRef,
    eventName: input.eventName.trim(),
    openedAt: serverTimestamp(),
    closedAt: null,
    status: 'open',
    expectedPeopleCount: Math.max(0, Math.floor(input.expectedPeopleCount)),
    minimumCoveragePercent: Math.max(0, Math.min(100, input.minimumCoveragePercent)),
    createdBy: input.actorId,
  })
  batch.set(factRef, {
    eventId: factRef.id,
    eventType: 'PRESENCE_SESSION_OPENED',
    occurredAt: serverTimestamp(),
    recordedAt: serverTimestamp(),
    organizationId: input.organizationId,
    actorId: input.actorId,
    subjectRef: `presenceSession:${sessionRef.id}`,
    sourceApp: 'nestjourney',
    scope: `congregation:${input.congregationId}`,
    evidenceRef: `presenceSession:${sessionRef.id}`,
    sensitivity: 'internal',
    version: 1,
    payload: { sessionId: sessionRef.id },
  })
  await batch.commit()
  return sessionRef.id
}

export async function recordPresenceCheck(input: {
  organizationId: string
  congregationId: string
  sessionId: string
  personId: string
  actorId: string
  state: PresenceVerificationState
  correctedFromCheckId?: string
}) {
  const firestore = requireDb()
  const checkRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'presenceChecks')))
  const batch = writeBatch(firestore)

  batch.set(checkRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    sessionId: input.sessionId,
    personId: input.personId,
    state: input.state,
    source: 'human_check',
    actorId: input.actorId,
    recordedAt: serverTimestamp(),
  })

  if (input.state !== 'unverified') {
    const factRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/presence-${checkRef.id}`)
    batch.set(factRef, {
      eventId: factRef.id,
      eventType: 'PRESENCE_CONFIRMED',
      occurredAt: serverTimestamp(),
      recordedAt: serverTimestamp(),
      organizationId: input.organizationId,
      actorId: input.actorId,
      subjectRef: `person:${input.personId}`,
      sourceApp: 'nestjourney',
      scope: `congregation:${input.congregationId}`,
      evidenceRef: `presenceCheck:${checkRef.id}`,
      sensitivity: 'confidential',
      version: 1,
      payload: { checkId: checkRef.id, sessionId: input.sessionId, state: input.state, source: 'human_check' },
    })
  }

  await batch.commit()
  return checkRef.id
}

export async function closePresenceSession(organizationId: string, sessionId: string, actorId: string) {
  const firestore = requireDb()
  const ref = doc(firestore, `${journeyCollectionPath(organizationId, 'presenceSessions')}/${sessionId}`)
  const batch = writeBatch(firestore)
  batch.update(ref, { status: 'closed', closedAt: serverTimestamp(), closedBy: actorId })
  await batch.commit()
}

export async function createMinimalVisitor(input: MinimalVisitorInput) {
  const firestore = requireDb()
  const personRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'people')))
  const factRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/visitor-${personRef.id}`)
  const careRef = input.consent ? doc(collection(firestore, journeyCollectionPath(input.organizationId, 'careRequests'))) : null
  const careFactRef = careRef ? doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-request-${careRef.id}`) : null
  const batch = writeBatch(firestore)
  const today = new Date().toISOString().slice(0, 10)
  const consent = Boolean(input.consent)

  batch.set(personRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    name: input.name.trim(),
    phone: consent ? String(input.phone ?? '').trim() : '',
    firstVisit: today,
    consent,
    stage: consent ? 'contact_authorized' : 'new',
    nextActionCode: consent ? 'FIRST_CONTACT' : 'WELCOME_ON_NEXT_VISIT',
    ownerRef: null,
    visits: 1,
    contactStatus: consent ? 'pending' : 'closed',
    consentGrantedAt: consent ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
  })
  batch.set(factRef, {
    eventId: factRef.id, eventType: 'VISITOR_REGISTERED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
    organizationId: input.organizationId, actorId: input.actorId, subjectRef: `person:${personRef.id}`, sourceApp: 'nestjourney',
    scope: `congregation:${input.congregationId}`, evidenceRef: `person:${personRef.id}`, sensitivity: 'confidential', version: 1,
    payload: { personId: personRef.id, consent },
  })

  if (careRef) {
    const promiseHours = 48
    batch.set(careRef, {
      organizationId: input.organizationId, congregationId: input.congregationId, personId: personRef.id,
      careType: 'first_contact', source: 'visitor_registration', summary: '', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: input.actorId, promiseHours,
      dueAt: Timestamp.fromMillis(Date.now() + promiseHours * 60 * 60 * 1000),
      ownerRef: '', assignedAt: null, assignedBy: '', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    })
  }

  await batch.commit()
  return { id: personRef.id, organizationId: input.organizationId, congregationId: input.congregationId, name: input.name.trim(), phone: consent ? input.phone : undefined, consent, visits: 1 } satisfies PresencePerson
}

export function careRequestToPromise(request: CareRequestRecord): CarePromise {
  return {
    id: request.id, organizationId: request.organizationId, subjectRef: `person:${request.personId}`,
    careType: request.careType, createdAt: request.requestedAt, dueAt: request.dueAt, ownerRef: request.ownerRef || undefined,
    evidenceRef: `careRequest:${request.id}`, resolvedAt: request.resolvedAt,
    resolutionEvidenceRef: request.resolvedAt ? `careRequest:${request.id}` : undefined,
  }
}

export async function listCareRequests(organizationId: string, congregationId: string): Promise<CareRequestRecord[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(collection(firestore, journeyCollectionPath(organizationId, 'careRequests')), where('congregationId', '==', congregationId)))
  return snapshot.docs.map((item): CareRequestRecord => {
    const data = item.data()
    const resolutionCode = asString(data.resolutionCode)
    return {
      id: item.id, organizationId, congregationId, personId: asString(data.personId), careType: data.careType as CareType,
      source: data.source === 'visitor_registration' ? 'visitor_registration' : 'manual', summary: asString(data.summary) || undefined,
      status: data.status === 'resolved' ? 'resolved' : 'open', requestedAt: toIso(data.requestedAt), requestedBy: asString(data.requestedBy),
      promiseHours: typeof data.promiseHours === 'number' ? data.promiseHours : 48, dueAt: toIso(data.dueAt),
      ownerRef: asString(data.ownerRef) || undefined, assignedAt: data.assignedAt ? toIso(data.assignedAt) : undefined,
      assignedBy: asString(data.assignedBy) || undefined, resolvedAt: data.resolvedAt ? toIso(data.resolvedAt) : undefined,
      resolvedBy: asString(data.resolvedBy) || undefined, resolutionCode: resolutionCode ? resolutionCode as CareResolutionCode : undefined,
      resolutionNote: asString(data.resolutionNote) || undefined,
    }
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
}

export async function createCareRequest(input: {
  organizationId: string; congregationId: string; personId: string; actorId: string; careType: CareType; summary?: string; promiseHours?: number
}) {
  const firestore = requireDb()
  const requestRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'careRequests')))
  const batch = writeBatch(firestore)
  const promiseHours = Math.max(1, Math.min(168, Math.floor(input.promiseHours ?? 48)))
  const summary = String(input.summary ?? '').trim().slice(0, 160)
  batch.set(requestRef, {
    organizationId: input.organizationId, congregationId: input.congregationId, personId: input.personId, careType: input.careType,
    source: 'manual', summary, status: 'open', requestedAt: serverTimestamp(), requestedBy: input.actorId, promiseHours,
    dueAt: Timestamp.fromMillis(Date.now() + promiseHours * 60 * 60 * 1000), ownerRef: input.actorId,
    assignedAt: serverTimestamp(), assignedBy: input.actorId, resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
  })
  await batch.commit()
  return requestRef.id
}

export async function claimCareRequest(input: { organizationId: string; request: CareRequestRecord; actorId: string }) {
  const firestore = requireDb()
  const requestRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'careRequests')}/${input.request.id}`)
  const batch = writeBatch(firestore)
  batch.update(requestRef, { ownerRef: input.actorId, assignedAt: serverTimestamp(), assignedBy: input.actorId })
  await batch.commit()
}

export async function resolveCareRequest(input: { organizationId: string; request: CareRequestRecord; actorId: string; resolutionCode: CareResolutionCode; resolutionNote?: string }) {
  const firestore = requireDb()
  const requestRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'careRequests')}/${input.request.id}`)
  const batch = writeBatch(firestore)
  const resolutionNote = String(input.resolutionNote ?? '').trim().slice(0, 160)
  batch.update(requestRef, { status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: input.actorId, resolutionCode: input.resolutionCode, resolutionNote })
  await batch.commit()
}

export function latestChecksByPerson(checks: PresenceCheck[]) {
  const latest = new Map<string, PresenceCheck>()
  for (const check of checks) {
    const current = latest.get(check.personId)
    if (!current || Date.parse(check.recordedAt) >= Date.parse(current.recordedAt)) latest.set(check.personId, check)
  }
  return latest
}
