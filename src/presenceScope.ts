import {listJourneyPeople, listPresenceChecks, listPresenceSessions} from './journeyRepository'

/** Only attendance data belongs in the attendance loading gate.
 * Care has separate permissions and is loaded independently by the host page. */
export async function loadAttendanceScope(organizationId: string, congregationId: string, selectedSessionId: string) {
  const [people, sessions] = await Promise.all([
    listJourneyPeople(organizationId, congregationId),
    listPresenceSessions(organizationId, congregationId),
  ])
  const session = sessions.find(item=>item.id===selectedSessionId)
    ?? sessions.find(item=>item.status==='open') ?? sessions[0]
  const checks = session ? await listPresenceChecks(organizationId, congregationId, session.id) : []
  return {people, sessions, session, checks}
}
