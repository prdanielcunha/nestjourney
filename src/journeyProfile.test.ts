import { describe, expect, it } from 'vitest'
import { buildJourneyProfileSnapshot } from './journeyProfile'
import type { CareRequestRecord, JourneyDiscipleshipRecord, JourneyGroupMembership, JourneyGroupRecord, JourneyPersonRecord } from './journeyRepository'

const person: JourneyPersonRecord = {
  id: 'p1', organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Um',
  consent: true, visits: 2, groupId: 'g1', firstVisit: '2026-09-01',
}

const groups: JourneyGroupRecord[] = [
  { id: 'g1', organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa Norte' },
  { id: 'g2', organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Um' },
]

const memberships: JourneyGroupMembership[] = [{ id:'g2__p1', organizationId:'org-a', congregationId:'unit-a', groupId:'g2', personId:'p1', personName:'Pessoa Um', status:'active', joinedAt:'2026-09-02T10:00:00Z', joinedBy:'leader' }]

const care: CareRequestRecord[] = [
  { id: 'c1', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', careType: 'first_contact', source: 'manual', status: 'open', requestedAt: '2026-09-01T10:00:00.000Z', requestedBy: 'u1', promiseHours: 48, dueAt: '2026-09-03T10:00:00.000Z', ownerRef: 'u1' },
  { id: 'c2', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', careType: 'prayer', source: 'manual', status: 'resolved', requestedAt: '2026-09-01T10:00:00.000Z', requestedBy: 'u1', promiseHours: 24, dueAt: '2026-09-02T10:00:00.000Z', resolvedAt: '2026-09-01T12:00:00.000Z' },
]

const discipleships: JourneyDiscipleshipRecord[] = [
  { id: 'd1', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', disciplerId: 'u2', meeting: 3, status: 'active' },
]

describe('Journey Profile factual projection', () => {
  it('projects explicit group, discipleship and care facts without guessing', () => {
    const snapshot = buildJourneyProfileSnapshot({ person, careRequests: care, groups, memberships, discipleships, now: new Date('2026-09-04T10:00:00.000Z') })
    expect(snapshot.groups.map((group) => group.id)).toEqual(['g2'])
    expect(snapshot.discipleship?.meeting).toBe(3)
    expect(snapshot.care).toMatchObject({ open: 1, debt: 1, resolved: 1, nextDueAt: '2026-09-03T10:00:00.000Z' })
  })

  it('does not infer a group or discipleship when the source link is absent', () => {
    const snapshot = buildJourneyProfileSnapshot({
      person: { ...person, id: 'p2', groupId: undefined },
      careRequests: [],
      groups,
      memberships: [],
      discipleships: [{ ...discipleships[0], personId: 'someone-else', personName: 'Pessoa Um' }],
      now: new Date('2026-09-04T10:00:00.000Z'),
    })
    expect(snapshot.groups).toEqual([])
    expect(snapshot.discipleship).toBeUndefined()
    expect(snapshot.care.open).toBe(0)
  })

  it('keeps the legacy explicit person.groupId only when no membership source exists', () => {
    const snapshot = buildJourneyProfileSnapshot({
      person,
      careRequests: [],
      groups,
      memberships: [],
      discipleships: [],
    })
    expect(snapshot.groups.map((group) => group.id)).toEqual(['g1'])
  })
})
