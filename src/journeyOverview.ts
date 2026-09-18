import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  type CareRequestRecord,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyImplementationCycle,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { implementationProgress, implementationWeekForProgress } from './implementationPlaybook'

export interface JourneyOverviewAvailability {
  people: boolean
  care: boolean
  presence: boolean
  groups: boolean
  discipleship: boolean
  implementation: boolean
}

export interface JourneyOverviewSnapshot {
  people: { count: number } | null
  care: { open: number; debt: number; dueSoon: number; unassigned: number } | null
  presence: { openSessions: number } | null
  groups: { count: number; nearCapacity: number } | null
  discipleship: { active: number; paused: number; completed: number } | null
  implementation: { status: 'active' | 'completed'; percent: number; week: number } | null
}

export function buildJourneyOverview(input: {
  availability: JourneyOverviewAvailability
  people: JourneyPersonRecord[]
  careRequests: CareRequestRecord[]
  sessions: PresenceSessionRecord[]
  groups: JourneyGroupRecord[]
  discipleships: JourneyDiscipleshipRecord[]
  implementationCycles: JourneyImplementationCycle[]
  now?: Date
}): JourneyOverviewSnapshot {
  const careEvaluations = input.availability.care
    ? input.careRequests.map((request) => ({ request, state: evaluateCarePromise(careRequestToPromise(request), input.now).state }))
    : []

  const implementation = input.implementationCycles[0]

  return {
    people: input.availability.people ? { count: input.people.length } : null,
    care: input.availability.care ? {
      open: careEvaluations.filter(({ request }) => request.status === 'open').length,
      debt: careEvaluations.filter(({ state }) => state === 'debt').length,
      dueSoon: careEvaluations.filter(({ state }) => state === 'due_soon').length,
      unassigned: careEvaluations.filter(({ request }) => request.status === 'open' && !request.ownerRef).length,
    } : null,
    presence: input.availability.presence ? {
      openSessions: input.sessions.filter((session) => session.status === 'open').length,
    } : null,
    groups: input.availability.groups ? {
      count: input.groups.length,
      nearCapacity: input.groups.filter((group) => {
        const capacity = group.capacity ?? 0
        return capacity > 0 && (group.participants ?? 0) / capacity >= 0.85
      }).length,
    } : null,
    discipleship: input.availability.discipleship ? {
      active: input.discipleships.filter((item) => item.status === 'active').length,
      paused: input.discipleships.filter((item) => item.status === 'paused').length,
      completed: input.discipleships.filter((item) => item.status === 'completed').length,
    } : null,
    implementation: input.availability.implementation && implementation ? {
      status: implementation.status,
      percent: implementationProgress(implementation.completedKeys).percent,
      week: implementationWeekForProgress(implementation.completedKeys),
    } : null,
  }
}
