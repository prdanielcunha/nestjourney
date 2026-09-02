import { describe, expect, it } from 'vitest'
import { canDeletePerson, canViewPastoral, nextStageAfterCare, scopePeople } from './domain'
import { implementationWeeks, seedGroups, seedPeople, seedTeam } from './seed'
import { canEnterCareFlow, groupCapacityStatus, teamLoadStatus } from './policies'

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

describe('limites pastorais e operacionais do roadmap', () => {
  it('mantém a implantação exatamente em sete semanas com prática real', () => {
    expect(implementationWeeks).toHaveLength(7)
    expect(implementationWeeks.every((week) => week.tasks.length > 0 && week.practice.length > 0)).toBe(true)
  })

  it('só coloca no cuidado quem consentiu e forneceu contato', () => {
    expect(canEnterCareFlow(seedPeople[0])).toBe(true)
    expect(canEnterCareFlow(seedPeople.find((person) => !person.consent)!)).toBe(false)
  })

  it('sinaliza Casas acima da faixa ideal e respeita o máximo de 12', () => {
    expect(seedGroups.every((group) => group.capacity <= 12)).toBe(true)
    expect(groupCapacityStatus({ ...seedGroups[0], participants: 11 })).toBe('attention')
    expect(groupCapacityStatus({ ...seedGroups[0], participants: 12 })).toBe('full')
  })

  it('sinaliza o limite de carga de cuidado e discipulado', () => {
    expect(teamLoadStatus(seedTeam.find((member) => member.role === 'care' && member.weeklyLoad === 10)!)).toBe('limit')
    expect(teamLoadStatus({ ...seedTeam.find((member) => member.role === 'discipler')!, weeklyLoad: 3 })).toBe('limit')
  })
})
