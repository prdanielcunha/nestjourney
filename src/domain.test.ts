import { describe, expect, it } from 'vitest'
import { canDeletePerson, canViewPastoral, nextStageAfterCare, scopePeople } from './domain'
import { seedPeople } from './seed'

describe('isolamento multi-tenant e permissões', () => {
  it('nunca retorna pessoas de outra organização', () => {
    const intruder = { ...seedPeople[0], id: 'other', organizationId: 'org-other' }
    expect(scopePeople([...seedPeople, intruder], 'org-obpc-family', [], 'pastor')).toHaveLength(seedPeople.length)
  })

  it('limita funções operacionais às unidades atribuídas', () => {
    const scoped = scopePeople(seedPeople, 'org-obpc-family', ['cong-industrial'], 'care')
    expect(scoped.every((person) => person.congregationId === 'cong-industrial')).toBe(true)
  })

  it('reserva dados pastorais a owner e pastor', () => {
    expect(canViewPastoral('pastor')).toBe(true)
    expect(canViewPastoral('care')).toBe(false)
    expect(canViewPastoral('data_admin')).toBe(false)
  })

  it('reserva exclusão a owner e administrador de dados', () => {
    expect(canDeletePerson('owner')).toBe(true)
    expect(canDeletePerson('data_admin')).toBe(true)
    expect(canDeletePerson('pastor')).toBe(false)
  })

  it('não avança contato sem consentimento', () => {
    const noConsent = seedPeople.find((person) => !person.consent)!
    expect(nextStageAfterCare(noConsent).stage).toBe('new')
  })
})
