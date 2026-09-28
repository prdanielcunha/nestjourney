import { describe, expect, it } from 'vitest'
import {
  RAIZ_E_MESA_GROUP_CAPACITY,
  buildContinuityCohorts,
  evaluateAuthorizedContact,
  groupCapacityState,
  implementationExpectedWeek,
  normalizeGroupCapacity,
} from './roadmapReadiness'

describe('Raiz e Mesa roadmap readiness', () => {
  it('never creates an actionable contact without consent, valid phone and explicit channel', () => {
    expect(evaluateAuthorizedContact({ consent: false })).toEqual({ ok: true, phoneDigits: '' })
    expect(evaluateAuthorizedContact({ consent: true, phone: '123', preferredContactChannel: 'whatsapp' }).ok).toBe(false)
    expect(evaluateAuthorizedContact({ consent: true, phone: '(43) 99999-9999' }).ok).toBe(false)
    expect(evaluateAuthorizedContact({ consent: true, phone: '(43) 99999-9999', preferredContactChannel: 'whatsapp' })).toMatchObject({
      ok: true,
      phoneDigits: '43999999999',
      preferredContactChannel: 'whatsapp',
    })
  })

  it('enforces the local Casa de Paz policy while preserving the 6-10 ideal range', () => {
    expect(RAIZ_E_MESA_GROUP_CAPACITY).toEqual({ minimum: 4, idealMin: 6, idealMax: 10, maximum: 12 })
    expect(normalizeGroupCapacity(2)).toBe(4)
    expect(normalizeGroupCapacity(20)).toBe(12)
    expect(groupCapacityState(5, 12)).toBe('forming')
    expect(groupCapacityState(8, 12)).toBe('healthy')
    expect(groupCapacityState(11, 12)).toBe('attention')
  })


  it('simulates Houses at forming, healthy and attention states without inventing production records', () => {
    const groups = [
      { name: 'Casa Simulada A', participants: 4, capacity: 12 },
      { name: 'Casa Simulada B', participants: 8, capacity: 12 },
      { name: 'Casa Simulada C', participants: 11, capacity: 12 },
    ]
    expect(groups.map(group => groupCapacityState(group.participants, group.capacity))).toEqual([
      'forming',
      'healthy',
      'attention',
    ])
  })

  it('moves the seven-week implementation clock without scoring people', () => {
    const start = Date.parse('2026-09-01T00:00:00Z')
    expect(implementationExpectedWeek(new Date(start).toISOString(), start)).toBe(1)
    expect(implementationExpectedWeek(new Date(start).toISOString(), start + 15 * 86400000)).toBe(3)
    expect(implementationExpectedWeek(new Date(start).toISOString(), start + 90 * 86400000)).toBe(7)
  })

  it('builds factual 30/60/90 continuity cohorts from simulated people only', () => {
    const now = Date.parse('2026-09-28T12:00:00Z')
    const people = [
      { id: 'p1', firstVisit: '2026-06-01', visits: 3 },
      { id: 'p2', firstVisit: '2026-07-20', visits: 1, groupId: 'g1' },
      { id: 'p3', firstVisit: '2026-08-15', visits: 1 },
      { id: 'p4', firstVisit: '2026-09-20', visits: 2 },
      { id: 'p5', firstVisit: '2026-05-01', visits: 1 },
      { id: 'p6', firstVisit: '2026-06-15', visits: 1 },
      { id: 'p7', firstVisit: '2026-08-01', visits: 1 },
      { id: 'p8', firstVisit: '2026-04-01', visits: 1 },
    ]
    const cohorts = buildContinuityCohorts({
      people,
      activeDiscipleshipPersonIds: new Set(['p5','p7']),
      now,
    })
    expect(cohorts.map(item => item.days)).toEqual([30,60,90])
    expect(cohorts[0].eligible).toBeGreaterThanOrEqual(6)
    expect(cohorts[0].continued).toBeGreaterThanOrEqual(4)
    expect(cohorts[2].eligible).toBeGreaterThanOrEqual(3)
  })
})
