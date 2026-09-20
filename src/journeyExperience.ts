import type { JourneyAccessContext } from './journeyRepository'

export type JourneyResponsibility =
  | 'presence_host'
  | 'mesa_team'
  | 'caregiver'
  | 'group_leader'
  | 'discipler'
  | 'coordinator'
  | 'pastor'
  | 'admin'
  | 'ceo'
  | 'member'

export interface JourneyResponsibilityDefinition {
  id: JourneyResponsibility
  capabilities: Array<'presence' | 'mesa' | 'care' | 'groups' | 'discipleship' | 'pastoral' | 'management'>
}

export const responsibilityDefinitions: JourneyResponsibilityDefinition[] = [
  { id: 'presence_host', capabilities: ['presence'] },
  { id: 'mesa_team', capabilities: ['mesa'] },
  { id: 'caregiver', capabilities: ['care'] },
  { id: 'group_leader', capabilities: ['groups'] },
  { id: 'discipler', capabilities: ['discipleship'] },
  { id: 'coordinator', capabilities: ['presence', 'mesa', 'care', 'groups', 'discipleship', 'management'] },
  { id: 'pastor', capabilities: ['presence', 'mesa', 'care', 'groups', 'discipleship', 'pastoral', 'management'] },
  { id: 'admin', capabilities: ['presence', 'mesa', 'care', 'groups', 'discipleship', 'management'] },
  { id: 'ceo', capabilities: ['presence', 'mesa', 'care', 'groups', 'discipleship', 'pastoral', 'management'] },
  { id: 'member', capabilities: [] },
]

export function resolveJourneyResponsibility(access: JourneyAccessContext): JourneyResponsibility {
  if (access.isSystemAdmin) return 'ceo'
  if (access.isOwner || ['owner', 'admin', 'data_admin'].includes(access.organizationRole)) return 'admin'
  if (access.role === 'pastor' || access.canManagePastoral) return 'pastor'
  if (access.role === 'coordinator') return 'coordinator'
  if (['mesa', 'table_host'].includes(access.role) || (access.canManageMesa && !access.canManagePresence)) return 'mesa_team'
  if (access.role === 'care' || (access.canManageCare && !access.broadJourneyAccess)) return 'caregiver'
  if (access.role === 'group_leader' || (access.canManageGroups && !access.broadJourneyAccess)) return 'group_leader'
  if (access.role === 'discipler' || (access.canManageDiscipleship && !access.broadJourneyAccess)) return 'discipler'
  if (access.canManagePresence) return 'presence_host'
  return 'member'
}

export function canViewJourneyPeople(access: JourneyAccessContext) {
  return access.broadJourneyAccess || access.canManagePeople
}

export function canViewJourneyVision(access: JourneyAccessContext) {
  return access.isSystemAdmin
    || access.isOwner
    || ['owner', 'admin', 'pastor', 'data_admin'].includes(access.organizationRole)
    || ['pastor', 'coordinator'].includes(access.role)
    || access.canManagePastoral
    || access.canViewGovernance
}

export function canViewJourneyReports(access: JourneyAccessContext) {
  return access.isSystemAdmin
    || access.isOwner
    || ['owner', 'admin', 'pastor'].includes(access.organizationRole)
    || ['pastor', 'coordinator'].includes(access.role)
    || access.broadJourneyAccess
}

export function canOpenJourneyArea(
  access: JourneyAccessContext,
  area: 'presence' | 'mesa' | 'care' | 'groups' | 'discipleship',
) {
  if (area === 'presence') return access.canManagePresence
  if (area === 'mesa') return access.canManageMesa
  if (area === 'care') return access.canManageCare || access.broadJourneyAccess
  if (area === 'groups') return access.canManageGroups || access.broadJourneyAccess
  return access.canManageDiscipleship || access.broadJourneyAccess
}
