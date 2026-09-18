import { describe, expect, it } from 'vitest'
import { buildJourneyOverview } from './journeyOverview'
import { IMPLEMENTATION_PREPARATION_KEYS, implementationWeekKeys } from './implementationPlaybook'
import type {
  CareRequestRecord,
  JourneyDiscipleshipRecord,
  JourneyGroupRecord,
  JourneyImplementationCycle,
  JourneyPersonRecord,
  PresenceSessionRecord,
} from './journeyRepository'

describe('Journey Overview factual projection', () => {
  const people: JourneyPersonRecord[] = [{ id: 'p1', organizationId: 'o', congregationId: 'c', name: 'Ana' }]
  const careRequests: CareRequestRecord[] = [
    { id: 'c1', organizationId: 'o', congregationId: 'c', personId: 'p1', careType: 'first_contact', source: 'manual', status: 'open', requestedAt: '2026-09-01T00:00:00Z', requestedBy: 'u', promiseHours: 24, dueAt: '2026-09-02T00:00:00Z', ownerRef: 'u' },
  ]
  const sessions: PresenceSessionRecord[] = [{ id: 's1', organizationId: 'o', congregationId: 'c', eventRef: 'e', openedAt: '2026-09-03T00:00:00Z', expectedPeopleCount: 10, minimumCoveragePercent: 90, status: 'open', createdBy: 'u' }]
  const groups: JourneyGroupRecord[] = [{ id: 'g1', organizationId: 'o', congregationId: 'c', name: 'Casa', participants: 9, capacity: 10 }]
  const discipleships: JourneyDiscipleshipRecord[] = [{ id: 'd1', organizationId: 'o', congregationId: 'c', personId: 'p1', disciplerId: 'u', meeting: 2, status: 'active' }]
  const implementationCycles: JourneyImplementationCycle[] = [{
    id: 'i1', organizationId: 'o', congregationId: 'c', playbookId: 'raiz_e_mesa_2026',
    status: 'active', completedKeys: [...IMPLEMENTATION_PREPARATION_KEYS, ...implementationWeekKeys(1)],
    startedAt: '2026-09-01T00:00:00Z', createdBy: 'u',
  }]

  it('projects only available sources', () => {
    const snapshot = buildJourneyOverview({
      availability: { people: true, care: false, presence: true, groups: true, discipleship: false, implementation: true },
      people, careRequests, sessions, groups, discipleships, implementationCycles,
      now: new Date('2026-09-04T00:00:00Z'),
    })
    expect(snapshot.people?.count).toBe(1)
    expect(snapshot.care).toBeNull()
    expect(snapshot.presence?.openSessions).toBe(1)
    expect(snapshot.groups?.nearCapacity).toBe(1)
    expect(snapshot.discipleship).toBeNull()
    expect(snapshot.implementation?.week).toBe(2)
    expect(snapshot.implementation?.percent).toBeGreaterThan(0)
  })

  it('does not turn a restricted source into a zero metric', () => {
    const snapshot = buildJourneyOverview({
      availability: { people: false, care: false, presence: false, groups: false, discipleship: false, implementation: false },
      people: [], careRequests: [], sessions: [], groups: [], discipleships: [], implementationCycles: [],
    })
    expect(snapshot).toEqual({ people: null, care: null, presence: null, groups: null, discipleship: null, implementation: null })
  })
})
