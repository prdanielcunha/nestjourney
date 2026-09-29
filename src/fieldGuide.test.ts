import { describe, expect, it } from 'vitest'
import { endOfFieldWeek, isInsideFieldWeek, resolveFieldGuideUnitProfile, startOfFieldWeek } from './fieldGuide'

describe('field guide unit profiles', () => {
  it('resolves the two Raiz e Mesa pilot churches without coupling to ids', () => {
    expect(resolveFieldGuideUnitProfile('OBPC Monte Castelo', 'Cambé')).toBe('cambe')
    expect(resolveFieldGuideUnitProfile('OBPC Industrial', 'Londrina')).toBe('londrina')
    expect(resolveFieldGuideUnitProfile('Outra igreja', 'Curitiba')).toBe('generic')
  })

  it('normalizes accents and names', () => {
    expect(resolveFieldGuideUnitProfile('Monte Castelo', 'Cambé')).toBe('cambe')
  })
})

describe('field guide weekly window', () => {
  const reference = new Date('2026-09-29T12:00:00-03:00')

  it('uses Monday as the beginning and next Monday as the end', () => {
    const start = startOfFieldWeek(reference)
    const end = endOfFieldWeek(reference)
    expect(start.getDay()).toBe(1)
    expect(end.getDay()).toBe(1)
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('classifies factual records inside the active week', () => {
    expect(isInsideFieldWeek('2026-09-29T12:00:00-03:00', reference)).toBe(true)
    expect(isInsideFieldWeek('2026-09-21T12:00:00-03:00', reference)).toBe(false)
    expect(isInsideFieldWeek(undefined, reference)).toBe(false)
  })
})
