import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCopy, HeartHandshake, MessageCircle, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import {
  careRequestToPromise,
  getActiveJourneyOrganizationId,
  latestChecksByPerson,
  completeFieldHopeSession,
  createFieldFirstSteps,
  createFieldHopeSession,
  listCareRequests,
  listFieldFirstSteps,
  listFieldHopeParticipations,
  listFieldHopeSessions,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyFollowups,
  listJourneyPeople,
  listMesaParticipationRecords,
  listPastoralHandoffs,
  listPresenceChecks,
  listPresenceSessions,
  loadJourneyAccess,
  resolveActiveJourneyCongregationId,
  setActiveJourneyCongregationId,
  setFieldHopeParticipation,
  subscribeJourneyLiveChanges,
  updateFieldFirstSteps,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type FieldFirstStepsRecord,
  type FieldHopeParticipationRecord,
  type FieldHopeSessionRecord,
  type JourneyFollowupRecord,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type MesaParticipationRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { evaluateCarePromise, type PresenceCheck } from './intelligence'
import { canViewJourneyReports } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import {
  BIWEEKLY_REFINEMENT_QUESTIONS,
  FIELD_GUIDE_FINAL_LOGIC,
  FIELD_GUIDE_LOCAL_STRUCTURE,
  FIELD_GUIDE_MONTHLY_RHYTHM,
  FIELD_GUIDE_SIMPLICITY_RULES,
  MESA_DE_ESPERANCA,
  PRIMEIROS_PASSOS,
  PULPIT_LINES,
  WEEKLY_COORDINATOR_AGENDA,
  isInsideFieldWeek,
  resolveFieldGuideUnitProfile,
  startOfFieldWeek,
} from './fieldGuide'
import { AccessDeniedState } from './AccessDeniedState'
import './FieldGuidePage.css'

type FieldData = {
  people: JourneyPersonRecord[]
  care: CareRequestRecord[]
  followups: JourneyFollowupRecord[]
  sessions: PresenceSessionRecord[]
  checks: PresenceCheck[]
  mesa: MesaParticipationRecord[]
  discipleships: JourneyDiscipleshipRecord[]
  pastoral: JourneyPastoralHandoff[]
  hopeSessions: FieldHopeSessionRecord[]
  hopeParticipations: FieldHopeParticipationRecord[]
  firstSteps: FieldFirstStepsRecord[]
}

const emptyData: FieldData = { people: [], care: [], followups: [], sessions: [], checks: [], mesa: [], discipleships: [], pastoral: [], hopeSessions: [], hopeParticipations: [], firstSteps: [] }

const copy = {
  'pt-BR': {
    title: 'Manual de Campo', subtitle: 'Ritmo mensal, relatório semanal, reuniões e conteúdos prontos do Crescimento Saudável 2026.',
    loading: 'Preparando o Manual de Campo…', noAccess: 'Seu papel atual não possui acesso à leitura operacional do Manual de Campo.', unit: 'Unidade',
    thisWeek: 'Esta semana', weeklyReport: 'Relatório semanal', rhythm: 'Ritmo do mês', meetings: 'Reuniões', content: 'Conteúdo pronto', local: 'Modelo da unidade',
    visitors: 'Visitantes', returns: 'Retornos', postService: 'Pessoas na comunhão pós-culto', prayer: 'Pedidos de oração', onTime: 'Contatos concluídos no prazo', responses: 'Respostas registradas', absences: 'Ausentes acompanhados', pastoral: 'Encaminhados ao pastor',
    mesaInvited: 'Mesa · convidados/registrados', mesaJoined: 'Mesa · participantes', explicitNext: 'Próximos passos explícitos', rootMeetings: 'Encontros de discipulado concluídos', rootActive: 'Pessoas em discipulado', newRoot: 'Discipulados iniciados',
    attention: 'Pontos de atenção', nextActions: 'Próximas ações', copyReport: 'Copiar relatório', copied: 'Relatório copiado',
    careDebt: 'Cuidados atrasados', unassigned: 'Cuidados sem responsável', openPastoral: 'Encaminhamentos pastorais abertos',
    weeklyMeeting: 'Reunião semanal dos coordenadores · 35–45 min', biweekly: 'Reunião quinzenal de ajuste · 45 min',
    pulpit: '12 falas curtas para o púlpito', hopeTable: '12 roteiros da Mesa de Esperança', firstSteps: '6 roteiros de Primeiros Passos',
    sourceLanguage: 'O conteúdo pastoral abaixo preserva a redação oficial do manual em português. A interface do produto continua disponível em PT, EN e ES.',
    fieldOps:'Operação do Manual de Campo',fieldOpsDesc:'Mesa de Esperança e Primeiros Passos ficam separados da Mesa Aberta e do Raiz para preservar os dois métodos sem misturar dados.',hopeOps:'Mesa de Esperança',newHope:'Agendar Mesa',theme:'Tema',date:'Data',session:'Encontro',person:'Pessoa',invite:'Convidar',present:'Marcar presença',complete:'Concluir encontro',noHope:'Nenhuma Mesa de Esperança agendada ainda.',firstOps:'Primeiros Passos',startFirst:'Iniciar Primeiros Passos',advance:'Concluir encontro',pause:'Pausar',resume:'Retomar',noFirst:'Nenhum Primeiros Passos ativo ainda.',fieldSaved:'Registro atualizado.',
    factual: 'O relatório usa somente fatos registrados. “Abertura”, “avanço espiritual” e valor de pessoas não viram score nem rótulo no NestJourney.',
    error: 'Não foi possível montar o Manual de Campo com os dados desta unidade.',
  },
  en: {
    title: 'Field Guide', subtitle: 'Monthly rhythm, weekly report, leadership meetings, and ready-to-use 2026 Healthy Growth material.',
    loading: 'Preparing the Field Guide…', noAccess: 'Your current role does not have access to this operational field view.', unit: 'Campus',
    thisWeek: 'This week', weeklyReport: 'Weekly report', rhythm: 'Monthly rhythm', meetings: 'Meetings', content: 'Ready-to-use content', local: 'Campus model',
    visitors: 'Visitors', returns: 'Returns', postService: 'Post-service community participants', prayer: 'Prayer requests', onTime: 'Contacts completed on time', responses: 'Recorded responses', absences: 'Absences followed up', pastoral: 'Pastoral handoffs',
    mesaInvited: 'Table · invited/recorded', mesaJoined: 'Table · participants', explicitNext: 'Explicit next steps', rootMeetings: 'Discipleship meetings completed', rootActive: 'People in discipleship', newRoot: 'Discipleships started',
    attention: 'Attention points', nextActions: 'Next actions', copyReport: 'Copy report', copied: 'Report copied',
    careDebt: 'Overdue care', unassigned: 'Unassigned care', openPastoral: 'Open pastoral handoffs',
    weeklyMeeting: 'Weekly coordinator meeting · 35–45 min', biweekly: 'Biweekly refinement meeting · 45 min',
    pulpit: '12 short pulpit lines', hopeTable: '12 Mesa de Esperança guides', firstSteps: '6 Primeiros Passos guides',
    sourceLanguage: 'The pastoral material below preserves the official Portuguese wording of the source manual. Product navigation remains available in PT, EN, and ES.',
    fieldOps:'Field operations',fieldOpsDesc:'Mesa de Esperança and Primeiros Passos stay separate from Open Table and Root so both methods remain intact without mixing records.',hopeOps:'Mesa de Esperança',newHope:'Schedule table',theme:'Theme',date:'Date',session:'Session',person:'Person',invite:'Invite',present:'Mark present',complete:'Complete session',noHope:'No Mesa de Esperança session scheduled yet.',firstOps:'Primeiros Passos',startFirst:'Start Primeiros Passos',advance:'Complete meeting',pause:'Pause',resume:'Resume',noFirst:'No active Primeiros Passos relationship yet.',fieldSaved:'Record updated.',
    factual: 'This report uses recorded facts only. Perceived “openness,” spiritual progress, or human value never becomes a score or label in NestJourney.',
    error: 'The Field Guide could not be built for this campus.',
  },
  es: {
    title: 'Manual de Campo', subtitle: 'Ritmo mensual, informe semanal, reuniones y contenido listo de Crecimiento Saludable 2026.',
    loading: 'Preparando el Manual de Campo…', noAccess: 'Tu rol actual no tiene acceso a esta lectura operativa.', unit: 'Sede',
    thisWeek: 'Esta semana', weeklyReport: 'Informe semanal', rhythm: 'Ritmo del mes', meetings: 'Reuniones', content: 'Contenido listo', local: 'Modelo de la sede',
    visitors: 'Visitantes', returns: 'Regresos', postService: 'Participantes en la comunión posculto', prayer: 'Pedidos de oración', onTime: 'Contactos completados a tiempo', responses: 'Respuestas registradas', absences: 'Ausentes acompañados', pastoral: 'Derivaciones pastorales',
    mesaInvited: 'Mesa · invitados/registrados', mesaJoined: 'Mesa · participantes', explicitNext: 'Próximos pasos explícitos', rootMeetings: 'Encuentros de discipulado concluidos', rootActive: 'Personas en discipulado', newRoot: 'Discipulados iniciados',
    attention: 'Puntos de atención', nextActions: 'Próximas acciones', copyReport: 'Copiar informe', copied: 'Informe copiado',
    careDebt: 'Cuidados atrasados', unassigned: 'Cuidados sin responsable', openPastoral: 'Derivaciones pastorales abiertas',
    weeklyMeeting: 'Reunión semanal de coordinadores · 35–45 min', biweekly: 'Reunión quincenal de ajuste · 45 min',
    pulpit: '12 frases breves para el púlpito', hopeTable: '12 guías de Mesa de Esperança', firstSteps: '6 guías de Primeiros Passos',
    sourceLanguage: 'El contenido pastoral de abajo conserva la redacción oficial en portugués. La navegación del producto sigue disponible en PT, EN y ES.',
    fieldOps:'Operación del Manual de Campo',fieldOpsDesc:'Mesa de Esperança y Primeiros Passos quedan separados de Mesa Abierta y Raíz para preservar ambos métodos sin mezclar registros.',hopeOps:'Mesa de Esperança',newHope:'Programar Mesa',theme:'Tema',date:'Fecha',session:'Encuentro',person:'Persona',invite:'Invitar',present:'Marcar presencia',complete:'Concluir encuentro',noHope:'Aún no hay Mesa de Esperança programada.',firstOps:'Primeiros Passos',startFirst:'Iniciar Primeiros Passos',advance:'Concluir encuentro',pause:'Pausar',resume:'Retomar',noFirst:'Aún no hay Primeiros Passos activo.',fieldSaved:'Registro actualizado.',
    factual: 'El informe usa solo hechos registrados. La “apertura”, el avance espiritual o el valor de una persona nunca se convierten en puntuación o etiqueta.',
    error: 'No se pudo preparar el Manual de Campo para esta sede.',
  },
} as const

function unique<T>(items: T[]) { return new Set(items).size }

export default function FieldGuidePage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = copy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [units, setUnits] = useState<JourneyCongregation[]>([])
  const [unitId, setUnitId] = useState('')
  const [data, setData] = useState<FieldData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hopeThemeId, setHopeThemeId] = useState(MESA_DE_ESPERANCA[0]?.id ?? '')
  const [hopeDate, setHopeDate] = useState(() => new Date().toISOString().slice(0,10))
  const [hopeSessionId, setHopeSessionId] = useState('')
  const [hopePersonId, setHopePersonId] = useState('')
  const [firstPersonId, setFirstPersonId] = useState('')

  const loadScope = useCallback(async (nextAccess: JourneyAccessContext, nextUnitId: string) => {
    const organizationId = nextAccess.organizationId
    const [people, care, followups, sessions, discipleships, pastoral, hopeSessions, firstSteps] = await Promise.all([
      listJourneyPeople(organizationId, nextUnitId),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess ? listCareRequests(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess ? listJourneyFollowups(nextAccess, nextUnitId) : Promise.resolve([]),
      nextAccess.canManagePresence || nextAccess.canManageMesa || nextAccess.broadJourneyAccess ? listPresenceSessions(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageDiscipleship || nextAccess.broadJourneyAccess ? listJourneyDiscipleships(nextAccess, nextUnitId) : Promise.resolve([]),
      nextAccess.canManagePastoral || nextAccess.broadJourneyAccess ? listPastoralHandoffs(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageImplementation || nextAccess.broadJourneyAccess ? listFieldHopeSessions(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageImplementation || nextAccess.broadJourneyAccess ? listFieldFirstSteps(nextAccess, nextUnitId) : Promise.resolve([]),
    ])
    const weeklySessions = sessions.filter(session => isInsideFieldWeek(session.openedAt))
    const checksBySession = await Promise.all(weeklySessions.map(session =>
      (nextAccess.canManagePresence || nextAccess.broadJourneyAccess)
        ? listPresenceChecks(organizationId, nextUnitId, session.id)
        : Promise.resolve([] as PresenceCheck[])
    ))
    const mesaBySession = await Promise.all(weeklySessions.map(session =>
      (nextAccess.canManageMesa || nextAccess.broadJourneyAccess)
        ? listMesaParticipationRecords(organizationId, nextUnitId, session.id)
        : Promise.resolve([] as MesaParticipationRecord[])
    ))
    const hopeParticipations = hopeSessions.length && (nextAccess.canManageImplementation || nextAccess.broadJourneyAccess)
      ? await listFieldHopeParticipations(organizationId, nextUnitId, hopeSessions.map(item => item.id))
      : []
    setData({
      people, care, followups, sessions,
      checks: checksBySession.flat(),
      mesa: mesaBySession.flat(),
      discipleships, pastoral, hopeSessions, hopeParticipations, firstSteps,
    })
    setHopeSessionId(current => current && hopeSessions.some(item => item.id === current) ? current : (hopeSessions.find(item => item.status === 'planned')?.id || hopeSessions[0]?.id || ''))
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!canViewJourneyReports(nextAccess) && !nextAccess.canManageImplementation) return
      const nextUnits = await listJourneyCongregations(nextAccess)
      setUnits(nextUnits)
      const nextUnit = resolveActiveJourneyCongregationId(nextAccess.organizationId, nextUnits)
      setUnitId(nextUnit)
      if (nextUnit) await loadScope(nextAccess, nextUnit)
    } catch (cause) {
      console.error(cause); setError(t.error)
    } finally { setLoading(false) }
  }, [loadScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  useEffect(() => {
    if (!access || !unitId || (!canViewJourneyReports(access) && !access.canManageImplementation)) return
    return subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId: unitId,
      collections: ['people','careRequests','followups','presenceSessions','presenceChecks','mesaParticipations','discipleships','pastoralHandoffs','fieldHopeSessions','fieldHopeParticipations','fieldFirstSteps'],
      onChange: () => { void loadScope(access, unitId) },
      onError: cause => console.error('Field guide live sync failed', cause),
    })
  }, [access, unitId, loadScope])

  async function selectUnit(nextUnit: string) {
    if (!access) return
    setUnitId(nextUnit); setActiveJourneyCongregationId(access.organizationId, nextUnit)
    setBusy(true); setError('')
    try { await loadScope(access, nextUnit) } catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  const unit = units.find(item => item.id === unitId)
  const unitProfile = resolveFieldGuideUnitProfile(unit?.name, unit?.city)
  const rhythm = FIELD_GUIDE_MONTHLY_RHYTHM[unitProfile]

  const metrics = useMemo(() => {
    const weeklySessions = data.sessions.filter(session => isInsideFieldWeek(session.openedAt))
    const weeklySessionIds = new Set(weeklySessions.map(session => session.id))
    const visitors = data.people.filter(person => isInsideFieldWeek(person.firstVisit)).length
    const personById = new Map(data.people.map(person => [person.id, person]))
    const presentPeople = new Set<string>()
    for (const session of weeklySessions) {
      const latest = latestChecksByPerson(data.checks.filter(check => check.sessionId === session.id))
      for (const [personId, check] of latest) if (check.state === 'present_confirmed') presentPeople.add(personId)
    }
    const returns = [...presentPeople].filter(personId => {
      const first = personById.get(personId)?.firstVisit
      return Boolean(first && Date.parse(first) < startOfFieldWeek().getTime())
    }).length
    const weeklyMesa = data.mesa.filter(item => weeklySessionIds.has(item.sessionId) && isInsideFieldWeek(item.updatedAt))
    const postServiceJoined = unique(weeklyMesa.filter(item => item.status === 'joined').map(item => `${item.sessionId}:${item.personId}`))
    const weeklyHopeIds = new Set(data.hopeSessions.filter(item => isInsideFieldWeek(item.scheduledFor)).map(item => item.id))
    const weeklyHope = data.hopeParticipations.filter(item => weeklyHopeIds.has(item.sessionId))
    const mesaPeople = unique(weeklyHope.map(item => `${item.sessionId}:${item.personId}`))
    const mesaJoined = unique(weeklyHope.filter(item => item.status === 'present').map(item => `${item.sessionId}:${item.personId}`))
    const prayer = data.care.filter(item => item.careType === 'prayer' && isInsideFieldWeek(item.requestedAt)).length
    const completedFollowups = data.followups.filter(item => item.status === 'completed' && isInsideFieldWeek(item.completedAt))
    const onTime = completedFollowups.filter(item => item.completedAt && Date.parse(item.completedAt) <= Date.parse(item.dueAt)).length
    const responses = completedFollowups.filter(item => item.outcomeCode && !['no_response','invalid_contact'].includes(item.outcomeCode)).length
    const absences = data.care.filter(item => item.careType === 'absence_check' && item.status === 'resolved' && isInsideFieldWeek(item.resolvedAt)).length
    const pastoral = data.pastoral.filter(item => isInsideFieldWeek(item.requestedAt)).length
    const explicitNext = unique([
      ...completedFollowups.filter(item => item.outcomeCode === 'group_interest' || item.outcomeCode === 'prayer_requested').map(item => item.personId),
      ...data.firstSteps.filter(item => isInsideFieldWeek(item.startedAt)).map(item => item.personId),
    ])
    const rootMeetings = data.firstSteps.filter(item => isInsideFieldWeek(item.lastCompletedAt)).length
    const rootActive = data.firstSteps.filter(item => item.status === 'active').length
    const newRoot = data.firstSteps.filter(item => isInsideFieldWeek(item.startedAt)).length
    const careDebt = data.care.filter(item => item.status === 'open' && evaluateCarePromise(careRequestToPromise(item)).state === 'debt').length
    const unassigned = data.care.filter(item => item.status === 'open' && !item.ownerRef).length
    const openPastoral = data.pastoral.filter(item => item.status === 'open').length
    return { visitors, returns, postServiceJoined, mesaPeople, mesaJoined, prayer, onTime, responses, absences, pastoral, explicitNext, rootMeetings, rootActive, newRoot, careDebt, unassigned, openPastoral }
  }, [data])

  const reportText = useMemo(() => {
    const unitName = unit?.name || t.unit
    const week = startOfFieldWeek().toLocaleDateString(locale)
    return [
      `RELATÓRIO SEMANAL — ${unitName} — semana de ${week}`,
      '',
      '1. Presença e acolhimento',
      `Visitantes: ${metrics.visitors}`,
      `Retornos: ${metrics.returns}`,
      `Pessoas que ficaram no pós-culto: ${metrics.postServiceJoined}`,
      `Pedidos de oração registrados: ${metrics.prayer}`,
      '',
      '2. Acompanhamento',
      `Contatos concluídos dentro do prazo: ${metrics.onTime}`,
      `Respostas registradas: ${metrics.responses}`,
      `Ausentes acompanhados: ${metrics.absences}`,
      `Casos repassados ao pastor: ${metrics.pastoral}`,
      '',
      '3. Mesa de Esperança / Mesa',
      `Convidados ou registros: ${metrics.mesaPeople}`,
      `Presentes: ${metrics.mesaJoined}`,
      `Próximos passos explícitos: ${metrics.explicitNext}`,
      '',
      '4. Primeiros Passos / Discipulado',
      `Encontros concluídos registrados: ${metrics.rootMeetings}`,
      `Pessoas em andamento: ${metrics.rootActive}`,
      `Novos acompanhamentos iniciados: ${metrics.newRoot}`,
      '',
      '5. Pontos de atenção',
      `Cuidados atrasados: ${metrics.careDebt}`,
      `Cuidados sem responsável: ${metrics.unassigned}`,
      `Encaminhamentos pastorais abertos: ${metrics.openPastoral}`,
      '',
      '6. Próximas ações',
      metrics.careDebt ? 'Priorizar cuidados atrasados.' : 'Manter o cuidado no prazo.',
      metrics.unassigned ? 'Distribuir cuidados ainda sem responsável.' : 'Responsabilidades de cuidado distribuídas.',
      metrics.openPastoral ? 'Revisar a fila pastoral restrita.' : 'Nenhum encaminhamento pastoral aberto.',
      '',
      'Nota: relatório factual. O NestJourney não atribui score espiritual nem registra “abertura” subjetiva.',
    ].join('\n')
  }, [locale, metrics, t.unit, unit?.name])

  const activeHopeSession = data.hopeSessions.find(item => item.id === hopeSessionId)
  const activeHopeParticipants = activeHopeSession ? data.hopeParticipations.filter(item => item.sessionId === activeHopeSession.id) : []
  const activeFirstSteps = data.firstSteps.filter(item => item.status !== 'completed')

  async function createHopeSession() {
    if (!access || !unitId || !access.canManageImplementation) return
    const theme = MESA_DE_ESPERANCA.find(item => item.id === hopeThemeId)
    if (!theme) return
    setBusy(true); setError('')
    try {
      const id = await createFieldHopeSession({ access, congregationId: unitId, themeId: theme.id, title: theme.title, scripture: theme.scripture, scheduledFor: `${hopeDate}T12:00:00` })
      setHopeSessionId(id); await loadScope(access, unitId); setMessage(t.fieldSaved)
    } catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function inviteHopePerson() {
    if (!access || !activeHopeSession || !hopePersonId || !access.canManageImplementation) return
    const person = data.people.find(item => item.id === hopePersonId)
    if (!person) return
    setBusy(true); setError('')
    try { await setFieldHopeParticipation({ access, session: activeHopeSession, person, status: 'invited' }); await loadScope(access, unitId); setMessage(t.fieldSaved) }
    catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function markHopePresent(personId: string) {
    if (!access || !activeHopeSession || !access.canManageImplementation) return
    const person = data.people.find(item => item.id === personId)
    if (!person) return
    setBusy(true); setError('')
    try { await setFieldHopeParticipation({ access, session: activeHopeSession, person, status: 'present' }); await loadScope(access, unitId); setMessage(t.fieldSaved) }
    catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function finishHopeSession() {
    if (!access || !activeHopeSession || !access.canManageImplementation) return
    setBusy(true); setError('')
    try { await completeFieldHopeSession({ access, session: activeHopeSession }); await loadScope(access, unitId); setMessage(t.fieldSaved) }
    catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function startFirstSteps() {
    if (!access || !firstPersonId || !access.canManageImplementation) return
    const person = data.people.find(item => item.id === firstPersonId)
    if (!person) return
    setBusy(true); setError('')
    try { await createFieldFirstSteps({ access, congregationId: unitId, person, facilitatorName: auth?.currentUser?.displayName || '' }); await loadScope(access, unitId); setMessage(t.fieldSaved) }
    catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function changeFirstSteps(record: FieldFirstStepsRecord, action: 'advance' | 'pause' | 'resume') {
    if (!access || !access.canManageImplementation) return
    setBusy(true); setError('')
    try { await updateFieldFirstSteps({ access, record, action }); await loadScope(access, unitId); setMessage(t.fieldSaved) }
    catch (cause) { console.error(cause); setError(t.error) } finally { setBusy(false) }
  }

  async function copyWeeklyReport() {
    try {
      await navigator.clipboard.writeText(reportText)
      setMessage(t.copied); window.setTimeout(() => setMessage(''), 1800)
    } catch { setError(t.error) }
  }

  if (loading) return <main className="field-guide-page"><div className="field-guide-loading">{t.loading}</div></main>
  if (!access || (!canViewJourneyReports(access) && !access.canManageImplementation)) {
    return <main className="field-guide-page"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} /></main>
  }

  const localStructure = unitProfile === 'generic' ? null : FIELD_GUIDE_LOCAL_STRUCTURE[unitProfile]

  return <main className="field-guide-page"><div className="field-guide-shell">
    <header className="field-guide-header">
      <div><span className="field-guide-kicker">NestJourney / Raiz e Mesa 2026</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <select value={locale} onChange={event => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map(id => <option value={id} key={id}>{localeLabels[id]}</option>)}</select>
    </header>

    {error ? <div className="field-guide-error">{error}</div> : null}
    {message ? <div className="field-guide-success"><CheckCircle2 size={16}/>{message}</div> : null}

    {units.length > 1 ? <section className="field-guide-toolbar"><label><span>{t.unit}</span><select value={unitId} disabled={busy} onChange={event => void selectUnit(event.target.value)}>{units.map(item => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label></section> : null}

    <section className="field-guide-callout">
      <HeartHandshake size={20}/><div><strong>{FIELD_GUIDE_FINAL_LOGIC}</strong><p>{t.factual}</p></div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><BarChart3 size={18}/></span><div><small>{t.thisWeek}</small><h2>{t.weeklyReport}</h2></div><button onClick={() => void copyWeeklyReport()}><ClipboardCopy size={15}/>{t.copyReport}</button></div>
      <div className="field-guide-metrics">
        {[
          [t.visitors, metrics.visitors],[t.returns, metrics.returns],[t.postService, metrics.postServiceJoined],[t.prayer, metrics.prayer],
          [t.onTime, metrics.onTime],[t.responses, metrics.responses],[t.absences, metrics.absences],[t.pastoral, metrics.pastoral],
          [t.mesaInvited, metrics.mesaPeople],[t.mesaJoined, metrics.mesaJoined],[t.explicitNext, metrics.explicitNext],
          [t.rootMeetings, metrics.rootMeetings],[t.rootActive, metrics.rootActive],[t.newRoot, metrics.newRoot],
        ].map(([label,value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <div className="field-guide-attention">
        <div><strong>{t.attention}</strong><span>{t.careDebt}: {metrics.careDebt}</span><span>{t.unassigned}: {metrics.unassigned}</span><span>{t.openPastoral}: {metrics.openPastoral}</span></div>
        <div><strong>{t.nextActions}</strong><a href="/care-integrity">{metrics.careDebt || metrics.unassigned ? (locale === 'en' ? 'Review Care now' : locale === 'es' ? 'Revisar Cuidado ahora' : 'Revisar Cuidado agora') : (locale === 'en' ? 'Open Care' : locale === 'es' ? 'Abrir Cuidado' : 'Abrir Cuidado')}</a><a href="/pastoral-handoff">{locale === 'en' ? 'Open pastoral handoffs' : locale === 'es' ? 'Abrir derivaciones pastorales' : 'Abrir encaminhamentos pastorais'}</a></div>
      </div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><HeartHandshake size={18}/></span><div><small>Manual de Campo</small><h2>{t.fieldOps}</h2></div></div>
      <p className="field-guide-language-note">{t.fieldOpsDesc}</p>
      <div className="field-guide-operations">
        <article>
          <h3>{t.hopeOps}</h3>
          {access.canManageImplementation ? <div className="field-guide-form-row">
            <label><span>{t.theme}</span><select value={hopeThemeId} onChange={event=>setHopeThemeId(event.target.value)}>{MESA_DE_ESPERANCA.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label><span>{t.date}</span><input type="date" value={hopeDate} onChange={event=>setHopeDate(event.target.value)}/></label>
            <button disabled={busy||!hopeDate} onClick={()=>void createHopeSession()}>{t.newHope}</button>
          </div> : null}
          {data.hopeSessions.length ? <>
            <label className="field-guide-session-select"><span>{t.session}</span><select value={hopeSessionId} onChange={event=>setHopeSessionId(event.target.value)}>{data.hopeSessions.map(item=><option key={item.id} value={item.id}>{new Date(item.scheduledFor).toLocaleDateString(locale)} · {item.title} · {item.status}</option>)}</select></label>
            {activeHopeSession ? <div className="field-guide-program-card"><div><strong>{activeHopeSession.title}</strong><small>{activeHopeSession.scripture} · {new Date(activeHopeSession.scheduledFor).toLocaleDateString(locale)}</small></div>{activeHopeSession.status==='planned'&&access.canManageImplementation?<button disabled={busy} onClick={()=>void finishHopeSession()}>{t.complete}</button>:null}</div> : null}
            {activeHopeSession && access.canManageImplementation ? <div className="field-guide-form-row"><label className="grow"><span>{t.person}</span><select value={hopePersonId} onChange={event=>setHopePersonId(event.target.value)}><option value="">—</option>{data.people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button disabled={busy||!hopePersonId} onClick={()=>void inviteHopePerson()}>{t.invite}</button></div> : null}
            <div className="field-guide-participants">{activeHopeParticipants.map(item=><div key={item.id}><span><strong>{item.personName||item.personId}</strong><small>{item.status}</small></span>{item.status==='invited'&&access.canManageImplementation?<button disabled={busy} onClick={()=>void markHopePresent(item.personId)}>{t.present}</button>:<CheckCircle2 size={16}/>}</div>)}</div>
          </> : <p className="field-guide-empty">{t.noHope}</p>}
        </article>

        <article>
          <h3>{t.firstOps}</h3>
          {access.canManageImplementation ? <div className="field-guide-form-row"><label className="grow"><span>{t.person}</span><select value={firstPersonId} onChange={event=>setFirstPersonId(event.target.value)}><option value="">—</option>{data.people.filter(person=>!activeFirstSteps.some(item=>item.personId===person.id)).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button disabled={busy||!firstPersonId} onClick={()=>void startFirstSteps()}>{t.startFirst}</button></div> : null}
          {activeFirstSteps.length ? <div className="field-guide-first-list">{activeFirstSteps.map(item=><div key={item.id}><span><strong>{item.personName||item.personId}</strong><small>{item.status==='paused'?'Pausado':`Encontro ${item.meeting}/6`}</small></span>{access.canManageImplementation?<div>{item.status==='active'?<><button disabled={busy} onClick={()=>void changeFirstSteps(item,'advance')}>{t.advance}</button><button className="ghost" disabled={busy} onClick={()=>void changeFirstSteps(item,'pause')}>{t.pause}</button></>:<button disabled={busy} onClick={()=>void changeFirstSteps(item,'resume')}>{t.resume}</button>}</div>:null}</div>)}</div> : <p className="field-guide-empty">{t.noFirst}</p>}
        </article>
      </div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><CalendarDays size={18}/></span><div><small>{unit?.name || t.unit}</small><h2>{t.rhythm}</h2></div></div>
      <div className="field-guide-rhythm">{rhythm.map(block => <article key={block.when}><strong>{block.when}</strong><ul>{block.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><UsersRound size={18}/></span><div><small>35–45 min</small><h2>{t.meetings}</h2></div></div>
      <div className="field-guide-meetings">
        <article><h3>{t.weeklyMeeting}</h3>{WEEKLY_COORDINATOR_AGENDA.map(block => <div className="field-guide-agenda" key={block.title}><b>{block.time}</b><span><strong>{block.title}</strong>{block.questions.map(question => <small key={question}>{question}</small>)}</span></div>)}</article>
        <article><h3>{t.biweekly}</h3><p>“Nosso objetivo não é fazer muitas coisas. É fazer poucas coisas com amor, clareza e constância.”</p><ul>{BIWEEKLY_REFINEMENT_QUESTIONS.map(question => <li key={question}>{question}</li>)}</ul></article>
      </div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><BookOpen size={18}/></span><div><small>Manual de Campo 2026</small><h2>{t.content}</h2></div></div>
      <p className="field-guide-language-note">{t.sourceLanguage}</p>

      <div className="field-guide-library">
        <details><summary><strong>{t.pulpit}</strong><span>{PULPIT_LINES.length}</span></summary><ol>{PULPIT_LINES.map((line,index) => <li key={line}><b>{index + 1}</b><p>{line}</p></li>)}</ol></details>

        <details><summary><strong>{t.hopeTable}</strong><span>{MESA_DE_ESPERANCA.length}</span></summary><div className="field-guide-lessons">{MESA_DE_ESPERANCA.map(item => <article key={item.id}><header><small>{item.scripture}</small><h3>{item.title}</h3><p>{item.objective}</p></header><b>Abertura</b><p>{item.opening}</p><b>Mini exposição</b><p>{item.exposition}</p><b>Perguntas</b><ul>{item.questions.map(question => <li key={question}>{question}</li>)}</ul><b>Oração final</b><p>{item.prayer}</p>{item.nextStep ? <><b>Próximo passo</b><p>{item.nextStep}</p></> : null}</article>)}</div></details>

        <details><summary><strong>{t.firstSteps}</strong><span>{PRIMEIROS_PASSOS.length}</span></summary><div className="field-guide-lessons">{PRIMEIROS_PASSOS.map(item => <article key={item.id}><header><small>{item.scripture}</small><h3>{item.title}</h3></header><b>Abertura</b><p>{item.opening}</p>{item.transition ? <><b>Transição</b><p>{item.transition}</p></> : null}<b>Explicação</b><p>{item.explanation}</p><b>Perguntas</b><ul>{item.questions.map(question => <li key={question}>{question}</li>)}</ul><b>Aplicação</b><p>{item.application}</p><b>Oração</b><p>{item.prayer}</p><b>Próximo passo</b><p>{item.nextStep}</p></article>)}</div></details>
      </div>
    </section>

    <section className="field-guide-section">
      <div className="field-guide-section-head"><span><MessageCircle size={18}/></span><div><small>{unit?.name || t.unit}</small><h2>{t.local}</h2></div></div>
      {localStructure ? <div className="field-guide-local"><article><h3>{localStructure.title}</h3><ul>{localStructure.team.map(item => <li key={item}>{item}</li>)}</ul></article><article><h3>Fluxo prático</h3><ol>{localStructure.flow.map(item => <li key={item}>{item}</li>)}</ol>{'note' in localStructure && localStructure.note ? <p className="field-guide-note">{localStructure.note}</p> : null}</article></div> : <p className="field-guide-language-note">A unidade não corresponde a um dos pilotos de Cambé/Londrina. O NestJourney mantém o modelo genérico configurável sem fixar regras locais na arquitetura.</p>}
      <div className="field-guide-rules">{FIELD_GUIDE_SIMPLICITY_RULES.map(rule => <span key={rule}>{rule}</span>)}</div>
    </section>
  </div></main>
}
