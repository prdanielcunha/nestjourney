export type Sensitivity = 'public' | 'internal' | 'confidential' | 'restricted'

export type CanonicalEventType =
  | 'VISITOR_REGISTERED'
  | 'PRESENCE_SESSION_OPENED'
  | 'PRESENCE_CONFIRMED'
  | 'PRESENCE_CORRECTED'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_COMPLETED'
  | 'CARE_REQUESTED'
  | 'CARE_ASSIGNED'
  | 'CARE_PROMISE_DUE'
  | 'CARE_DEBT_OPENED'
  | 'CARE_RESOLVED'
  | 'JOURNEY_STARTED'
  | 'JOURNEY_STEP_COMPLETED'
  | 'GROUP_JOINED'
  | 'GROUP_LEFT'
  | 'EXIT_FEEDBACK_SUBMITTED'

export interface CanonicalFactEvent {
  eventId: string
  eventType: CanonicalEventType
  occurredAt: string
  recordedAt: string
  organizationId: string
  actorId?: string
  subjectRef: string
  sourceApp: 'nestjourney'
  scope: string
  evidenceRef: string
  sensitivity: Sensitivity
  version: 1
  payload: Record<string, unknown>
}

export type PresenceVerificationState = 'present_confirmed' | 'absent_confirmed' | 'unverified'
export type PresenceSource = 'human_check' | 'retroactive_human_correction' | 'manual_import'

export interface PresenceSession {
  id: string
  organizationId: string
  congregationId: string
  eventRef: string
  openedAt: string
  closedAt?: string
  expectedPeopleCount: number
  minimumCoveragePercent: number
}

export interface PresenceCheck {
  id: string
  organizationId: string
  congregationId: string
  sessionId: string
  personId: string
  state: PresenceVerificationState
  source: PresenceSource
  actorId: string
  recordedAt: string
  correctedFromCheckId?: string
}

export interface PresenceCoverage {
  expected: number
  verified: number
  unverified: number
  percent: number
  meetsMinimum: boolean
}

export interface CarePromise {
  id: string
  organizationId: string
  subjectRef: string
  careType: string
  createdAt: string
  dueAt: string
  ownerRef?: string
  evidenceRef: string
  resolvedAt?: string
  resolutionEvidenceRef?: string
}

export type CarePromiseState = 'open' | 'due_soon' | 'debt' | 'resolved'

export interface CarePromiseEvaluation {
  state: CarePromiseState
  overdueMs: number
  remainingMs: number
  evidenceRefs: string[]
}

function assertIsoDate(value: string, field: string) {
  const parsed = Date.parse(value)
  if (!value || Number.isNaN(parsed)) throw new Error(`invalid_${field}`)
  return parsed
}

function assertRequired(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`missing_${field}`)
}

export function calculatePresenceCoverage(session: PresenceSession, checks: PresenceCheck[]): PresenceCoverage {
  const expected = Math.max(0, Math.floor(session.expectedPeopleCount))
  const scoped = checks.filter((check) =>
    check.organizationId === session.organizationId &&
    check.congregationId === session.congregationId &&
    check.sessionId === session.id
  )

  const latestByPerson = new Map<string, PresenceCheck>()
  for (const check of scoped) {
    const current = latestByPerson.get(check.personId)
    if (!current || Date.parse(check.recordedAt) >= Date.parse(current.recordedAt)) {
      latestByPerson.set(check.personId, check)
    }
  }

  const verified = [...latestByPerson.values()].filter((check) => check.state !== 'unverified').length
  const boundedVerified = Math.min(expected, verified)
  const unverified = Math.max(0, expected - boundedVerified)
  const percent = expected === 0 ? 0 : Math.round((boundedVerified / expected) * 10000) / 100

  return {
    expected,
    verified: boundedVerified,
    unverified,
    percent,
    meetsMinimum: percent >= Math.max(0, Math.min(100, session.minimumCoveragePercent)),
  }
}

export function canUseAbsenceEvidence(session: PresenceSession, checks: PresenceCheck[]) {
  if (!session.closedAt) return false
  return calculatePresenceCoverage(session, checks).meetsMinimum
}

export function confirmedAbsencePersonIds(session: PresenceSession, checks: PresenceCheck[]) {
  if (!canUseAbsenceEvidence(session, checks)) return []

  const scoped = checks.filter((check) =>
    check.organizationId === session.organizationId &&
    check.congregationId === session.congregationId &&
    check.sessionId === session.id
  )
  const latestByPerson = new Map<string, PresenceCheck>()
  for (const check of scoped) {
    const current = latestByPerson.get(check.personId)
    if (!current || Date.parse(check.recordedAt) >= Date.parse(current.recordedAt)) {
      latestByPerson.set(check.personId, check)
    }
  }

  return [...latestByPerson.values()]
    .filter((check) => check.state === 'absent_confirmed')
    .map((check) => check.personId)
}

export function evaluateCarePromise(
  promise: CarePromise,
  now = new Date(),
  dueSoonWindowMs = 4 * 60 * 60 * 1000,
): CarePromiseEvaluation {
  assertRequired(promise.evidenceRef, 'evidence_ref')
  const dueAtMs = assertIsoDate(promise.dueAt, 'due_at')
  const nowMs = now.getTime()

  if (promise.resolvedAt) {
    assertRequired(promise.resolutionEvidenceRef, 'resolution_evidence_ref')
    assertIsoDate(promise.resolvedAt, 'resolved_at')
    return {
      state: 'resolved',
      overdueMs: 0,
      remainingMs: 0,
      evidenceRefs: [promise.evidenceRef, promise.resolutionEvidenceRef!],
    }
  }

  if (nowMs > dueAtMs) {
    return {
      state: 'debt',
      overdueMs: nowMs - dueAtMs,
      remainingMs: 0,
      evidenceRefs: [promise.evidenceRef],
    }
  }

  const remainingMs = dueAtMs - nowMs
  return {
    state: remainingMs <= Math.max(0, dueSoonWindowMs) ? 'due_soon' : 'open',
    overdueMs: 0,
    remainingMs,
    evidenceRefs: [promise.evidenceRef],
  }
}

export function createFactEvent(input: Omit<CanonicalFactEvent, 'sourceApp' | 'version'>): CanonicalFactEvent {
  assertRequired(input.eventId, 'event_id')
  assertRequired(input.organizationId, 'organization_id')
  assertRequired(input.subjectRef, 'subject_ref')
  assertRequired(input.scope, 'scope')
  assertRequired(input.evidenceRef, 'evidence_ref')
  assertIsoDate(input.occurredAt, 'occurred_at')
  assertIsoDate(input.recordedAt, 'recorded_at')

  return {
    ...input,
    sourceApp: 'nestjourney',
    version: 1,
    payload: { ...input.payload },
  }
}

export function presenceCheckToFact(check: PresenceCheck): CanonicalFactEvent | null {
  if (check.state === 'unverified') return null

  const eventType: CanonicalEventType = check.correctedFromCheckId
    ? 'PRESENCE_CORRECTED'
    : 'PRESENCE_CONFIRMED'

  return createFactEvent({
    eventId: `presence:${check.id}`,
    eventType,
    occurredAt: check.recordedAt,
    recordedAt: check.recordedAt,
    organizationId: check.organizationId,
    actorId: check.actorId,
    subjectRef: `person:${check.personId}`,
    scope: `congregation:${check.congregationId}`,
    evidenceRef: `presenceCheck:${check.id}`,
    sensitivity: 'confidential',
    payload: {
      sessionId: check.sessionId,
      state: check.state,
      source: check.source,
      ...(check.correctedFromCheckId ? { correctedFromCheckId: check.correctedFromCheckId } : {}),
    },
  })
}
