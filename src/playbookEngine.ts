import { IMPLEMENTATION_REQUIRED_KEYS, RAIZ_E_MESA_IMPLEMENTATION_PLAYBOOK_ID } from './implementationPlaybook'

export const JOURNEY_PLAYBOOK_SCHEMA_VERSION = 1 as const
export const JOURNEY_PLAYBOOK_DEFAULT_ID = RAIZ_E_MESA_IMPLEMENTATION_PLAYBOOK_ID

export type JourneyPlaybookStatus = 'draft' | 'active' | 'archived'
export type JourneyPlaybookAreaKey = 'presence' | 'table' | 'care' | 'groups' | 'discipleship'
export type JourneyPlaybookStageKind = JourneyPlaybookAreaKey | 'service' | 'multiplication' | 'custom'

export const JOURNEY_PLAYBOOK_ROLES = [
  'owner', 'admin', 'pastor', 'coordinator', 'presence_host', 'mesa_team', 'caregiver', 'group_leader', 'discipler',
] as const

export const JOURNEY_PLAYBOOK_REQUIRED_FIELDS = ['name', 'phone', 'consent', 'firstVisit'] as const

export interface JourneyPlaybookStage {
  id: string
  label: string
  kind: JourneyPlaybookStageKind
  entryCriteria: string
  completionCriteria: string
  responsibleRoles: string[]
  requiredFields: string[]
}

export interface JourneyImplementationPhaseDefinition {
  id: string
  title: string
  objective: string
  items: string[]
}

export interface JourneyPlaybookDefinition {
  id: string
  organizationId: string
  schemaVersion: typeof JOURNEY_PLAYBOOK_SCHEMA_VERSION
  name: string
  description: string
  status: JourneyPlaybookStatus
  carePromiseHours: number
  discipleshipMeetingCount: number
  areaLabels: Record<JourneyPlaybookAreaKey, string>
  stages: JourneyPlaybookStage[]
  indicators: string[]
  routingRules: string[]
  implementationPhases: JourneyImplementationPhaseDefinition[]
  implementationKeys: string[]
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

const DEFAULT_STAGE_BLUEPRINT: Omit<JourneyPlaybookStage, 'label'>[] = [
  { id: 'service', kind: 'presence', entryCriteria: 'Pessoa recebida ou presença registrada.', completionCriteria: 'Próximo passo factual definido quando aplicável.', responsibleRoles: ['presence_host','coordinator','pastor'], requiredFields: ['name'] },
  { id: 'table', kind: 'table', entryCriteria: 'Convite ou participação registrada.', completionCriteria: 'Participação factual registrada sem inferir interesse espiritual.', responsibleRoles: ['mesa_team','coordinator','pastor'], requiredFields: ['name'] },
  { id: 'care', kind: 'care', entryCriteria: 'Necessidade ou compromisso de contato explicitamente registrado.', completionCriteria: 'Resultado e próximo passo registrados.', responsibleRoles: ['caregiver','coordinator','pastor'], requiredFields: ['name','consent'] },
  { id: 'group', kind: 'groups', entryCriteria: 'Interesse ou entrada na comunidade registrado.', completionCriteria: 'Vínculo com grupo registrado ou decisão factual de não seguir agora.', responsibleRoles: ['group_leader','coordinator','pastor'], requiredFields: ['name'] },
  { id: 'discipleship', kind: 'discipleship', entryCriteria: 'Relação de discipulado iniciada com responsável definido.', completionCriteria: 'Trilha concluída, pausada ou encerrada com estado factual.', responsibleRoles: ['discipler','coordinator','pastor'], requiredFields: ['name'] },
  { id: 'life_service', kind: 'service', entryCriteria: 'Próximo passo de vida, formação ou serviço explicitamente registrado.', completionCriteria: 'Marco factual registrado sem transformar serviço em obrigação.', responsibleRoles: ['coordinator','pastor'], requiredFields: ['name'] },
  { id: 'multiplication', kind: 'multiplication', entryCriteria: 'Formação de liderança ou multiplicação explicitamente iniciada.', completionCriteria: 'Marco factual registrado e responsabilidade confirmada.', responsibleRoles: ['coordinator','pastor'], requiredFields: ['name'] },
]

const DEFAULT_STAGE_LABELS = ['Culto','Mesa Aberta','Cuidado','Casa de Paz','Raiz','Vida & Serviço','Multiplicação']

function cleanText(value: unknown, max = 160) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function safeId(value: unknown, fallback: string) {
  const normalized = cleanText(value, 80)
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function boundedList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

export function implementationKeysForPhases(phases: JourneyImplementationPhaseDefinition[]) {
  return phases.flatMap((phase, phaseIndex) =>
    phase.items.map((_, itemIndex) => `phase.${safeId(phase.id, String(phaseIndex + 1))}.item.${itemIndex + 1}`),
  )
}

export function createRaizEMesaPlaybook(organizationId: string): JourneyPlaybookDefinition {
  const areaLabels: JourneyPlaybookDefinition['areaLabels'] = {
    presence: 'Recepção',
    table: 'Mesa Aberta',
    care: 'Cuidado & Conexão',
    groups: 'Casa de Paz',
    discipleship: 'Raiz',
  }
  return {
    id: JOURNEY_PLAYBOOK_DEFAULT_ID,
    organizationId,
    schemaVersion: JOURNEY_PLAYBOOK_SCHEMA_VERSION,
    name: 'Raiz e Mesa 2026',
    description: 'Jornada relacional configurável de acolhimento, cuidado, comunidade, discipulado, vida e multiplicação.',
    status: 'active',
    carePromiseHours: 48,
    discipleshipMeetingCount: 7,
    areaLabels,
    stages: DEFAULT_STAGE_BLUEPRINT.map((stage, index) => ({ ...stage, label: DEFAULT_STAGE_LABELS[index] })),
    indicators: ['care_debt','unassigned_care','open_presence_sessions','group_capacity','active_discipleships','pastoral_handoffs'],
    routingRules: ['visitor_to_first_contact','confirmed_absence_to_care','care_to_pastoral_handoff','group_interest_to_entry_request'],
    implementationPhases: [
      { id: 'preparation', title: 'Preparação', objective: 'Preparar liderança, responsabilidades, ambiente e piloto.', items: ['Preparação do núcleo e responsáveis'] },
      { id: 'week-1', title: 'Semana 1 · Coração, missão e cultura', objective: 'Cristo e missão antes da tarefa.', items: ['Treinamento e prática da semana 1'] },
      { id: 'week-2', title: 'Semana 2 · Presença e Mesa', objective: 'Ativar acolhimento e Mesa.', items: ['Treinamento e prática da semana 2'] },
      { id: 'week-3', title: 'Semana 3 · Cuidado e conexão', objective: 'Ativar o cuidado 24–48h com consentimento.', items: ['Treinamento e prática da semana 3'] },
      { id: 'week-4', title: 'Semana 4 · Casa de Paz', objective: 'Preparar e operar a primeira Casa.', items: ['Treinamento e prática da semana 4'] },
      { id: 'week-5', title: 'Semana 5 · Raiz', objective: 'Iniciar discipulado quando houver pessoas prontas.', items: ['Treinamento e prática da semana 5'] },
      { id: 'week-6', title: 'Semana 6 · Serviço, multiplicação e segurança', objective: 'Formar com caráter e limites.', items: ['Treinamento e prática da semana 6'] },
      { id: 'week-7', title: 'Semana 7 · Consolidação e envio', objective: 'Consolidar responsáveis e os próximos 90 dias.', items: ['Treinamento e prática da semana 7'] },
    ],
    implementationKeys: [...IMPLEMENTATION_REQUIRED_KEYS],
  }
}

export function normalizeJourneyPlaybook(input: Partial<JourneyPlaybookDefinition> & { organizationId: string }, fallbackId = 'custom-playbook'): JourneyPlaybookDefinition {
  const organizationId = cleanText(input.organizationId, 256)
  if (!organizationId || organizationId.includes('/') || organizationId.includes('\\')) throw new Error('invalid_organization_id')

  const rawStages = Array.isArray(input.stages) ? input.stages.slice(0, 20) : []
  const stages: JourneyPlaybookStage[] = rawStages.map((raw, index) => {
    const source = raw as Partial<JourneyPlaybookStage>
    const kind: JourneyPlaybookStageKind = ['presence','table','care','groups','discipleship','service','multiplication','custom'].includes(String(source.kind))
      ? source.kind as JourneyPlaybookStageKind
      : 'custom'
    return {
      id: safeId(source.id || source.label, `stage-${index + 1}`),
      label: cleanText(source.label, 64) || `Etapa ${index + 1}`,
      kind,
      entryCriteria: cleanText(source.entryCriteria, 280),
      completionCriteria: cleanText(source.completionCriteria, 280),
      responsibleRoles: boundedList(source.responsibleRoles, 9, 40).filter((role) => (JOURNEY_PLAYBOOK_ROLES as readonly string[]).includes(role)),
      requiredFields: boundedList(source.requiredFields, 4, 32).filter((field) => (JOURNEY_PLAYBOOK_REQUIRED_FIELDS as readonly string[]).includes(field)),
    }
  })

  const rawPhases = Array.isArray(input.implementationPhases) ? input.implementationPhases.slice(0, 16) : []
  const implementationPhases: JourneyImplementationPhaseDefinition[] = rawPhases.map((raw, index) => {
    const source = raw as Partial<JourneyImplementationPhaseDefinition>
    return {
      id: safeId(source.id || source.title, `phase-${index + 1}`),
      title: cleanText(source.title, 80) || `Fase ${index + 1}`,
      objective: cleanText(source.objective, 280),
      items: boundedList(source.items, 20, 180),
    }
  }).filter((phase) => phase.items.length > 0)

  const labels = input.areaLabels ?? {} as JourneyPlaybookDefinition['areaLabels']
  const normalized: JourneyPlaybookDefinition = {
    id: safeId(input.id, fallbackId),
    organizationId,
    schemaVersion: JOURNEY_PLAYBOOK_SCHEMA_VERSION,
    name: cleanText(input.name, 80) || 'Jornada sem nome',
    description: cleanText(input.description, 280),
    status: input.status === 'archived' ? 'archived' : input.status === 'active' ? 'active' : 'draft',
    carePromiseHours: boundedNumber(input.carePromiseHours, 48, 1, 168),
    discipleshipMeetingCount: boundedNumber(input.discipleshipMeetingCount, 7, 1, 24),
    areaLabels: {
      presence: cleanText(labels.presence, 48) || 'Recepção',
      table: cleanText(labels.table, 48) || 'Mesa',
      care: cleanText(labels.care, 48) || 'Cuidado',
      groups: cleanText(labels.groups, 48) || 'Grupos',
      discipleship: cleanText(labels.discipleship, 48) || 'Discipulado',
    },
    stages,
    indicators: boundedList(input.indicators, 20, 64),
    routingRules: boundedList(input.routingRules, 20, 80),
    implementationPhases,
    implementationKeys: [],
    createdAt: input.createdAt,
    createdBy: cleanText(input.createdBy, 256) || undefined,
    updatedAt: input.updatedAt,
    updatedBy: cleanText(input.updatedBy, 256) || undefined,
  }
  normalized.implementationKeys = implementationKeysForPhases(normalized.implementationPhases).slice(0, 120)
  return normalized
}

export function playbookCanStartImplementation(playbook: JourneyPlaybookDefinition) {
  return playbook.status === 'active'
    && playbook.stages.length > 0
    && playbook.implementationKeys.length > 0
}
