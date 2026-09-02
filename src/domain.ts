import type { Person, Role } from './types'

export function scopePeople(people: Person[], organizationId: string, congregationIds: string[], role: Role) {
  const organizationPeople = people.filter((person) => person.organizationId === organizationId)
  if (['owner', 'pastor', 'data_admin'].includes(role)) return organizationPeople
  return organizationPeople.filter((person) => congregationIds.includes(person.congregationId))
}

export function canViewPastoral(role: Role) {
  return role === 'owner' || role === 'pastor'
}

export function canDeletePerson(role: Role) {
  return role === 'owner' || role === 'data_admin'
}

export function nextStageAfterCare(person: Person): Person {
  if (!person.consent) return person
  return { ...person, stage: 'care_done', dueLabel: 'Em até 7 dias' }
}
