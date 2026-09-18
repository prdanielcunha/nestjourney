import { evaluateCarePromise } from './intelligence'
import { careRequestToPromise, type CareRequestRecord, type JourneyDiscipleshipRecord, type JourneyGroupRecord, type JourneyPersonRecord, type PresenceSessionRecord } from './journeyRepository'

export type MyTodayKind = 'care_debt' | 'care_due_soon' | 'care_unassigned' | 'presence_open' | 'group_attention' | 'discipleship_next'

export interface MyTodayItem {
  id: string
  kind: MyTodayKind
  priority: number
  personId?: string
  personName?: string
  titleRef: string
  detailRef?: string
  dueAt?: string
  targetId?: string
  ratio?: number
  meeting?: number
}

export function buildMyTodayItems(input: {
  people: JourneyPersonRecord[]
  careRequests: CareRequestRecord[]
  groups: JourneyGroupRecord[]
  discipleships: JourneyDiscipleshipRecord[]
  sessions: PresenceSessionRecord[]
  actorId: string
  broadAccess: boolean
  now?: Date
}): MyTodayItem[] {
  const people = new Map(input.people.map((person) => [person.id, person]))
  const items: MyTodayItem[] = []

  for (const request of input.careRequests) {
    if (request.status !== 'open') continue
    const belongsToLens = input.broadAccess || request.ownerRef === input.actorId || !request.ownerRef
    if (!belongsToLens) continue
    const person = people.get(request.personId)
    const evaluation = evaluateCarePromise(careRequestToPromise(request), input.now)
    if (evaluation.state === 'debt') {
      items.push({ id: `care-debt:${request.id}`, kind: 'care_debt', priority: 0, personId: request.personId, personName: person?.name, titleRef: request.id, dueAt: request.dueAt })
    } else if (evaluation.state === 'due_soon') {
      items.push({ id: `care-due:${request.id}`, kind: 'care_due_soon', priority: 1, personId: request.personId, personName: person?.name, titleRef: request.id, dueAt: request.dueAt })
    } else if (!request.ownerRef) {
      items.push({ id: `care-owner:${request.id}`, kind: 'care_unassigned', priority: 2, personId: request.personId, personName: person?.name, titleRef: request.id, dueAt: request.dueAt })
    }
  }

  for (const session of input.sessions.filter((item) => item.status === 'open')) {
    items.push({ id: `presence:${session.id}`, kind: 'presence_open', priority: 2, titleRef: session.eventName || session.eventRef, targetId: session.id })
  }

  for (const group of input.groups) {
    const capacity = group.capacity ?? 0
    const participants = group.participants ?? 0
    if (capacity <= 0) continue
    const ratio = participants / capacity
    if (ratio >= 0.85) items.push({ id: `group:${group.id}`, kind: 'group_attention', priority: 3, titleRef: group.name, targetId: group.id, ratio })
  }

  for (const relation of input.discipleships) {
    if (relation.status !== 'active' || !relation.nextMeeting) continue
    const person = people.get(relation.personId)
    items.push({
      id: `discipleship:${relation.id}`, kind: 'discipleship_next', priority: 4,
      personId: relation.personId, personName: person?.name || relation.personName,
      titleRef: relation.nextMeeting, targetId: relation.id, meeting: relation.meeting,
    })
  }

  return items.sort((a, b) => a.priority - b.priority || (a.dueAt && b.dueAt ? Date.parse(a.dueAt) - Date.parse(b.dueAt) : a.id.localeCompare(b.id)))
}
