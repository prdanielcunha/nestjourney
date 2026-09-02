import type { AppLabels, AuditEvent, Congregation, Discipleship, GroupMeeting, JoinRequest, Organization, Person, PresenceRecord, RetentionRequest, SmallGroup, TeamMember } from './types'

export const seedOrganization: Organization = {
  id: 'org-obpc-family',
  name: 'O Brasil Para Cristo',
  ministryName: 'Raiz e Mesa',
  slug: 'familia-obpc',
  logoText: 'OBPC',
  primaryColor: '#c9974f',
  accentColor: '#f2d18b',
  plan: 'pilot',
}

export const seedCongregations: Congregation[] = [
  { id: 'cong-monte-castelo', organizationId: seedOrganization.id, name: 'Monte Castelo', city: 'Cambé · PR', active: true },
  { id: 'cong-industrial', organizationId: seedOrganization.id, name: 'Industrial', city: 'Londrina · PR', active: true },
]

export const seedLabels: AppLabels = {
  reception: 'Presença',
  table: 'Mesa Aberta',
  care: 'Cuidado e Conexão',
  group: 'Casa de Paz',
  discipleship: 'Raiz',
}

export const seedPeople: Person[] = [
  { id: 'p1', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', name: 'Visitante Exemplo 01', phone: '(00) 00000-0001', firstVisit: '2026-08-30', consent: true, stage: 'contact_authorized', owner: 'Cuidador 01', nextAction: 'Enviar primeira mensagem', dueLabel: 'Hoje, 18h', visits: 1 },
  { id: 'p2', organizationId: seedOrganization.id, congregationId: 'cong-industrial', name: 'Visitante Exemplo 02', phone: '(00) 00000-0002', firstVisit: '2026-08-27', consent: true, stage: 'care_done', owner: 'Cuidadora 02', nextAction: 'Convidar para um pequeno grupo', dueLabel: 'Amanhã', visits: 2 },
  { id: 'p3', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', name: 'Participante Exemplo 03', phone: '(00) 00000-0003', firstVisit: '2026-08-23', consent: true, stage: 'group_connected', owner: 'Líder 01', nextAction: 'Confirmar presença no encontro', dueLabel: 'Quinta, 14h', visits: 3 },
  { id: 'p4', organizationId: seedOrganization.id, congregationId: 'cong-industrial', name: 'Visitante Exemplo 04', phone: '', firstVisit: '2026-08-30', consent: false, stage: 'new', owner: 'Sem responsável', nextAction: 'Acolher na próxima visita', dueLabel: 'Próximo domingo', visits: 1 },
  { id: 'p5', organizationId: seedOrganization.id, congregationId: 'cong-industrial', name: 'Discípulo Exemplo 05', phone: '(00) 00000-0005', firstVisit: '2026-08-16', consent: true, stage: 'discipleship_active', owner: 'Pastor responsável', nextAction: 'Encontro 4 — Bíblia e oração', dueLabel: 'Sábado, 10h', pastoralFlag: true, visits: 5 },
  { id: 'p6', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', name: 'Participante Exemplo 06', phone: '(00) 00000-0006', firstVisit: '2026-07-26', consent: true, stage: 'integrated', owner: 'Discipuladora 01', nextAction: 'Acompanhamento mensal', dueLabel: '18 set.', visits: 7 },
]

export const seedGroups: SmallGroup[] = [
  { id: 'g1', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', name: 'Casa Esperança', leader: 'Líder 01', host: 'Anfitrião 01', apprentice: 'Aprendiz 01', neighborhood: 'Monte Castelo', weekday: 'Terça-feira', time: '20h', capacity: 12, participants: 9, health: 'healthy' },
  { id: 'g2', organizationId: seedOrganization.id, congregationId: 'cong-industrial', name: 'Casa Caminho', leader: 'Líder 02', host: 'Anfitriã 02', apprentice: 'Aprendiz 02', neighborhood: 'Jd. Industrial', weekday: 'Quinta-feira', time: '19h30', capacity: 10, participants: 9, health: 'attention' },
  { id: 'g3', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', name: 'Casa Graça', leader: 'Líder 03', host: 'Anfitrião 03', apprentice: 'Em formação', neighborhood: 'Ana Rosa', weekday: 'Sexta-feira', time: '20h', capacity: 12, participants: 6, health: 'healthy' },
]

export const seedDiscipleships: Discipleship[] = [
  { id: 'd1', organizationId: seedOrganization.id, congregationId: 'cong-industrial', person: 'Discípulo Exemplo 05', mentor: 'Discipulador 01', mentorId: 'tm6', meeting: 4, completedMeetings: [1,2,3], nextMeeting: '05 set. · 10h', status: 'active' },
  { id: 'd2', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', person: 'Participante Exemplo 03', mentor: 'Discipuladora 02', mentorId: 'tm7', meeting: 2, completedMeetings: [1], nextMeeting: '08 set. · 19h', status: 'active' },
  { id: 'd3', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', person: 'Participante Exemplo 06', mentor: 'Discipulador 03', mentorId: 'tm8', meeting: 7, completedMeetings: [1,2,3,4,5,6,7], nextMeeting: 'Ciclo concluído', status: 'completed' },
]

export const seedPresence: PresenceRecord[] = [
  { id: 'v1', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', personId: 'p1', personName: 'Visitante Exemplo 01', date: '2026-08-30', kind: 'first_visit', host: 'Anfitriã 01', tableInvited: true, tableJoined: true, contactOffered: true },
  { id: 'v2', organizationId: seedOrganization.id, congregationId: 'cong-industrial', personId: 'p2', personName: 'Visitante Exemplo 02', date: '2026-08-30', kind: 'return', host: 'Anfitrião 02', tableInvited: true, tableJoined: false, contactOffered: true },
  { id: 'v3', organizationId: seedOrganization.id, congregationId: 'cong-industrial', personId: 'p4', personName: 'Visitante Exemplo 04', date: '2026-08-30', kind: 'first_visit', host: 'Anfitrião 03', tableInvited: true, tableJoined: true, contactOffered: false },
]

export const seedGroupMeetings: GroupMeeting[] = [
  { id: 'gm1', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', groupId: 'g1', date: '2026-08-26', attendance: 9, newcomers: 1, followUpAuthorized: 1, pastoralFlag: false, operationalNote: 'Encontro dentro do tempo.' },
  { id: 'gm2', organizationId: seedOrganization.id, congregationId: 'cong-industrial', groupId: 'g2', date: '2026-08-28', attendance: 9, newcomers: 0, followUpAuthorized: 0, pastoralFlag: true, operationalNote: 'Avaliar capacidade e apoio.' },
]

export const seedJoinRequests: JoinRequest[] = [
  { id: 'jr1', organizationId: seedOrganization.id, congregationId: 'cong-industrial', personName: 'Pessoa Interessada 01', neighborhood: 'Jd. Industrial', status: 'pending' },
  { id: 'jr2', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', personName: 'Pessoa Interessada 02', neighborhood: 'Monte Castelo', status: 'accepted', groupId: 'g1' },
]

export const seedTeam: TeamMember[] = [
  { id: 'tm1', name: 'Pastor responsável', role: 'pastor', congregationIds: ['cong-monte-castelo','cong-industrial'], active: true, weeklyLoad: 2 },
  { id: 'tm2', name: 'Coordenador Presença', role: 'coordinator', congregationIds: ['cong-monte-castelo'], active: true, weeklyLoad: 3 },
  { id: 'tm3', name: 'Cuidador 01', role: 'care', congregationIds: ['cong-monte-castelo'], active: true, weeklyLoad: 8 },
  { id: 'tm4', name: 'Cuidadora 02', role: 'care', congregationIds: ['cong-industrial'], active: true, weeklyLoad: 10 },
  { id: 'tm5', name: 'Líder 01', role: 'group_leader', congregationIds: ['cong-monte-castelo'], active: true, weeklyLoad: 9 },
  { id: 'tm6', name: 'Discipulador 01', role: 'discipler', congregationIds: ['cong-industrial'], active: true, weeklyLoad: 2 },
  { id: 'tm7', name: 'Discipuladora 02', role: 'discipler', congregationIds: ['cong-monte-castelo'], active: true, weeklyLoad: 2 },
  { id: 'tm8', name: 'Administrador de dados', role: 'data_admin', congregationIds: ['cong-monte-castelo','cong-industrial'], active: true, weeklyLoad: 1 },
]

export const seedAudit: AuditEvent[] = [
  { id: 'a1', actor: 'Cuidador 01', action: 'Contato concluído', target: 'Visitante Exemplo 01', createdAt: '2026-09-02T12:40:00Z', sensitivity: 'standard' },
  { id: 'a2', actor: 'Pastor responsável', action: 'Marcador pastoral acessado', target: 'Registro restrito', createdAt: '2026-09-02T11:15:00Z', sensitivity: 'restricted' },
  { id: 'a3', actor: 'Administrador de dados', action: 'Consentimento corrigido', target: 'Visitante Exemplo 02', createdAt: '2026-09-01T18:10:00Z', sensitivity: 'standard' },
]

export const seedRetention: RetentionRequest[] = [
  { id: 'r1', personName: 'Solicitante Exemplo 01', type: 'consent_revocation', status: 'open', requestedAt: '2026-09-01' },
]

export const implementationWeeks = [
  { week: 1, title: 'Coração, missão e cultura', status: 'done', tasks: ['Apresentar o caminho completo','Contar histórias sem exposição','Praticar hospitalidade','Confirmar facilitadores'], practice: 'Aprender o nome de alguém com quem normalmente não conversaria.' },
  { week: 2, title: 'Presença e Mesa Aberta', status: 'current', tasks: ['Definir entrada, salão e vínculo','Treinar boas-vindas','Treinar convite à Mesa','Revisar postura no apelo','Publicar escala','Fazer debrief de 10 minutos'], practice: 'Iniciar a Mesa Aberta e revisar o domingo com a equipe.' },
  { week: 3, title: 'Cuidado e conexão', status: 'next', tasks: ['Treinar consentimento opcional','Treinar primeira mensagem','Definir quando ligar','Revisar limites e LGPD','Definir encaminhamento pastoral'], practice: 'Contatar todos os autorizados em aproximadamente 24h, no máximo 48h.' },
  { week: 4, title: 'Casa de Paz', status: 'planned', tasks: ['Confirmar líder, anfitrião e aprendiz','Escolher local e horário','Treinar convite pessoal','Simular os 50 minutos','Realizar encontro piloto'], practice: 'Confirmar equipe, convidados e data da primeira Casa piloto.' },
  { week: 5, title: 'Raiz · discipulado inicial', status: 'planned', tasks: ['Apresentar os sete encontros','Treinar escuta e perguntas','Validar discipuladores','Alinhar material oficial','Praticar convite ao Raiz'], practice: 'Iniciar apenas 1–2 relações com pessoas e discipuladores preparados.' },
  { week: 6, title: 'Serviço, multiplicação e segurança', status: 'planned', tasks: ['Separar serviço simples de função sensível','Revisar critérios de liderança','Treinar limites de cuidado','Mapear aprendizes e sobrecarga'], practice: 'Identificar alguém para formação sem prometer função.' },
  { week: 7, title: 'Consolidação, compromisso e envio', status: 'planned', tasks: ['Revisar o fluxo completo','Compartilhar histórias preservando identidades','Confirmar responsáveis por 90 dias','Revisar métricas e falhas','Comissionar e iniciar ciclo 30/60/90'], practice: 'Entrar no ciclo de revisão de 30, 60 e 90 dias.' },
]

export const discipleshipMeetings = [
  'Jesus e o evangelho', 'Graça, arrependimento e fé', 'Nova vida e Espírito Santo',
  'Bíblia e oração', 'Igreja, comunhão, batismo e Ceia',
  'Santidade, lutas e perseverança', 'Missão, dons, serviço e continuidade',
]
