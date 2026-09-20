import { describe, expect, it } from 'vitest'
import {
  calculatePresenceCoverage,
  canUseAbsenceEvidence,
  confirmedAbsencePersonIds,
  createFactEvent,
  evaluateCarePromise,
  presenceCheckToFact,
  type CarePromise,
  type PresenceCheck,
  type PresenceSession,
} from './intelligence'

const session: PresenceSession = {
  id: 'session-1',
  organizationId: 'org-1',
  congregationId: 'cong-1',
  eventRef: 'event:sunday-2026-09-20',
  openedAt: '2026-09-20T11:00:00.000Z',
  closedAt: '2026-09-20T13:00:00.000Z',
  expectedPeopleCount: 4,
  minimumCoveragePercent: 90,
}

const checks: PresenceCheck[] = [
  {
    id: 'check-1', organizationId: 'org-1', congregationId: 'cong-1', sessionId: 'session-1',
    personId: 'p1', state: 'present_confirmed', source: 'human_check', actorId: 'u1',
    recordedAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 'check-2', organizationId: 'org-1', congregationId: 'cong-1', sessionId: 'session-1',
    personId: 'p2', state: 'unverified', source: 'human_check', actorId: 'u1',
    recordedAt: '2026-09-20T12:01:00.000Z',
  },
  {
    id: 'check-3', organizationId: 'org-1', congregationId: 'cong-1', sessionId: 'session-1',
    personId: 'p3', state: 'absent_confirmed', source: 'human_check', actorId: 'u1',
    recordedAt: '2026-09-20T12:02:00.000Z',
  },
]

describe('Presence Assist — qualidade e evidência', () => {
  it('não trata não verificado como ausência', () => {
    const coverage = calculatePresenceCoverage(session, checks)
    expect(coverage).toEqual({ expected: 4, verified: 2, unverified: 2, percent: 50, meetsMinimum: false })
    expect(canUseAbsenceEvidence(session, checks)).toBe(false)
    expect(confirmedAbsencePersonIds(session, checks)).toEqual([])
  })

  it('só libera ausência confirmada quando a sessão fechou e atingiu cobertura mínima', () => {
    const highCoverageChecks: PresenceCheck[] = [
      ...checks.filter((check) => check.id !== 'check-2'),
      { ...checks[1], id: 'check-4', state: 'present_confirmed', recordedAt: '2026-09-20T12:03:00.000Z' },
      {
        id: 'check-5', organizationId: 'org-1', congregationId: 'cong-1', sessionId: 'session-1',
        personId: 'p4', state: 'present_confirmed', source: 'human_check', actorId: 'u1',
        recordedAt: '2026-09-20T12:04:00.000Z',
      },
    ]

    expect(calculatePresenceCoverage(session, highCoverageChecks).percent).toBe(100)
    expect(canUseAbsenceEvidence(session, highCoverageChecks)).toBe(true)
    expect(confirmedAbsencePersonIds(session, highCoverageChecks)).toEqual(['p3'])
  })

  it('não emite fato para estado não verificado', () => {
    expect(presenceCheckToFact(checks[1])).toBeNull()
  })

  it('emite fato canônico com tenant, actor, source e evidenceRef', () => {
    const fact = presenceCheckToFact(checks[0])!
    expect(fact.eventType).toBe('PRESENCE_CONFIRMED')
    expect(fact.organizationId).toBe('org-1')
    expect(fact.actorId).toBe('u1')
    expect(fact.sourceApp).toBe('nestjourney')
    expect(fact.evidenceRef).toBe('presenceCheck:check-1')
    expect(fact.version).toBe(1)
  })

  it('preserva a origem da correção e emite PRESENCE_CORRECTED', () => {
    const corrected: PresenceCheck = {
      ...checks[0],
      id: 'check-corrected',
      state: 'absent_confirmed',
      source: 'retroactive_human_correction',
      correctedFromCheckId: 'check-1',
      recordedAt: '2026-09-20T12:05:00.000Z',
    }
    const fact = presenceCheckToFact(corrected)!
    expect(fact.eventType).toBe('PRESENCE_CORRECTED')
    expect(fact.payload.source).toBe('retroactive_human_correction')
    expect(fact.payload.correctedFromCheckId).toBe('check-1')
    expect(fact.payload.state).toBe('absent_confirmed')
  })
})

describe('Care Integrity — promessa antes de interpretação', () => {
  const promise: CarePromise = {
    id: 'promise-1',
    organizationId: 'org-1',
    subjectRef: 'person:p1',
    careType: 'first_contact',
    createdAt: '2026-09-20T10:00:00.000Z',
    dueAt: '2026-09-22T10:00:00.000Z',
    ownerRef: 'queue:care',
    evidenceRef: 'visitor:p1',
  }

  it('abre Care Debt somente depois do prazo factual', () => {
    expect(evaluateCarePromise(promise, new Date('2026-09-21T10:00:00.000Z')).state).toBe('open')
    expect(evaluateCarePromise(promise, new Date('2026-09-22T08:00:00.000Z')).state).toBe('due_soon')
    expect(evaluateCarePromise(promise, new Date('2026-09-22T10:00:01.000Z')).state).toBe('debt')
  })

  it('exige evidência de resolução para marcar como resolvida', () => {
    expect(() => evaluateCarePromise({ ...promise, resolvedAt: '2026-09-21T11:00:00.000Z' })).toThrow('missing_resolution_evidence_ref')
    expect(evaluateCarePromise({
      ...promise,
      resolvedAt: '2026-09-21T11:00:00.000Z',
      resolutionEvidenceRef: 'followup:completed-1',
    }).state).toBe('resolved')
  })
})

describe('Unified Fact Stream — NO SOURCE → NO CLAIM', () => {
  it('recusa fatos sem evidenceRef', () => {
    expect(() => createFactEvent({
      eventId: 'event-1',
      eventType: 'CARE_DEBT_OPENED',
      occurredAt: '2026-09-22T10:00:01.000Z',
      recordedAt: '2026-09-22T10:00:01.000Z',
      organizationId: 'org-1',
      subjectRef: 'person:p1',
      scope: 'congregation:cong-1',
      evidenceRef: '',
      sensitivity: 'confidential',
      payload: {},
    })).toThrow('missing_evidence_ref')
  })
})
