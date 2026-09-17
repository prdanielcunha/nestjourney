import { describe, expect, it } from 'vitest'
import { normalizeLocale } from './i18n'
import { latestChecksByPerson } from './journeyRepository'
import { journeyCollectionPath, journeyProductPath, NESTJOURNEY_PRODUCT_ID, NESTJOURNEY_STORAGE_KEY } from './productIdentity'
import type { PresenceCheck } from './intelligence'

describe('NestJourney compatibility identity', () => {
  it('uses NestJourney as product identity while preserving the legacy storage namespace', () => {
    expect(NESTJOURNEY_PRODUCT_ID).toBe('nestjourney')
    expect(NESTJOURNEY_STORAGE_KEY).toBe('raiz_e_mesa')
    expect(journeyProductPath('org-a')).toBe('organizations/org-a/products/raiz_e_mesa')
    expect(journeyCollectionPath('org-a', 'presenceSessions')).toBe('organizations/org-a/products/raiz_e_mesa/presenceSessions')
  })
})

describe('new feature i18n baseline', () => {
  it('normalizes the three supported language families', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR')
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('es-AR')).toBe('es')
  })
})

describe('Presence correction projection', () => {
  it('uses the most recently recorded check without deleting history', () => {
    const checks: PresenceCheck[] = [
      { id: 'a', organizationId: 'org-a', congregationId: 'unit-a', sessionId: 's1', personId: 'p1', state: 'absent_confirmed', source: 'human_check', actorId: 'u1', recordedAt: '2026-09-17T10:00:00.000Z' },
      { id: 'b', organizationId: 'org-a', congregationId: 'unit-a', sessionId: 's1', personId: 'p1', state: 'present_confirmed', source: 'retroactive_human_correction', actorId: 'u2', recordedAt: '2026-09-17T11:00:00.000Z', correctedFromCheckId: 'a' },
    ]
    expect(latestChecksByPerson(checks).get('p1')?.id).toBe('b')
  })
})
