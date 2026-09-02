export type Role = 'owner' | 'pastor' | 'coordinator' | 'care' | 'group_leader' | 'discipler' | 'data_admin'
export type PersonStage = 'new' | 'contact_authorized' | 'care_done' | 'group_connected' | 'discipleship_active' | 'integrated'

export interface Organization {
  id: string
  name: string
  ministryName: string
  slug: string
  logoText: string
  primaryColor: string
  accentColor: string
  plan: 'pilot' | 'starter' | 'growth'
}

export interface Congregation {
  id: string
  organizationId: string
  name: string
  city: string
  active: boolean
}

export interface AppLabels {
  reception: string
  table: string
  care: string
  group: string
  discipleship: string
}

export interface Person {
  id: string
  organizationId: string
  congregationId: string
  name: string
  phone: string
  firstVisit: string
  consent: boolean
  stage: PersonStage
  owner: string
  nextAction: string
  dueLabel: string
  pastoralFlag?: boolean
  visits: number
  contactStatus?: 'pending' | 'sent' | 'replied' | 'no_reply' | 'closed'
  lastContactAt?: string
  groupId?: string
  disciplerId?: string
  consentGrantedAt?: string
  consentRevokedAt?: string
  createdAt?: string
}

export interface SmallGroup {
  id: string
  organizationId: string
  congregationId: string
  name: string
  leader: string
  host: string
  apprentice: string
  neighborhood: string
  weekday: string
  time: string
  capacity: number
  participants: number
  health: 'healthy' | 'attention'
  frequency?: 'weekly' | 'biweekly'
  lastMeetingAt?: string
  nextMeetingAt?: string
}

export interface Discipleship {
  id: string
  organizationId: string
  congregationId: string
  person: string
  mentor: string
  meeting: number
  nextMeeting: string
  status: 'active' | 'paused' | 'completed'
  mentorId?: string
  completedMeetings?: number[]
  startedAt?: string
}

export interface PresenceRecord {
  id: string
  organizationId: string
  congregationId: string
  personId: string
  personName: string
  date: string
  kind: 'first_visit' | 'return' | 'member_return'
  host: string
  tableInvited: boolean
  tableJoined: boolean
  contactOffered: boolean
}

export interface GroupMeeting {
  id: string
  organizationId: string
  congregationId: string
  groupId: string
  date: string
  attendance: number
  newcomers: number
  followUpAuthorized: number
  pastoralFlag: boolean
  operationalNote: string
}

export interface JoinRequest {
  id: string
  organizationId: string
  congregationId: string
  personName: string
  neighborhood: string
  status: 'pending' | 'accepted' | 'waitlist'
  groupId?: string
}

export interface TeamMember {
  id: string
  name: string
  role: Role
  congregationIds: string[]
  active: boolean
  weeklyLoad: number
}

export interface AuditEvent {
  id: string
  actor: string
  action: string
  target: string
  createdAt: string
  sensitivity: 'standard' | 'restricted'
}

export interface RetentionRequest {
  id: string
  personName: string
  type: 'correction' | 'consent_revocation' | 'deletion'
  status: 'open' | 'processing' | 'completed'
  requestedAt: string
}
