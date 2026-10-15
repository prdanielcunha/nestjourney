import { calculatePresenceCoverage, type PresenceCheck, type PresenceSession } from './intelligence'

export interface VerifiedFrequency {
  eventTypeId: string
  personId: string
  eligibleClosedSessions: number
  verifiedSessions: number
  confirmedPresent: number
  confirmedAbsent: number
  unverifiedSessions: number
  lowCoverageSessions: number
  legacyWithoutEligibility: number
  ratePercent: number | null
  evidenceSessionIds: string[]
}

/**
 * Uses ONLY explicit eligibility snapshots, checked person states and closed sessions.
 * Unknown never becomes absence, even if the session as a whole passes 90% coverage.
 * The denominator is confirmed present + confirmed absent, not every scheduled service.
 */
export function calculateVerifiedFrequency(input: {
  organizationId: string
  personId: string
  eventTypeId: string
  sessions: PresenceSession[]
  checks: PresenceCheck[]
}): VerifiedFrequency {
  const result: VerifiedFrequency = {
    eventTypeId: input.eventTypeId, personId: input.personId, eligibleClosedSessions: 0,
    verifiedSessions: 0, confirmedPresent: 0, confirmedAbsent: 0,
    unverifiedSessions: 0, lowCoverageSessions: 0, legacyWithoutEligibility: 0,
    ratePercent: null, evidenceSessionIds: [],
  }
  const seen = new Set<string>()
  for (const session of input.sessions) {
    if (session.organizationId !== input.organizationId || seen.has(session.id)) continue
    seen.add(session.id)
    // Never mix a special youth gathering with a regular Sunday service.
    if ((session.eventTypeId || 'general') !== input.eventTypeId) continue
    if (!session.closedAt) continue
    if (session.eligibilityVersion !== 1 || !Array.isArray(session.eligiblePersonIds)) {
      result.legacyWithoutEligibility++
      continue
    }
    const eligible = new Set(session.eligiblePersonIds)
    if (!eligible.has(input.personId)) continue
    result.eligibleClosedSessions++
    const scopeChecks = input.checks.filter(check =>
      check.organizationId === input.organizationId
      && check.congregationId === session.congregationId
      && check.sessionId === session.id
      && check.personId === input.personId)
    const latest = scopeChecks.sort((a,b) => a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id)).at(-1)
    if (!calculatePresenceCoverage(session, input.checks).meetsMinimum) {
      result.lowCoverageSessions++
      continue
    }
    if (!latest || latest.state === 'unverified') {
      result.unverifiedSessions++
      continue
    }
    result.verifiedSessions++
    result.evidenceSessionIds.push(session.id)
    if (latest.state === 'present_confirmed') result.confirmedPresent++
    else result.confirmedAbsent++
  }
  result.ratePercent = result.verifiedSessions
    ? Math.round((result.confirmedPresent / result.verifiedSessions) * 10000) / 100
    : null
  return result
}
