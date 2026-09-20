import { describe, expect, it } from 'vitest'
import { buildTodayPrimaryAction } from './todayActionCenter'
import type { MyTodayItem } from './myToday'

describe('buildTodayPrimaryAction', () => {
  it('prioritizes the first factual item for broad roles', () => {
    const items: MyTodayItem[] = [
      { id: 'care:1', kind: 'care_debt', priority: 0, titleRef: 'care-1' },
      { id: 'pastoral:1', kind: 'pastoral_handoff', priority: 2, titleRef: 'handoff-1' },
    ]
    const action = buildTodayPrimaryAction({
      locale: 'pt-BR',
      responsibility: 'pastor',
      items,
      mesaPreparationPending: false,
      mesaPendingCount: 0,
    })
    expect(action.kind).toBe('care_debt')
    expect(action.href).toBe('/care-integrity')
    expect(action.urgent).toBe(true)
  })

  it('keeps Mesa preparation primary for Mesa responsibility', () => {
    const action = buildTodayPrimaryAction({
      locale: 'pt-BR',
      responsibility: 'mesa_team',
      items: [],
      mesaPreparationPending: true,
      mesaPendingCount: 0,
    })
    expect(action.kind).toBe('mesa_prepare')
    expect(action.href).toBe('/mesa-runtime')
  })

  it('gives leadership a concrete fallback instead of a dead empty state', () => {
    const action = buildTodayPrimaryAction({
      locale: 'pt-BR',
      responsibility: 'ceo',
      items: [],
      mesaPreparationPending: false,
      mesaPendingCount: 0,
    })
    expect(action.kind).toBe('role_home')
    expect(action.href).toBe('/vision')
    expect(action.title).toContain('Compare')
  })
})
