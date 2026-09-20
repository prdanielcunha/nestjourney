import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  type CareRequestRecord,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'

export type JourneyUnitPulseLevel = 'attention' | 'watch' | 'clear'

export interface JourneyUnitPulse {
  unitId: string
  name: string
  city?: string
  people: number
  careOpen: number
  careDebt: number
  careUnassigned: number
  pastoralOpen: number
  openSessions: number
  groups: number
  activeDiscipleships: number
  level: JourneyUnitPulseLevel
}

export function buildJourneyUnitPulse(input: {
  unit: JourneyCongregation
  people: JourneyPersonRecord[]
  care: CareRequestRecord[]
  sessions: PresenceSessionRecord[]
  groups: JourneyGroupRecord[]
  discipleships: JourneyDiscipleshipRecord[]
  pastoral: JourneyPastoralHandoff[]
  now?: Date
}): JourneyUnitPulse {
  const openCare = input.care.filter(item => item.status === 'open')
  const careDebt = openCare.filter(item => evaluateCarePromise(careRequestToPromise(item), input.now).state === 'debt').length
  const careUnassigned = openCare.filter(item => !item.ownerRef).length
  const pastoralOpen = input.pastoral.filter(item => item.status === 'open').length
  const openSessions = input.sessions.filter(item => item.status === 'open').length
  const level: JourneyUnitPulseLevel = careDebt > 0 || pastoralOpen > 0
    ? 'attention'
    : careUnassigned > 0 || openSessions > 0
      ? 'watch'
      : 'clear'

  return {
    unitId: input.unit.id,
    name: input.unit.name,
    city: input.unit.city,
    people: input.people.length,
    careOpen: openCare.length,
    careDebt,
    careUnassigned,
    pastoralOpen,
    openSessions,
    groups: input.groups.length,
    activeDiscipleships: input.discipleships.filter(item => item.status === 'active').length,
    level,
  }
}
