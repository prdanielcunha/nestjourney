import { describe, expect, it } from 'vitest'
import { IMPLEMENTATION_PREPARATION_KEYS, IMPLEMENTATION_REQUIRED_KEYS, implementationPlaybooks, implementationProgress, implementationWeekForProgress, implementationWeekKeys } from './implementationPlaybook'

describe('Raiz e Mesa 7-week implementation playbook', () => {
  it('keeps seven weeks and one canonical operational key set', () => {
    expect(implementationPlaybooks['pt-BR'].weeks).toHaveLength(7)
    expect(implementationPlaybooks.en.weeks).toHaveLength(7)
    expect(implementationPlaybooks.es.weeks).toHaveLength(7)
    expect(IMPLEMENTATION_REQUIRED_KEYS).toHaveLength(46)
    expect(new Set(IMPLEMENTATION_REQUIRED_KEYS).size).toBe(46)
  })

  it('derives progress only from recorded canonical keys', () => {
    expect(implementationProgress([])).toEqual({ done: 0, total: 46, percent: 0 })
    expect(implementationWeekForProgress(implementationWeekKeys(1))).toBe(1)
    const afterPrepAndWeek1 = [...IMPLEMENTATION_PREPARATION_KEYS, ...implementationWeekKeys(1)]
    expect(implementationWeekForProgress(afterPrepAndWeek1)).toBe(2)
    expect(implementationProgress(IMPLEMENTATION_REQUIRED_KEYS).percent).toBe(100)
  })

  it('preserves progressive rollout anchors from the source playbook', () => {
    const pt = implementationPlaybooks['pt-BR']
    expect(pt.weeks[1].title).toBe('Presença e Mesa Aberta')
    expect(pt.weeks[2].objective).toContain('24-48 horas')
    expect(pt.weeks[3].teaching[0]).toContain('6-10, máximo 12')
    expect(pt.weeks[4].practice).toContain('não forçar')
    expect(pt.weeks[6].practice).toContain('30/60/90')
  })
})
