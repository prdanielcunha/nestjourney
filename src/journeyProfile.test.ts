import { describe, expect, it } from 'vitest'
import { buildJourneyProfileSnapshot } from './journeyProfile'
import type { CareRequestRecord, JourneyDiscipleshipRecord, JourneyGroupRecord, JourneyPersonRecord } from './journeyRepository'

const person: JourneyPersonRecord = {
  id: 'p1', organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Um',
  consent: true, visits: 2, groupId: 'g1', firstVisit: '2026-09-01',
}

const groups: JourneyGroupRecord[] = [
  { id: 'g1', organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa Norte' },
  { id: 'g2', organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Um' },
]

const care: CareRequestRecord[] = [
  { id: 'c1', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', careType: 'first_contact', source: 'manual', status: 'open', requestedAt: '2026-09-01T10:00:00.000Z', requestedBy: 'u1', promiseHours: 48, dueAt: '2026-09-03T10:00:00.000Z', ownerRef: 'u1' },
  { id: 'c2', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', careType: 'prayer', source: 'manual', status: 'resolved', requestedAt: '2026-09-01T10:00:00.000Z', requestedBy: 'u1', promiseHours: 24, dueAt: '2026-09-02T10:00:00.000Z', resolvedAt: '2026-09-01T12:00:00.000Z' },
]

const discipleships: JourneyDiscipleshipRecord[] = [
  { id: 'd1', organizationId: 'org-a', congregationId: 'unit-a', personId: 'p1', disciplerId: 'u2', meeting: 3, status: 'active' },
]

describe('Journey Profile factual projection', () => {
  it('projects explicit group, discipleship and care facts without guessing', () => {
    const snapshot = buildJourneyProfileSnapshot({ person, careRequests: care, groups, discipleships, now: new Date('2026-09-04T10:00:00.000Z') })
    expect(snapshot.group?.id).toBe('g1')
    expect(snapshot.discipleship?.meeting).toBe(3)
    expect(snapshot.care).toMatchObject({ open: 1, debt: 1, resolved: 1, nextDueAt: '2026-09-03T10:00:00.000Z' })
  })

  it('does not infer a group or discipleship when the source link is absent', () => {
    const snapshot = buildJourneyProfileSnapshot({
      person: { ...person, id: 'p2', groupId: undefined },
      careRequests: [],
      groups,
      discipleships: [{ ...discipleships[0], personId: 'someone-else', personName: 'Pessoa Um' }],
      now: new Date('2026-09-04T10:00:00.000Z'),
    })
    expect(snapshot.group).toBeUndefined()
    expect(snapshot.discipleship).toBeUndefined()
    expect(snapshot.care.open).toBe(0)
  })
})
