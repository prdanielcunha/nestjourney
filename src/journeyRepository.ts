import {
  Timestamp, collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { db } from './firebase'
import { journeyCollectionPath } from './productIdentity'
import { planFollowupOutcome, type FollowupNextActionCode, type FollowupOutcomeCode } from './followup'
import type { CarePromise, PresenceCheck, PresenceSession, PresenceSource, PresenceVerificationState } from './intelligence'

const SYSTEM_ROLES = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder'])
const BROAD_JOURNEY_ROLES = new Set(['owner', 'admin', 'pastor', 'data_admin'])
const PRESENCE_ROLES = new Set(['owner', 'admin', 'pastor', 'coordinator'])
const CARE_ROLES = new Set(['owner', 'admin', 'pastor', 'care'])
const GROUP_ROLES = new Set(['owner', 'admin', 'pastor', 'group_leader'])
const GROUP_ROSTER_BROAD_ROLES = new Set(['owner', 'admin', 'pastor'])
const DISCIPLESHIP_ROLES = new Set(['owner', 'admin', 'pastor', 'discipler'])
const IMPLEMENTATION_ROLES = new Set(['owner', 'admin', 'pastor', 'coordinator'])
const GOVERNANCE_ROLES = new Set(['owner', 'admin', 'pastor', 'data_admin'])
const PRIVACY_ROLES = new Set(['owner', 'admin', 'data_admin'])
const PASTORAL_ROLES = new Set(['owner', 'pastor'])

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
  canManageGroups: boolean
  canManageDiscipleship: boolean
  canManageImplementation: boolean
  canViewGovernance: boolean
  canManagePrivacy: boolean
  canManagePastoral: boolean
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

export interface JourneyPersonRecord extends PresencePerson {
  firstVisit?: string
  stage?: string
  groupId?: string
  createdAt?: string
}

export interface JourneyGroupRecord {
  id: string
  organizationId: string
  congregationId: string
  name: string
  leader?: string
  leaderId?: string
  host?: string
  apprentice?: string
  neighborhood?: string
  weekday?: string
  time?: string
  capacity?: number
  participants?: number
  createdAt?: string
  createdBy?: string
}

export interface JourneyGroupMembership {
  id: string
  organizationId: string
  congregationId: string
  groupId: string
  personId: string
  personName?: string
  status: 'active' | 'left'
  joinedAt: string
  joinedBy: string
  leftAt?: string
  leftBy?: string
}

export interface JourneyGroupEntryRequest {
  id: string
  organizationId: string
  congregationId: string
  groupId: string
  personId: string
  personName: string
  status: 'pending' | 'accepted' | 'declined'
  requestedAt: string
  requestedBy: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface JourneyDiscipleshipRecord {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  personName?: string
  disciplerId: string
  disciplerName?: string
  meeting: number
  status: 'active' | 'paused' | 'completed'
  nextMeeting?: string
  startedAt?: string
}

export interface JourneyImplementationCycle {
  id: string
  organizationId: string
  congregationId: string
  playbookId: 'raiz_e_mesa_2026'
  status: 'active' | 'completed'
  completedKeys: string[]
  startedAt: string
  createdAt?: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
  completedAt?: string
}

export interface PresenceSessionRecord extends PresenceSession {
  eventName?: string
  status: 'open' | 'closed'
  createdBy: string
  closedBy?: string
}

export interface MesaParticipationRecord {
  id: string
  organizationId: string
  congregationId: string
  sessionId: string
  personId: string
  status: 'invited' | 'joined'
  bondHostRef?: string
  updatedAt: string
  updatedBy: string
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
  | 'invalid_contact'
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

export interface JourneyFollowupRecord {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  careRequestId: string
  kind: 'first_contact'
  status: 'pending' | 'completed'
  ownerRef: string
  dueAt: string
  createdAt: string
  createdBy: string
  completedAt?: string
  completedBy?: string
  outcomeCode?: FollowupOutcomeCode
  nextActionCode?: FollowupNextActionCode
}

export type PrivacyRequestType = 'correction' | 'consent_revocation' | 'deletion_review' | 'retention_review'
export type PrivacyCorrectionField = 'name' | 'phone' | 'firstVisit'

export interface JourneyPrivacyRequest {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  personName?: string
  requestType: PrivacyRequestType
  targetField?: PrivacyCorrectionField
  proposedValue?: string
  status: 'open'
  requestedAt: string
  requestedBy: string
}

export interface JourneyAuditEvent {
  id: string
  organizationId: string
  congregationId?: string
  actorId: string
  action: string
  targetRef?: string
  subjectRef?: string
  requestType?: PrivacyRequestType
  createdAt: string
}

export interface JourneyPastoralHandoff {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  sourceCareRequestId: string
  status: 'open' | 'resolved'
  requestedAt: string
  requestedBy: string
  resolvedAt?: string
  resolvedBy?: string
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
    canManageGroups: isSystemAdmin || isOwner || GROUP_ROLES.has(role) || permissions.canManageGroups === true,
    canManageDiscipleship: isSystemAdmin || isOwner || DISCIPLESHIP_ROLES.has(role) || permissions.canManageDiscipleship === true,
    canManageImplementation: isSystemAdmin || isOwner || IMPLEMENTATION_ROLES.has(role) || permissions.canManageImplementation === true,
    canViewGovernance: isSystemAdmin || isOwner || GOVERNANCE_ROLES.has(role) || permissions.canViewGovernance === true,
    canManagePrivacy: isSystemAdmin || isOwner || PRIVACY_ROLES.has(role) || permissions.canManagePrivacy === true,
    canManagePastoral: isSystemAdmin || isOwner || PASTORAL_ROLES.has(role) || permissions.canManagePastoral === true,
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

export async function listJourneyPeople(organizationId: string, congregationId: string): Promise<JourneyPersonRecord[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'people')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): JourneyPersonRecord => {
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
      firstVisit: asString(data.firstVisit) || undefined,
      stage: asString(data.stage) || undefined,
      groupId: asString(data.groupId) || undefined,
      createdAt: data.createdAt ? toIso(data.createdAt) : undefined,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export async function listJourneyGroups(organizationId: string, congregationId: string): Promise<JourneyGroupRecord[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'groups')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): JourneyGroupRecord => {
    const data = item.data()
    return {
      id: item.id,
      organizationId,
      congregationId,
      name: asString(data.name) || '—',
      leader: asString(data.leader || data.leaderName) || undefined,
      leaderId: asString(data.leaderId) || undefined,
      host: asString(data.host) || undefined,
      apprentice: asString(data.apprentice) || undefined,
      neighborhood: asString(data.neighborhood) || undefined,
      weekday: asString(data.weekday) || undefined,
      time: asString(data.time) || undefined,
      capacity: typeof data.capacity === 'number' ? data.capacity : undefined,
      participants: typeof data.participants === 'number' ? data.participants : undefined,
      createdAt: data.createdAt ? toIso(data.createdAt) : undefined,
      createdBy: asString(data.createdBy) || undefined,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export function canManageJourneyGroupRoster(access: JourneyAccessContext, group: JourneyGroupRecord) {
  return access.isSystemAdmin || access.isOwner || GROUP_ROSTER_BROAD_ROLES.has(access.role) || group.leaderId === access.userId || group.createdBy === access.userId
}

export function canCreateJourneyGroupEntryRequest(access: JourneyAccessContext) {
  return access.isSystemAdmin || access.isOwner || GROUP_ROSTER_BROAD_ROLES.has(access.role)
}

export async function listJourneyGroupMemberships(access: JourneyAccessContext, group: JourneyGroupRecord): Promise<JourneyGroupMembership[]> {
  if (!canManageJourneyGroupRoster(access, group)) return []
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(access.organizationId, 'groupMemberships')),
    where('groupId', '==', group.id),
  ))
  return snapshot.docs.map((item): JourneyGroupMembership => {
    const data = item.data()
    return {
      id: item.id,
      organizationId: access.organizationId,
      congregationId: asString(data.congregationId),
      groupId: asString(data.groupId),
      personId: asString(data.personId),
      personName: asString(data.personName) || undefined,
      status: data.status === 'left' ? 'left' : 'active',
      joinedAt: toIso(data.joinedAt),
      joinedBy: asString(data.joinedBy),
      leftAt: data.leftAt ? toIso(data.leftAt) : undefined,
      leftBy: asString(data.leftBy) || undefined,
    }
  }).filter((item) => item.congregationId === group.congregationId)
    .sort((a, b) => a.status.localeCompare(b.status) || (a.personName ?? '').localeCompare(b.personName ?? ''))
}

function groupMembershipId(groupId: string, personId: string) {
  return `${groupId}__${personId}`
}

export async function listJourneyGroupEntryRequests(access: JourneyAccessContext, group: JourneyGroupRecord): Promise<JourneyGroupEntryRequest[]> {
  if (!canManageJourneyGroupRoster(access, group)) return []
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(access.organizationId, 'groupEntryRequests')),
    where('groupId', '==', group.id),
  ))
  return snapshot.docs.map((item): JourneyGroupEntryRequest => {
    const data = item.data()
    const rawStatus = asString(data.status)
    const status: JourneyGroupEntryRequest['status'] = rawStatus === 'accepted' ? 'accepted' : rawStatus === 'declined' ? 'declined' : 'pending'
    return {
      id: item.id,
      organizationId: access.organizationId,
      congregationId: asString(data.congregationId),
      groupId: asString(data.groupId),
      personId: asString(data.personId),
      personName: asString(data.personName) || '—',
      status,
      requestedAt: toIso(data.requestedAt),
      requestedBy: asString(data.requestedBy),
      resolvedAt: data.resolvedAt ? toIso(data.resolvedAt) : undefined,
      resolvedBy: asString(data.resolvedBy) || undefined,
    }
  }).filter((item) => item.congregationId === group.congregationId)
    .sort((a, b) => {
      const weight = (status: JourneyGroupEntryRequest['status']) => status === 'pending' ? 0 : status === 'accepted' ? 1 : 2
      return weight(a.status) - weight(b.status) || Date.parse(b.requestedAt) - Date.parse(a.requestedAt)
    })
}

export async function createJourneyGroupEntryRequest(input: {
  access: JourneyAccessContext
  group: JourneyGroupRecord
  person: JourneyPersonRecord
}) {
  if (!canCreateJourneyGroupEntryRequest(input.access)) throw new Error('group_entry_request_forbidden')
  if (!canManageJourneyGroupRoster(input.access, input.group)) throw new Error('group_entry_request_scope_forbidden')
  if (input.person.congregationId !== input.group.congregationId) throw new Error('group_entry_request_scope_mismatch')

  const firestore = requireDb()
  const membershipRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groupMemberships')}/${groupMembershipId(input.group.id, input.person.id)}`)
  const [membershipSnapshot, requestsSnapshot] = await Promise.all([
    getDoc(membershipRef),
    getDocs(query(
      collection(firestore, journeyCollectionPath(input.access.organizationId, 'groupEntryRequests')),
      where('groupId', '==', input.group.id),
    )),
  ])
  if (membershipSnapshot.exists() && asString(membershipSnapshot.data().status) === 'active') throw new Error('group_entry_already_member')
  const alreadyPending = requestsSnapshot.docs.some((item) => {
    const data = item.data()
    return asString(data.personId) === input.person.id && asString(data.status) === 'pending'
  })
  if (alreadyPending) throw new Error('group_entry_request_exists')

  const requestRef = doc(collection(firestore, journeyCollectionPath(input.access.organizationId, 'groupEntryRequests')))
  const batch = writeBatch(firestore)
  batch.set(requestRef, {
    organizationId: input.access.organizationId,
    congregationId: input.group.congregationId,
    groupId: input.group.id,
    personId: input.person.id,
    personName: input.person.name,
    status: 'pending',
    requestedAt: serverTimestamp(),
    requestedBy: input.access.userId,
    resolvedAt: null,
    resolvedBy: '',
  })
  await batch.commit()
  return requestRef.id
}

export async function resolveJourneyGroupEntryRequest(input: {
  access: JourneyAccessContext
  group: JourneyGroupRecord
  request: JourneyGroupEntryRequest
  decision: 'accepted' | 'declined'
}) {
  if (!canManageJourneyGroupRoster(input.access, input.group)) throw new Error('group_entry_resolution_forbidden')
  if (input.request.groupId !== input.group.id || input.request.congregationId !== input.group.congregationId) throw new Error('group_entry_resolution_scope_mismatch')

  const firestore = requireDb()
  const requestRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groupEntryRequests')}/${input.request.id}`)
  const groupRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groups')}/${input.group.id}`)
  const membershipRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groupMemberships')}/${groupMembershipId(input.group.id, input.request.personId)}`)

  await runTransaction(firestore, async (transaction) => {
    const [requestSnapshot, groupSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(groupRef),
      transaction.get(membershipRef),
    ])
    if (!requestSnapshot.exists()) throw new Error('group_entry_request_not_found')
    if (!groupSnapshot.exists()) throw new Error('group_not_found')
    if (asString(requestSnapshot.data().status) !== 'pending') return

    if (input.decision === 'declined') {
      transaction.update(requestRef, {
        status: 'declined',
        resolvedAt: serverTimestamp(),
        resolvedBy: input.access.userId,
      })
      return
    }

    const groupData = groupSnapshot.data()
    const currentCount = Math.max(0, Number(groupData.participants ?? 0))
    const capacity = Math.max(1, Number(groupData.capacity ?? 12))
    const currentMembershipStatus = membershipSnapshot.exists() ? asString(membershipSnapshot.data().status) : ''

    if (currentMembershipStatus !== 'active') {
      if (currentCount >= capacity) throw new Error('group_capacity_reached')
      transaction.set(membershipRef, {
        organizationId: input.access.organizationId,
        congregationId: input.group.congregationId,
        groupId: input.group.id,
        personId: input.request.personId,
        personName: input.request.personName,
        status: 'active',
        joinedAt: serverTimestamp(),
        joinedBy: input.access.userId,
        leftAt: null,
        leftBy: '',
      })
      transaction.update(groupRef, {
        participants: currentCount + 1,
        updatedAt: serverTimestamp(),
        updatedBy: input.access.userId,
      })
    }

    transaction.update(requestRef, {
      status: 'accepted',
      resolvedAt: serverTimestamp(),
      resolvedBy: input.access.userId,
    })
  })
}

export async function setJourneyGroupMembership(input: {
  access: JourneyAccessContext
  group: JourneyGroupRecord
  person: JourneyPersonRecord
  active: boolean
}) {
  if (!canManageJourneyGroupRoster(input.access, input.group)) throw new Error('group_roster_forbidden')
  if (input.person.congregationId !== input.group.congregationId) throw new Error('group_membership_scope_mismatch')
  const firestore = requireDb()
  const groupRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groups')}/${input.group.id}`)
  const membershipRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'groupMemberships')}/${groupMembershipId(input.group.id, input.person.id)}`)

  await runTransaction(firestore, async (transaction) => {
    const [groupSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(membershipRef),
    ])
    if (!groupSnapshot.exists()) throw new Error('group_not_found')
    const groupData = groupSnapshot.data()
    const currentCount = Math.max(0, Number(groupData.participants ?? 0))
    const capacity = Math.max(1, Number(groupData.capacity ?? 12))
    const currentStatus = membershipSnapshot.exists() ? asString(membershipSnapshot.data().status) : ''

    if (input.active) {
      if (currentStatus === 'active') return
      if (currentCount >= capacity) throw new Error('group_capacity_reached')
      transaction.set(membershipRef, {
        organizationId: input.access.organizationId,
        congregationId: input.group.congregationId,
        groupId: input.group.id,
        personId: input.person.id,
        personName: input.person.name,
        status: 'active',
        joinedAt: serverTimestamp(),
        joinedBy: input.access.userId,
        leftAt: null,
        leftBy: '',
      })
      transaction.update(groupRef, {
        participants: currentCount + 1,
        updatedAt: serverTimestamp(),
        updatedBy: input.access.userId,
      })
      return
    }

    if (currentStatus !== 'active') return
    transaction.update(membershipRef, {
      status: 'left',
      leftAt: serverTimestamp(),
      leftBy: input.access.userId,
    })
    transaction.update(groupRef, {
      participants: Math.max(0, currentCount - 1),
      updatedAt: serverTimestamp(),
      updatedBy: input.access.userId,
    })
  })
}

export async function listJourneyDiscipleships(access: JourneyAccessContext, congregationId: string): Promise<JourneyDiscipleshipRecord[]> {
  const firestore = requireDb()
  const base = collection(firestore, journeyCollectionPath(access.organizationId, 'discipleships'))
  const source = access.broadJourneyAccess
    ? query(base, where('congregationId', '==', congregationId))
    : query(base, where('congregationId', '==', congregationId), where('disciplerId', '==', access.userId))
  const snapshot = await getDocs(source)

  return snapshot.docs.map((item): JourneyDiscipleshipRecord => {
    const data = item.data()
    const rawStatus = asString(data.status)
    const status: JourneyDiscipleshipRecord['status'] = rawStatus === 'completed' ? 'completed' : rawStatus === 'paused' ? 'paused' : 'active'
    return {
      id: item.id,
      organizationId: access.organizationId,
      congregationId,
      personId: asString(data.personId),
      personName: asString(data.personName || data.person) || undefined,
      disciplerId: asString(data.disciplerId || data.mentorId),
      disciplerName: asString(data.disciplerName || data.mentor) || undefined,
      meeting: typeof data.meeting === 'number' ? data.meeting : 1,
      status,
      nextMeeting: asString(data.nextMeeting) || undefined,
      startedAt: data.startedAt ? toIso(data.startedAt) : undefined,
    }
  }).sort((a, b) => a.status.localeCompare(b.status) || a.meeting - b.meeting)
}

export async function createJourneyGroup(input: {
  organizationId: string
  congregationId: string
  actorId: string
  name: string
  leader?: string
  leaderId?: string
  host?: string
  apprentice?: string
  neighborhood?: string
  weekday?: string
  time?: string
  capacity?: number
}) {
  const firestore = requireDb()
  const groupRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'groups')))
  const batch = writeBatch(firestore)
  batch.set(groupRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    name: input.name.trim(),
    leader: String(input.leader ?? '').trim(),
    leaderId: String(input.leaderId ?? '').trim(),
    host: String(input.host ?? '').trim(),
    apprentice: String(input.apprentice ?? '').trim(),
    neighborhood: String(input.neighborhood ?? '').trim(),
    weekday: String(input.weekday ?? '').trim(),
    time: String(input.time ?? '').trim(),
    capacity: Math.max(1, Math.min(100, Math.floor(input.capacity ?? 12))),
    participants: 0,
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
    updatedAt: serverTimestamp(),
    updatedBy: input.actorId,
  })
  await batch.commit()
  return groupRef.id
}

export async function updateJourneyGroup(input: {
  organizationId: string
  groupId: string
  actorId: string
  patch: Partial<Pick<JourneyGroupRecord, 'name' | 'leader' | 'leaderId' | 'host' | 'apprentice' | 'neighborhood' | 'weekday' | 'time' | 'capacity' | 'participants'>>
}) {
  const firestore = requireDb()
  const groupRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'groups')}/${input.groupId}`)
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp(), updatedBy: input.actorId }
  for (const [key, value] of Object.entries(input.patch)) {
    if (value === undefined) continue
    if (key === 'capacity') patch[key] = Math.max(1, Math.min(100, Math.floor(Number(value))))
    else if (key === 'participants') patch[key] = Math.max(0, Math.floor(Number(value)))
    else patch[key] = typeof value === 'string' ? value.trim() : value
  }
  const batch = writeBatch(firestore)
  batch.update(groupRef, patch)
  await batch.commit()
}

export async function createJourneyDiscipleship(input: {
  organizationId: string
  congregationId: string
  person: JourneyPersonRecord
  actorId: string
  disciplerName?: string
}) {
  const firestore = requireDb()
  const relationRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'discipleships')))
  const batch = writeBatch(firestore)
  batch.set(relationRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    personId: input.person.id,
    personName: input.person.name,
    disciplerId: input.actorId,
    disciplerName: String(input.disciplerName ?? '').trim(),
    meeting: 1,
    completedMeetings: [],
    status: 'active',
    nextMeeting: 'Agendar encontro 1',
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
    updatedAt: serverTimestamp(),
    updatedBy: input.actorId,
  })
  await batch.commit()
  return relationRef.id
}

export async function updateJourneyDiscipleship(input: {
  organizationId: string
  relation: JourneyDiscipleshipRecord
  actorId: string
  action: 'advance' | 'pause' | 'resume'
}) {
  const firestore = requireDb()
  const relationRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'discipleships')}/${input.relation.id}`)
  const batch = writeBatch(firestore)
  if (input.action === 'advance') {
    const currentMeeting = Math.max(1, Math.min(7, input.relation.meeting || 1))
    const nextMeeting = Math.min(7, currentMeeting + 1)
    const completed = currentMeeting >= 7
    batch.update(relationRef, {
      meeting: nextMeeting,
      status: completed ? 'completed' : 'active',
      nextMeeting: completed ? 'Ciclo concluído' : `Agendar encontro ${nextMeeting}`,
      lastCompletedMeeting: currentMeeting,
      lastCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: input.actorId,
    })
  } else {
    const status = input.action === 'pause' ? 'paused' : 'active'
    batch.update(relationRef, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorId,
    })
  }
  await batch.commit()
}

export async function listPastoralHandoffs(organizationId: string, congregationId: string): Promise<JourneyPastoralHandoff[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'pastoralHandoffs')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): JourneyPastoralHandoff => {
    const data = item.data()
    return {
      id: item.id,
      organizationId,
      congregationId,
      personId: asString(data.personId),
      sourceCareRequestId: asString(data.sourceCareRequestId),
      status: data.status === 'resolved' ? 'resolved' : 'open',
      requestedAt: toIso(data.requestedAt),
      requestedBy: asString(data.requestedBy),
      resolvedAt: data.resolvedAt ? toIso(data.resolvedAt) : undefined,
      resolvedBy: asString(data.resolvedBy) || undefined,
    }
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return Date.parse(b.requestedAt) - Date.parse(a.requestedAt)
  })
}

export async function resolvePastoralHandoff(input: {
  organizationId: string
  handoff: JourneyPastoralHandoff
  actorId: string
}) {
  const firestore = requireDb()
  const handoffRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'pastoralHandoffs')}/${input.handoff.id}`)
  await updateDoc(handoffRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: input.actorId,
  })
}

export async function listPrivacyRequests(organizationId: string, congregationId: string): Promise<JourneyPrivacyRequest[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'retentionRequests')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): JourneyPrivacyRequest => {
    const data = item.data()
    const rawType = asString(data.requestType)
    const requestType: PrivacyRequestType =
      rawType === 'correction' || rawType === 'consent_revocation' || rawType === 'deletion_review' || rawType === 'retention_review'
        ? rawType
        : 'retention_review'
    const rawField = asString(data.targetField)
    const targetField: PrivacyCorrectionField | undefined =
      rawField === 'name' || rawField === 'phone' || rawField === 'firstVisit' ? rawField : undefined
    return {
      id: item.id,
      organizationId,
      congregationId,
      personId: asString(data.personId),
      personName: asString(data.personName) || undefined,
      requestType,
      targetField,
      proposedValue: asString(data.proposedValue) || undefined,
      status: 'open',
      requestedAt: toIso(data.requestedAt),
      requestedBy: asString(data.requestedBy),
    }
  }).sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
}

export async function listJourneyAuditEvents(organizationId: string, congregationId: string): Promise<JourneyAuditEvent[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'audit')),
    where('congregationId', '==', congregationId),
  ))

  return snapshot.docs.map((item): JourneyAuditEvent => {
    const data = item.data()
    const rawType = asString(data.requestType)
    const requestType: PrivacyRequestType | undefined =
      rawType === 'correction' || rawType === 'consent_revocation' || rawType === 'deletion_review' || rawType === 'retention_review'
        ? rawType
        : undefined
    return {
      id: item.id,
      organizationId,
      congregationId: asString(data.congregationId) || undefined,
      actorId: asString(data.actorId),
      action: asString(data.action) || 'journey.event',
      targetRef: asString(data.targetRef) || undefined,
      subjectRef: asString(data.subjectRef) || undefined,
      requestType,
      createdAt: toIso(data.createdAt),
    }
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 100)
}

export async function createPrivacyRequest(input: {
  organizationId: string
  congregationId: string
  actorId: string
  person: JourneyPersonRecord
  requestType: PrivacyRequestType
  targetField?: PrivacyCorrectionField
  proposedValue?: string
}) {
  if (input.person.organizationId !== input.organizationId || input.person.congregationId !== input.congregationId) {
    throw new Error('privacy_scope_mismatch')
  }
  const correction = input.requestType === 'correction'
  const proposedValue = correction ? String(input.proposedValue ?? '').trim().slice(0, 120) : ''
  if (correction && (!input.targetField || !proposedValue)) throw new Error('invalid_correction_request')

  const firestore = requireDb()
  const requestRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'retentionRequests')))
  const auditRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'audit')))
  const batch = writeBatch(firestore)
  batch.set(requestRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    personId: input.person.id,
    personName: input.person.name,
    requestType: input.requestType,
    targetField: correction ? input.targetField : '',
    proposedValue,
    status: 'open',
    requestedAt: serverTimestamp(),
    requestedBy: input.actorId,
  })
  batch.set(auditRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    actorId: input.actorId,
    action: 'privacy.requested',
    targetRef: `privacyRequest:${requestRef.id}`,
    subjectRef: `person:${input.person.id}`,
    requestType: input.requestType,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
  return requestRef.id
}

export async function listImplementationCycles(organizationId: string, congregationId: string): Promise<JourneyImplementationCycle[]> {
  const firestore = requireDb()
  const basePath = journeyCollectionPath(organizationId, 'implementationCycles')
  const snapshot = await getDocs(query(
    collection(firestore, basePath),
    where('congregationId', '==', congregationId),
  ))

  const cycles = await Promise.all(snapshot.docs.map(async (item): Promise<JourneyImplementationCycle> => {
    const data = item.data()
    const steps = await getDocs(collection(firestore, `${basePath}/${item.id}/steps`))
    const completedKeys = steps.docs
      .map((step) => asString(step.data().key))
      .filter(Boolean)
      .sort()
    return {
      id: item.id,
      organizationId,
      congregationId,
      playbookId: 'raiz_e_mesa_2026',
      status: completedKeys.length >= 46 ? 'completed' : 'active',
      completedKeys,
      startedAt: toIso(data.startedAt),
      createdAt: data.createdAt ? toIso(data.createdAt) : undefined,
      createdBy: asString(data.createdBy),
      updatedAt: undefined,
      updatedBy: undefined,
      completedAt: undefined,
    }
  }))

  return cycles.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
}

export async function createImplementationCycle(input: { organizationId: string; congregationId: string; actorId: string }) {
  const firestore = requireDb()
  const cycleRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'implementationCycles')}/${input.congregationId}-raiz-e-mesa-2026`)
  const batch = writeBatch(firestore)
  batch.set(cycleRef, {
    organizationId: input.organizationId,
    congregationId: input.congregationId,
    playbookId: 'raiz_e_mesa_2026',
    status: 'active',
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
  })
  await batch.commit()
  return cycleRef.id
}

export async function completeImplementationStep(input: {
  organizationId: string
  cycle: JourneyImplementationCycle
  actorId: string
  key: string
  requiredKeys: string[]
}) {
  if (!input.requiredKeys.includes(input.key)) throw new Error('invalid_implementation_step')
  const firestore = requireDb()
  const stepRef = doc(
    firestore,
    `${journeyCollectionPath(input.organizationId, 'implementationCycles')}/${input.cycle.id}/steps/${input.key}`,
  )
  const batch = writeBatch(firestore)
  batch.set(stepRef, {
    organizationId: input.organizationId,
    congregationId: input.cycle.congregationId,
    cycleId: input.cycle.id,
    playbookId: input.cycle.playbookId,
    key: input.key,
    completedAt: serverTimestamp(),
    completedBy: input.actorId,
  })
  await batch.commit()
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

export async function listMesaParticipationRecords(
  organizationId: string,
  congregationId: string,
  sessionId: string,
): Promise<MesaParticipationRecord[]> {
  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, journeyCollectionPath(organizationId, 'mesaParticipations')),
    where('congregationId', '==', congregationId),
    where('sessionId', '==', sessionId),
  ))

  return snapshot.docs.map((item): MesaParticipationRecord => {
    const data = item.data()
    return {
      id: item.id,
      organizationId,
      congregationId,
      sessionId,
      personId: asString(data.personId),
      status: data.status === 'joined' ? 'joined' : 'invited',
      bondHostRef: asString(data.bondHostRef) || undefined,
      updatedAt: toIso(data.updatedAt),
      updatedBy: asString(data.updatedBy),
    }
  })
}

export async function setMesaParticipation(input: {
  organizationId: string
  congregationId: string
  sessionId: string
  personId: string
  actorId: string
  status: 'invited' | 'joined'
}) {
  const firestore = requireDb()
  const id = `${input.sessionId}__${input.personId}`
  const ref = doc(firestore, `${journeyCollectionPath(input.organizationId, 'mesaParticipations')}/${id}`)
  const existing = await getDoc(ref)
  const batch = writeBatch(firestore)
  const bondHostRef = existing.exists() ? asString(existing.data().bondHostRef) || input.actorId : input.actorId

  if (existing.exists()) {
    batch.update(ref, {
      status: input.status,
      bondHostRef,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorId,
    })
  } else {
    batch.set(ref, {
      organizationId: input.organizationId,
      congregationId: input.congregationId,
      sessionId: input.sessionId,
      personId: input.personId,
      status: input.status,
      bondHostRef,
      updatedAt: serverTimestamp(),
      updatedBy: input.actorId,
    })
  }

  await batch.commit()
  return id
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
  const careRequestedFactRef = careRef
    ? doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-requested-${careRef.id}`)
    : null
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

  if (careRef && careRequestedFactRef) {
    const promiseHours = 48
    batch.set(careRef, {
      organizationId: input.organizationId, congregationId: input.congregationId, personId: personRef.id,
      careType: 'first_contact', source: 'visitor_registration', summary: '', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: input.actorId, promiseHours,
      dueAt: Timestamp.fromMillis(Date.now() + promiseHours * 60 * 60 * 1000),
      ownerRef: '', assignedAt: null, assignedBy: '', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    })
    batch.set(careRequestedFactRef, {
      eventId: careRequestedFactRef.id,
      eventType: 'CARE_REQUESTED',
      occurredAt: serverTimestamp(),
      recordedAt: serverTimestamp(),
      organizationId: input.organizationId,
      actorId: input.actorId,
      subjectRef: `person:${personRef.id}`,
      sourceApp: 'nestjourney',
      scope: `congregation:${input.congregationId}`,
      evidenceRef: `careRequest:${careRef.id}`,
      sensitivity: 'confidential',
      version: 1,
      payload: {
        careRequestId: careRef.id,
        personId: personRef.id,
        careType: 'first_contact',
        source: 'visitor_registration',
      },
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

export async function listJourneyFollowups(access: JourneyAccessContext, congregationId: string): Promise<JourneyFollowupRecord[]> {
  if (!access.canManageCare && !access.broadJourneyAccess) return []
  const firestore = requireDb()
  const base = collection(firestore, journeyCollectionPath(access.organizationId, 'followups'))
  const source = access.broadJourneyAccess
    ? query(base, where('congregationId', '==', congregationId))
    : query(base, where('congregationId', '==', congregationId), where('ownerRef', '==', access.userId))
  const snapshot = await getDocs(source)
  return snapshot.docs.map((item): JourneyFollowupRecord => {
    const data = item.data()
    const rawStatus = asString(data.status)
    return {
      id: item.id,
      organizationId: access.organizationId,
      congregationId: asString(data.congregationId),
      personId: asString(data.personId),
      careRequestId: asString(data.careRequestId),
      kind: 'first_contact',
      status: rawStatus === 'completed' ? 'completed' : 'pending',
      ownerRef: asString(data.ownerRef),
      dueAt: toIso(data.dueAt),
      createdAt: toIso(data.createdAt),
      createdBy: asString(data.createdBy),
      completedAt: data.completedAt ? toIso(data.completedAt) : undefined,
      completedBy: asString(data.completedBy) || undefined,
      outcomeCode: asString(data.outcomeCode) ? asString(data.outcomeCode) as FollowupOutcomeCode : undefined,
      nextActionCode: asString(data.nextActionCode) ? asString(data.nextActionCode) as FollowupNextActionCode : undefined,
    }
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    return Date.parse(a.dueAt) - Date.parse(b.dueAt)
  })
}

function followupIdForCare(careRequestId: string) {
  return `first-contact-${careRequestId}`
}

export async function startJourneyFollowup(input: {
  access: JourneyAccessContext
  request: CareRequestRecord
}) {
  if (!input.access.canManageCare) throw new Error('followup_forbidden')
  if (input.request.careType !== 'first_contact' || input.request.status !== 'open') throw new Error('followup_source_invalid')
  if (input.request.ownerRef !== input.access.userId) throw new Error('followup_owner_required')

  const firestore = requireDb()
  const followupId = followupIdForCare(input.request.id)
  const followupRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'followups')}/${followupId}`)
  const factRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'facts')}/followup-created-${followupId}`)
  const batch = writeBatch(firestore)
  batch.set(followupRef, {
    organizationId: input.access.organizationId,
    congregationId: input.request.congregationId,
    personId: input.request.personId,
    careRequestId: input.request.id,
    kind: 'first_contact',
    status: 'pending',
    ownerRef: input.access.userId,
    dueAt: Timestamp.fromDate(new Date(input.request.dueAt)),
    createdAt: serverTimestamp(),
    createdBy: input.access.userId,
    completedAt: null,
    completedBy: '',
    outcomeCode: '',
    nextActionCode: '',
  })
  batch.set(factRef, {
    eventId: factRef.id,
    eventType: 'FOLLOWUP_CREATED',
    occurredAt: serverTimestamp(),
    recordedAt: serverTimestamp(),
    organizationId: input.access.organizationId,
    actorId: input.access.userId,
    subjectRef: `person:${input.request.personId}`,
    sourceApp: 'nestjourney',
    scope: `congregation:${input.request.congregationId}`,
    evidenceRef: `followup:${followupId}`,
    sensitivity: 'confidential',
    version: 1,
    payload: {
      followupId,
      careRequestId: input.request.id,
      personId: input.request.personId,
      kind: 'first_contact',
    },
  })
  await batch.commit()
  return followupId
}

export async function completeJourneyFollowup(input: {
  access: JourneyAccessContext
  followup: JourneyFollowupRecord
  request: CareRequestRecord
  outcomeCode: FollowupOutcomeCode
}) {
  if (!input.access.canManageCare) throw new Error('followup_forbidden')
  if (input.followup.status !== 'pending') return
  if (input.followup.ownerRef !== input.access.userId) throw new Error('followup_owner_required')
  if (input.request.id !== input.followup.careRequestId || input.request.personId !== input.followup.personId) throw new Error('followup_source_mismatch')
  if (input.request.status !== 'open') throw new Error('care_already_resolved')

  const plan = planFollowupOutcome(input.outcomeCode)
  const firestore = requireDb()
  const followupRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'followups')}/${input.followup.id}`)
  const careRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'careRequests')}/${input.request.id}`)
  const followupFactRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'facts')}/followup-completed-${input.followup.id}`)
  const careFactRef = doc(firestore, `${journeyCollectionPath(input.access.organizationId, 'facts')}/care-resolved-${input.request.id}`)
  const batch = writeBatch(firestore)

  batch.update(followupRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedBy: input.access.userId,
    outcomeCode: plan.outcomeCode,
    nextActionCode: plan.nextActionCode,
  })
  batch.update(careRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: input.access.userId,
    resolutionCode: plan.careResolutionCode,
    resolutionNote: '',
  })
  batch.set(followupFactRef, {
    eventId: followupFactRef.id,
    eventType: 'FOLLOWUP_COMPLETED',
    occurredAt: serverTimestamp(),
    recordedAt: serverTimestamp(),
    organizationId: input.access.organizationId,
    actorId: input.access.userId,
    subjectRef: `person:${input.followup.personId}`,
    sourceApp: 'nestjourney',
    scope: `congregation:${input.followup.congregationId}`,
    evidenceRef: `followup:${input.followup.id}`,
    sensitivity: 'confidential',
    version: 1,
    payload: {
      followupId: input.followup.id,
      careRequestId: input.request.id,
      personId: input.followup.personId,
      outcomeCode: plan.outcomeCode,
      nextActionCode: plan.nextActionCode,
    },
  })
  batch.set(careFactRef, {
    eventId: careFactRef.id,
    eventType: 'CARE_RESOLVED',
    occurredAt: serverTimestamp(),
    recordedAt: serverTimestamp(),
    organizationId: input.access.organizationId,
    actorId: input.access.userId,
    subjectRef: `person:${input.followup.personId}`,
    sourceApp: 'nestjourney',
    scope: `congregation:${input.followup.congregationId}`,
    evidenceRef: `careRequest:${input.request.id}`,
    sensitivity: 'confidential',
    version: 1,
    payload: {
      careRequestId: input.request.id,
      personId: input.followup.personId,
      careType: input.request.careType,
      resolutionCode: plan.careResolutionCode,
    },
  })
  await batch.commit()
  return plan
}

export async function createCareRequest(input: {
  organizationId: string; congregationId: string; personId: string; actorId: string; careType: CareType; summary?: string; promiseHours?: number
}) {
  const firestore = requireDb()
  const requestRef = doc(collection(firestore, journeyCollectionPath(input.organizationId, 'careRequests')))
  const requestedFactRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-requested-${requestRef.id}`)
  const assignedFactRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-assigned-${requestRef.id}`)
  const batch = writeBatch(firestore)
  const promiseHours = Math.max(1, Math.min(168, Math.floor(input.promiseHours ?? 48)))
  const summary = String(input.summary ?? '').trim().slice(0, 160)
  batch.set(requestRef, {
    organizationId: input.organizationId, congregationId: input.congregationId, personId: input.personId, careType: input.careType,
    source: 'manual', summary, status: 'open', requestedAt: serverTimestamp(), requestedBy: input.actorId, promiseHours,
    dueAt: Timestamp.fromMillis(Date.now() + promiseHours * 60 * 60 * 1000), ownerRef: input.actorId,
    assignedAt: serverTimestamp(), assignedBy: input.actorId, resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
  })
  batch.set(requestedFactRef, {
    eventId: requestedFactRef.id, eventType: 'CARE_REQUESTED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
    organizationId: input.organizationId, actorId: input.actorId, subjectRef: `person:${input.personId}`, sourceApp: 'nestjourney',
    scope: `congregation:${input.congregationId}`, evidenceRef: `careRequest:${requestRef.id}`, sensitivity: 'confidential', version: 1,
    payload: { careRequestId: requestRef.id, personId: input.personId, careType: input.careType, source: 'manual' },
  })
  batch.set(assignedFactRef, {
    eventId: assignedFactRef.id, eventType: 'CARE_ASSIGNED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
    organizationId: input.organizationId, actorId: input.actorId, subjectRef: `person:${input.personId}`, sourceApp: 'nestjourney',
    scope: `congregation:${input.congregationId}`, evidenceRef: `careRequest:${requestRef.id}`, sensitivity: 'confidential', version: 1,
    payload: { careRequestId: requestRef.id, personId: input.personId, careType: input.careType, ownerRef: input.actorId },
  })
  await batch.commit()
  return requestRef.id
}

export async function claimCareRequest(input: { organizationId: string; request: CareRequestRecord; actorId: string }) {
  const firestore = requireDb()
  const requestRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'careRequests')}/${input.request.id}`)
  const factRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-assigned-${input.request.id}`)
  const batch = writeBatch(firestore)
  batch.update(requestRef, { ownerRef: input.actorId, assignedAt: serverTimestamp(), assignedBy: input.actorId })
  batch.set(factRef, {
    eventId: factRef.id, eventType: 'CARE_ASSIGNED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
    organizationId: input.organizationId, actorId: input.actorId, subjectRef: `person:${input.request.personId}`, sourceApp: 'nestjourney',
    scope: `congregation:${input.request.congregationId}`, evidenceRef: `careRequest:${input.request.id}`, sensitivity: 'confidential', version: 1,
    payload: { careRequestId: input.request.id, personId: input.request.personId, careType: input.request.careType, ownerRef: input.actorId },
  })
  await batch.commit()
}

export async function resolveCareRequest(input: { organizationId: string; request: CareRequestRecord; actorId: string; resolutionCode: CareResolutionCode; resolutionNote?: string }) {
  const firestore = requireDb()
  const requestRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'careRequests')}/${input.request.id}`)
  const resolvedFactRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'facts')}/care-resolved-${input.request.id}`)
  const batch = writeBatch(firestore)
  const resolutionNote = String(input.resolutionNote ?? '').trim().slice(0, 160)

  batch.update(requestRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: input.actorId,
    resolutionCode: input.resolutionCode,
    resolutionNote: input.resolutionCode === 'pastoral_handoff' ? '' : resolutionNote,
  })
  batch.set(resolvedFactRef, {
    eventId: resolvedFactRef.id, eventType: 'CARE_RESOLVED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
    organizationId: input.organizationId, actorId: input.actorId, subjectRef: `person:${input.request.personId}`, sourceApp: 'nestjourney',
    scope: `congregation:${input.request.congregationId}`, evidenceRef: `careRequest:${input.request.id}`, sensitivity: 'confidential', version: 1,
    payload: {
      careRequestId: input.request.id,
      personId: input.request.personId,
      careType: input.request.careType,
      resolutionCode: input.resolutionCode,
    },
  })

  if (input.resolutionCode === 'pastoral_handoff') {
    const handoffRef = doc(firestore, `${journeyCollectionPath(input.organizationId, 'pastoralHandoffs')}/${input.request.id}`)
    batch.set(handoffRef, {
      organizationId: input.organizationId,
      congregationId: input.request.congregationId,
      personId: input.request.personId,
      sourceCareRequestId: input.request.id,
      status: 'open',
      requestedAt: serverTimestamp(),
      requestedBy: input.actorId,
      resolvedAt: null,
      resolvedBy: '',
    })
  }

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
