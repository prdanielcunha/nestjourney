import { evaluateCarePromise } from './intelligence'
import { careRequestToPromise, type CareRequestRecord, type JourneyDiscipleshipRecord, type JourneyGroupMembership, type JourneyGroupRecord, type JourneyPersonRecord } from './journeyRepository'

export interface JourneyProfileSnapshot {
  person: JourneyPersonRecord
  care: {
    open: number
    debt: number
    resolved: number
    nextDueAt?: string
  }
  groups: JourneyGroupRecord[]
  discipleship?: JourneyDiscipleshipRecord
}

export function buildJourneyProfileSnapshot(input: {
  person: JourneyPersonRecord
  careRequests: CareRequestRecord[]
  groups: JourneyGroupRecord[]
  memberships: JourneyGroupMembership[]
  discipleships: JourneyDiscipleshipRecord[]
  now?: Date
}): JourneyProfileSnapshot {
  const care = input.careRequests.filter((item) => item.personId === input.person.id)
  const evaluated = care.map((item) => ({ item, evaluation: evaluateCarePromise(careRequestToPromise(item), input.now) }))
  const open = evaluated.filter(({ item }) => item.status === 'open').length
  const debt = evaluated.filter(({ evaluation }) => evaluation.state === 'debt').length
  const resolved = evaluated.filter(({ item }) => item.status === 'resolved').length
  const nextDueAt = evaluated
    .filter(({ item }) => item.status === 'open')
    .map(({ item }) => item.dueAt)
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0]

  const explicitGroupIds = input.memberships
    .filter((item) => item.personId === input.person.id && item.status === 'active')
    .map((item) => item.groupId)
  const groupIds = explicitGroupIds.length
    ? explicitGroupIds
    : input.person.groupId
      ? [input.person.groupId]
      : []
  const groups = [...new Set(groupIds)]
    .map((groupId) => input.groups.find((item) => item.id === groupId))
    .filter((item): item is JourneyGroupRecord => Boolean(item))

  const discipleship = input.discipleships
    .filter((item) => item.personId === input.person.id)
    .sort((a, b) => {
      const weight = (status: JourneyDiscipleshipRecord['status']) => status === 'active' ? 0 : status === 'paused' ? 1 : 2
      return weight(a.status) - weight(b.status) || b.meeting - a.meeting
    })[0]

  return { person: input.person, care: { open, debt, resolved, nextDueAt }, groups, discipleship }
}
