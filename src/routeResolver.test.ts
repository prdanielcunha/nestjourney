import { describe, expect, it } from 'vitest'
import { resolveJourneyRoute } from './routeResolver'

describe('NestJourney route resolver', () => {
  it('makes the factual overview the default entry point', () => {
    expect(resolveJourneyRoute('/')).toBe('overview')
    expect(resolveJourneyRoute('/unknown-route')).toBe('overview')
  })

  it('keeps the legacy Raiz e Mesa shell behind an explicit rollback route', () => {
    expect(resolveJourneyRoute('/legacy')).toBe('legacy')
    expect(resolveJourneyRoute('/legacy/')).toBe('legacy')
  })

  it('preserves every real runtime deep link', () => {
    expect(resolveJourneyRoute('/presence-assist')).toBe('presence')
    expect(resolveJourneyRoute('/care-integrity')).toBe('care')
    expect(resolveJourneyRoute('/journey-profile')).toBe('profile')
    expect(resolveJourneyRoute('/my-today')).toBe('today')
    expect(resolveJourneyRoute('/groups-runtime')).toBe('groups')
    expect(resolveJourneyRoute('/discipleship-runtime')).toBe('discipleship')
    expect(resolveJourneyRoute('/implementation-runtime')).toBe('implementation')
    expect(resolveJourneyRoute('/journey-overview')).toBe('overview')
  })
})
