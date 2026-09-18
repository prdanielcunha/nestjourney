import { describe, expect, it } from 'vitest'
import { buildMyTodayItems } from './myToday'
import type { CareRequestRecord, JourneyDiscipleshipRecord, JourneyGroupRecord, JourneyPastoralHandoff, JourneyPersonRecord, PresenceSessionRecord } from './journeyRepository'

const people: JourneyPersonRecord[] = [{ id: 'p1', organizationId: 'org', congregationId: 'unit', name: 'Ana' }]
const care: CareRequestRecord[] = [
  { id: 'debt', organizationId: 'org', congregationId: 'unit', personId: 'p1', careType: 'first_contact', source: 'manual', status: 'open', requestedAt: '2026-09-01T10:00:00Z', requestedBy: 'u1', promiseHours: 24, dueAt: '2026-09-02T10:00:00Z', ownerRef: 'u1' },
  { id: 'future', organizationId: 'org', congregationId: 'unit', personId: 'p1', careType: 'prayer', source: 'manual', status: 'open', requestedAt: '2026-09-04T10:00:00Z', requestedBy: 'u2', promiseHours: 48, dueAt: '2026-09-06T10:00:00Z', ownerRef: 'u2' },
]
const groups: JourneyGroupRecord[] = [{ id: 'g1', organizationId: 'org', congregationId: 'unit', name: 'Casa Norte', participants: 9, capacity: 10 }]
const discipleships: JourneyDiscipleshipRecord[] = [{ id: 'd1', organizationId: 'org', congregationId: 'unit', personId: 'p1', disciplerId: 'u1', meeting: 2, status: 'active', nextMeeting: 'Agendar encontro 3' }]
const pastoralHandoffs: JourneyPastoralHandoff[] = [{ id:'ph1', organizationId:'org', congregationId:'unit', personId:'p1', sourceCareRequestId:'care-x', status:'open', requestedAt:'2026-09-05T09:00:00Z', requestedBy:'care' }]
const sessions: PresenceSessionRecord[] = [{ id: 's1', organizationId: 'org', congregationId: 'unit', eventRef: 'event:s1', eventName: 'Culto', openedAt: '2026-09-05T10:00:00Z', expectedPeopleCount: 10, minimumCoveragePercent: 90, status: 'open', createdBy: 'u1' }]

describe('My Today factual inbox', () => {
  it('prioritizes only source-backed operational items', () => {
    const items = buildMyTodayItems({ people, careRequests: care, groups, discipleships, sessions, pastoralHandoffs, actorId: 'u1', broadAccess: false, now: new Date('2026-09-05T10:00:00Z') })
    expect(items.map((item) => item.kind)).toEqual(['care_debt', 'pastoral_handoff', 'presence_open', 'group_attention', 'discipleship_next'])
    expect(items[0].personName).toBe('Ana')
  })

  it('does not surface another owner care item without broad access', () => {
    const items = buildMyTodayItems({ people, careRequests: care, groups: [], discipleships: [], sessions: [], pastoralHandoffs: [], actorId: 'u1', broadAccess: false, now: new Date('2026-09-05T10:00:00Z') })
    expect(items.some((item) => item.titleRef === 'future')).toBe(false)
  })
})
