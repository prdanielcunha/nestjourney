import { describe, expect, it } from 'vitest'
import { calculateVerifiedFrequency } from './verifiedFrequency'
import { calculatePresenceCoverage, type PresenceSession, type PresenceCheck } from './intelligence'

const iso = (n: number) => `2026-10-11T10:${String(n).padStart(2,'0')}:00.000Z`
function session(id: string, options: Partial<PresenceSession> = {}): PresenceSession {
  return {
    id, organizationId: 'org-a', congregationId: 'unit-a', eventRef: 'event:'+id,
    openedAt: iso(0), closedAt: iso(30), expectedPeopleCount: 2, minimumCoveragePercent: 90,
    eligibilityVersion: 1, eligiblePersonIds: ['p1','p2'], eventTypeId: 'sunday', ...options,
  }
}
function check(sessionId: string, personId: string, state: PresenceCheck['state'], n: number): PresenceCheck {
  return {
    id: sessionId+'-'+personId+'-'+n, organizationId: 'org-a', congregationId: 'unit-a',
    sessionId, personId, state, source: 'human_check', actorId: 'vol-a', recordedAt: iso(n),
  }
}
describe('Verified frequency — explicit eligible denominator', () => {
  it('does not let visitor checks outside a frozen roster inflate coverage', () => {
    const checks = [check('s1','p1','present_confirmed',10),check('s1','visitor','present_confirmed',11)]
    expect(calculatePresenceCoverage(session('s1'),checks)).toEqual({
      expected: 2,verified: 1,unverified: 1,percent: 50,meetsMinimum: false,
    })
  })
  it('keeps unverified individual sessions out of the attendance denominator', () => {
    const sessions = [session('s1'),session('s2',{minimumCoveragePercent:50})]
    const checks = [
      check('s1','p1','present_confirmed',10),check('s1','p2','absent_confirmed',11),
      check('s2','p1','unverified',12),check('s2','p2','present_confirmed',13),
    ]
    const result=calculateVerifiedFrequency({organizationId:'org-a',personId:'p1',eventTypeId:'sunday',sessions,checks})
    expect(result.confirmedPresent).toBe(1)
    expect(result.confirmedAbsent).toBe(0)
    expect(result.verifiedSessions).toBe(1)
    expect(result.eligibleClosedSessions).toBe(2)
    expect(result.unverifiedSessions).toBe(1)
    expect(result.ratePercent).toBe(100)
  })
  it('refuses low quality and legacy sessions and never mixes special services', () => {
    const sessions=[
      session('low'),
      session('old',{eligiblePersonIds:undefined,eligibilityVersion:undefined}),
      session('youth',{eventTypeId:'youth'}),
      session('confirmed'),
    ]
    const checks=[
      check('low','p1','absent_confirmed',3),
      check('youth','p1','present_confirmed',2),check('youth','p2','present_confirmed',4),
      check('confirmed','p1','absent_confirmed',5),check('confirmed','p2','present_confirmed',6),
    ]
    const result=calculateVerifiedFrequency({organizationId:'org-a',personId:'p1',eventTypeId:'sunday',sessions,checks})
    expect(result.ratePercent).toBe(0)
    expect(result.lowCoverageSessions).toBe(1)
    expect(result.legacyWithoutEligibility).toBe(1)
    expect(result.evidenceSessionIds).toEqual(['confirmed'])
  })
  it('correcting a checked absence to unverified never becomes an absence', () => {
    const checks=[
      check('s1','p1','absent_confirmed',1),check('s1','p2','present_confirmed',2),
      {...check('s1','p1','unverified',15),correctedFromCheckId:'s1-p1-1',source:'retroactive_human_correction' as const},
    ]
    expect(calculateVerifiedFrequency({organizationId:'org-a',personId:'p1',eventTypeId:'sunday',sessions:[session('s1')],checks}).ratePercent).toBeNull()
  })
})
