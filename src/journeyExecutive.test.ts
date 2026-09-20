import { describe, expect, it } from 'vitest'
import { buildJourneyUnitPulse } from './journeyExecutive'

describe('buildJourneyUnitPulse', () => {
  const unit = { id: 'unit-a', name: 'Unidade A', city: 'Cambé' }

  it('surfaces care debt as attention', () => {
    const pulse = buildJourneyUnitPulse({
      unit,
      people: [],
      care: [{
        id: 'care-1', organizationId: 'org', congregationId: 'unit-a', personId: 'p1',
        careType: 'first_contact', source: 'manual', status: 'open', requestedAt: '2026-09-18T10:00:00.000Z',
        requestedBy: 'u1', promiseHours: 24, dueAt: '2026-09-19T10:00:00.000Z',
      }],
      sessions: [], groups: [], discipleships: [], pastoral: [],
      now: new Date('2026-09-20T10:00:00.000Z'),
    })
    expect(pulse.careDebt).toBe(1)
    expect(pulse.level).toBe('attention')
  })

  it('keeps a quiet unit clear', () => {
    const pulse = buildJourneyUnitPulse({
      unit, people: [], care: [], sessions: [], groups: [], discipleships: [], pastoral: [],
    })
    expect(pulse.level).toBe('clear')
  })
})
