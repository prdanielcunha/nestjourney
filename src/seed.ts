import type { AppLabels, Congregation, Discipleship, Organization, Person, SmallGroup } from './types'

export const seedOrganization: Organization = {
  id: 'org-obpc-family',
  name: 'O Brasil Para Cristo',
  ministryName: 'Raiz e Mesa',
  slug: 'familia-obpc',
  logoText: 'OBPC',
  primaryColor: '#12553f',
  accentColor: '#d49345',
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
  { id: 'd1', organizationId: seedOrganization.id, congregationId: 'cong-industrial', person: 'Discípulo Exemplo 05', mentor: 'Discipulador 01', meeting: 4, nextMeeting: '05 set. · 10h', status: 'active' },
  { id: 'd2', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', person: 'Participante Exemplo 03', mentor: 'Discipuladora 02', meeting: 2, nextMeeting: '08 set. · 19h', status: 'active' },
  { id: 'd3', organizationId: seedOrganization.id, congregationId: 'cong-monte-castelo', person: 'Participante Exemplo 06', mentor: 'Discipulador 03', meeting: 7, nextMeeting: 'Ciclo concluído', status: 'completed' },
]

export const implementationWeeks = [
  { week: 1, title: 'Coração, missão e cultura', status: 'done', tasks: 4, done: 4 },
  { week: 2, title: 'Presença e Mesa Aberta', status: 'current', tasks: 6, done: 4 },
  { week: 3, title: 'Cuidado e conexão', status: 'next', tasks: 5, done: 0 },
  { week: 4, title: 'Pequenos grupos nos lares', status: 'planned', tasks: 5, done: 0 },
  { week: 5, title: 'Discipulado inicial', status: 'planned', tasks: 5, done: 0 },
  { week: 6, title: 'Serviço, multiplicação e segurança', status: 'planned', tasks: 4, done: 0 },
  { week: 7, title: 'Consolidação, compromisso e envio', status: 'planned', tasks: 5, done: 0 },
]

export const discipleshipMeetings = [
  'Jesus e o evangelho', 'Graça, arrependimento e fé', 'Nova vida e Espírito Santo',
  'Bíblia e oração', 'Igreja, comunhão, batismo e Ceia',
  'Santidade, lutas e perseverança', 'Missão, dons, serviço e continuidade',
]
