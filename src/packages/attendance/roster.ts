/** Portable attendance projection: no Firebase, React, auth or product storage dependency. */
export type AttendanceState = 'present_confirmed' | 'absent_confirmed' | 'unverified'
export type AttendanceFilter = 'all' | 'unverified' | 'present_confirmed' | 'absent_confirmed'
export interface AttendancePerson {
  id: string
  name: string
  preferredName?: string
  photoUrl?: string
}
export interface AttendanceScope {organizationId: string; congregationId: string; id: string; eligiblePersonIds?: string[]}
export interface AttendanceCheck {
  id: string; organizationId: string; congregationId: string; sessionId: string
  personId: string; state: AttendanceState; recordedAt: string
}
export const attendanceSearchKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim()

export function buildAttendanceRoster<T extends AttendancePerson>(people: T[], session: AttendanceScope | undefined, checks: AttendanceCheck[]) {
  const latest = new Map<string, AttendanceCheck>()
  if (session) for (const check of checks) {
    if (check.organizationId !== session.organizationId || check.congregationId !== session.congregationId || check.sessionId !== session.id) continue
    if (!['present_confirmed', 'absent_confirmed', 'unverified'].includes(check.state)) continue
    const previous = latest.get(check.personId)
    if (!previous || check.recordedAt > previous.recordedAt || (check.recordedAt === previous.recordedAt && check.id > previous.id)) latest.set(check.personId, check)
  }
  const eligible = session?.eligiblePersonIds ? new Set(session.eligiblePersonIds) : undefined
  const rows = people.map(person => ({person, state: latest.get(person.id)?.state ?? 'unverified' as AttendanceState, eligible: !eligible || eligible.has(person.id)}))
  // Out-of-roster visitors may be present, but are never an unconfirmed/absent obligation.
  const counts = {all: rows.length, unverified: 0, present_confirmed: 0, absent_confirmed: 0}
  for (const row of rows) if (row.state === 'present_confirmed' || row.eligible) counts[row.state]++
  return {rows, counts}
}

export function filterAttendanceRoster<T extends AttendancePerson>(rows: ReturnType<typeof buildAttendanceRoster<T>>['rows'], filter: AttendanceFilter, query: string) {
  const terms = attendanceSearchKey(query).split(' ').filter(Boolean)
  return rows.filter(row => (filter === 'all' || row.state === filter && (filter === 'present_confirmed' || row.eligible)) && terms.every(term => attendanceSearchKey(row.person.name + ' ' + (row.person.preferredName || '')).includes(term)))
    .sort((a, b) => a.person.name.localeCompare(b.person.name))
}
