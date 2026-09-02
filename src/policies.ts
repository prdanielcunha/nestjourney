import type { Person, SmallGroup, TeamMember } from './types'

export const CARE_WINDOW_HOURS = 48
export const CARE_WEEKLY_LIMIT = 10
export const GROUP_IDEAL_MIN = 6
export const GROUP_IDEAL_MAX = 10
export const GROUP_HARD_LIMIT = 12
export const DISCIPLESHIP_IDEAL_LOAD = 2
export const DISCIPLESHIP_MAX_LOAD = 3

export function canEnterCareFlow(person: Person) {
  return person.consent && Boolean(person.phone)
}

export function groupCapacityStatus(group: SmallGroup) {
  if (group.participants >= GROUP_HARD_LIMIT) return 'full' as const
  if (group.participants > GROUP_IDEAL_MAX) return 'attention' as const
  if (group.participants >= GROUP_IDEAL_MIN) return 'healthy' as const
  return 'forming' as const
}

export function teamLoadStatus(member: TeamMember) {
  const limit = member.role === 'discipler' ? DISCIPLESHIP_MAX_LOAD : CARE_WEEKLY_LIMIT
  return member.weeklyLoad >= limit ? 'limit' as const : 'healthy' as const
}
