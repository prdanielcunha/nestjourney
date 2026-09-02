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
}
