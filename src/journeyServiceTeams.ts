import type { AppLocale } from './i18n'

/** NestJourney-only service assignments; never MillionsNest organization roles. */
export const SERVICE_FRONTS = ['presence', 'table', 'care', 'house', 'discipleship', 'support'] as const
export const SERVICE_WORK_FRONTS = ['presence', 'table', 'care', 'house', 'discipleship'] as const
export const SERVICE_TEAM_ROLES = ['leader', 'integrant', 'auxiliary', 'trainee', 'other'] as const
export type ServiceFront = typeof SERVICE_FRONTS[number]
export type WorkFront = typeof SERVICE_WORK_FRONTS[number]
export type ServiceTeamRole = typeof SERVICE_TEAM_ROLES[number]
export type JourneyServiceTeam = {
  version: 1
  primaryArea: ServiceFront
  teamRole: ServiceTeamRole
  supportAreas: WorkFront[]
  otherLabel?: string
}

export const SERVICE_FRONT_LABELS: Record<AppLocale, Record<ServiceFront, string>> = {
  'pt-BR': {presence:'Presença',table:'Mesa Aberta',care:'Cuidado & Conexão',house:'Casas de Paz',discipleship:'Raiz',support:'Apoio Geral'},
  en: {presence:'Presence',table:'Open Table',care:'Care & Connection',house:'Peace Houses',discipleship:'Root',support:'General Support'},
  es: {presence:'Presencia',table:'Mesa Abierta',care:'Cuidado y Conexión',house:'Casas de Paz',discipleship:'Raíz',support:'Apoyo General'},
}
export const SERVICE_TEAM_ROLE_LABELS: Record<AppLocale, Record<ServiceTeamRole, string>> = {
  'pt-BR': {leader:'Líder',integrant:'Integrante',auxiliary:'Auxiliar',trainee:'Em formação',other:'Outra função'},
  en: {leader:'Leader',integrant:'Team member',auxiliary:'Helper',trainee:'In training',other:'Other function'},
  es: {leader:'Líder',integrant:'Integrante',auxiliary:'Auxiliar',trainee:'En formación',other:'Otra función'},
}

export function parseJourneyServiceTeam(value: unknown): JourneyServiceTeam | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (!SERVICE_FRONTS.includes(data.primaryArea as ServiceFront) || !SERVICE_TEAM_ROLES.includes(data.teamRole as ServiceTeamRole)) return null
  if (data.primaryArea === 'support' && data.teamRole === 'leader') return null
  if (!Array.isArray(data.supportAreas) || data.supportAreas.length > 5 || !data.supportAreas.every(area => SERVICE_WORK_FRONTS.includes(area))) return null
  if (new Set(data.supportAreas).size !== data.supportAreas.length) return null
  const otherLabel = typeof data.otherLabel === 'string' ? data.otherLabel.trim() : ''
  if (data.otherLabel !== undefined && typeof data.otherLabel !== 'string') return null
  if (otherLabel.length > 80 || (data.teamRole === 'other' && !otherLabel) || (data.teamRole !== 'other' && otherLabel)) return null
  return {
    version: 1,
    primaryArea: data.primaryArea as ServiceFront,
    teamRole: data.teamRole as ServiceTeamRole,
    supportAreas: data.supportAreas as WorkFront[],
    ...(otherLabel ? { otherLabel } : {}),
  }
}

export function legacyResponsibilityForTeam(team: JourneyServiceTeam) {
  if (team.teamRole !== 'leader') return 'member' as const
  const mapping = {
    presence: 'presence_host', table: 'mesa_team', care: 'caregiver',
    house: 'group_leader', discipleship: 'discipler', support: 'member',
  } as const
  return mapping[team.primaryArea]
}

export const DEFAULT_SERVICE_TEAM: JourneyServiceTeam = {
  version: 1, primaryArea: 'support', teamRole: 'auxiliary', supportAreas: [],
}

/** Existing team privileges remain unchanged until an administrator edits a designation. */
export function teamFromLegacy(journeyRole: string, savedTeam?: unknown): JourneyServiceTeam {
  const saved = parseJourneyServiceTeam(savedTeam)
  if (saved) return saved
  const mapping: Record<string, WorkFront> = {
    presence_host:'presence', mesa_team:'table', mesa:'table', table_host:'table',
    caregiver:'care', care:'care', group_leader:'house', discipler:'discipleship',
  }
  const primaryArea = mapping[journeyRole]
  return primaryArea
    ? { version:1, primaryArea, teamRole:'leader', supportAreas:[] }
    : { ...DEFAULT_SERVICE_TEAM, supportAreas: [] }
}
