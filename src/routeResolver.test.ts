import { describe, expect, it } from 'vitest'
import { resolveJourneyRoute } from './routeResolver'

describe('NestJourney route resolver', () => {
  it('makes the factual overview the default entry point', () => {
    expect(resolveJourneyRoute('/')).toBe('overview')
    expect(resolveJourneyRoute('/unknown-route')).toBe('overview')
  })

  it('does not expose the retired legacy shell', () => {
    expect(resolveJourneyRoute('/legacy')).toBe('overview')
    expect(resolveJourneyRoute('/legacy/')).toBe('overview')
  })

  it('preserves every real runtime deep link', () => {
    expect(resolveJourneyRoute('/presence-assist')).toBe('presence')
    expect(resolveJourneyRoute('/care-integrity')).toBe('care')
    expect(resolveJourneyRoute('/followup-runtime')).toBe('followup')
    expect(resolveJourneyRoute('/journey-profile')).toBe('profile')
    expect(resolveJourneyRoute('/')).toBe('today')
    expect(resolveJourneyRoute('/my-today')).toBe('today')
    expect(resolveJourneyRoute('/areas')).toBe('areas')
    expect(resolveJourneyRoute('/mesa-runtime')).toBe('mesa')
    expect(resolveJourneyRoute('/vision')).toBe('vision')
    expect(resolveJourneyRoute('/more')).toBe('more')
    expect(resolveJourneyRoute('/reports')).toBe('reports')
    expect(resolveJourneyRoute('/help')).toBe('help')
    expect(resolveJourneyRoute('/groups-runtime')).toBe('groups')
    expect(resolveJourneyRoute('/discipleship-runtime')).toBe('discipleship')
    expect(resolveJourneyRoute('/implementation-runtime')).toBe('implementation')
    expect(resolveJourneyRoute('/team-runtime')).toBe('team')
    expect(resolveJourneyRoute('/settings-runtime')).toBe('settings')
    expect(resolveJourneyRoute('/governance-runtime')).toBe('governance')
    expect(resolveJourneyRoute('/pastoral-handoff')).toBe('pastoral')
    expect(resolveJourneyRoute('/journey-overview')).toBe('overview')
  })
})
