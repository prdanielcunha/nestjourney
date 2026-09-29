import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCopy, HeartHandshake, MessageCircle, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import {
  careRequestToPromise,
  getActiveJourneyOrganizationId,
  latestChecksByPerson,
  listCareRequests,
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
  subscribeJourneyLiveChanges,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyFollowupRecord,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type MesaParticipationRecord,
  type PresenceCheck,
  type PresenceSessionRecord,
} from './journeyRepository'
import { evaluateCarePromise } from './intelligence'
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
}

const emptyData: FieldData = { people: [], care: [], followups: [], sessions: [], checks: [], mesa: [], discipleships: [], pastoral: [] }

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

  const loadScope = useCallback(async (nextAccess: JourneyAccessContext, nextUnitId: string) => {
    const organizationId = nextAccess.organizationId
    const [people, care, followups, sessions, discipleships, pastoral] = await Promise.all([
      listJourneyPeople(organizationId, nextUnitId),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess ? listCareRequests(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess ? listJourneyFollowups(nextAccess, nextUnitId) : Promise.resolve([]),
      nextAccess.canManagePresence || nextAccess.canManageMesa || nextAccess.broadJourneyAccess ? listPresenceSessions(organizationId, nextUnitId) : Promise.resolve([]),
      nextAccess.canManageDiscipleship || nextAccess.broadJourneyAccess ? listJourneyDiscipleships(nextAccess, nextUnitId) : Promise.resolve([]),
      nextAccess.canManagePastoral || nextAccess.broadJourneyAccess ? listPastoralHandoffs(organizationId, nextUnitId) : Promise.resolve([]),
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
    setData({
      people, care, followups, sessions,
      checks: checksBySession.flat(),
      mesa: mesaBySession.flat(),
      discipleships, pastoral,
    })
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
      collections: ['people','careRequests','followups','presenceSessions','presenceChecks','mesaParticipations','discipleships','pastoralHandoffs'],
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
    const mesaPeople = unique(weeklyMesa.map(item => `${item.sessionId}:${item.personId}`))
    const mesaJoined = unique(weeklyMesa.filter(item => item.status === 'joined').map(item => `${item.sessionId}:${item.personId}`))
    const prayer = data.care.filter(item => item.careType === 'prayer' && isInsideFieldWeek(item.requestedAt)).length
    const completedFollowups = data.followups.filter(item => item.status === 'completed' && isInsideFieldWeek(item.completedAt))
    const onTime = completedFollowups.filter(item => item.completedAt && Date.parse(item.completedAt) <= Date.parse(item.dueAt)).length
    const responses = completedFollowups.filter(item => item.outcomeCode && !['no_response','invalid_contact'].includes(item.outcomeCode)).length
    const absences = data.care.filter(item => item.careType === 'absence_check' && item.status === 'resolved' && isInsideFieldWeek(item.resolvedAt)).length
    const pastoral = data.pastoral.filter(item => isInsideFieldWeek(item.requestedAt)).length
    const explicitNext = unique([
      ...completedFollowups.filter(item => item.outcomeCode === 'group_interest' || item.outcomeCode === 'prayer_requested').map(item => item.personId),
      ...data.discipleships.filter(item => isInsideFieldWeek(item.startedAt)).map(item => item.personId),
    ])
    const rootMeetings = data.discipleships.filter(item => isInsideFieldWeek(item.lastCompletedAt)).length
    const rootActive = data.discipleships.filter(item => item.status === 'active').length
    const newRoot = data.discipleships.filter(item => isInsideFieldWeek(item.startedAt)).length
    const careDebt = data.care.filter(item => item.status === 'open' && evaluateCarePromise(careRequestToPromise(item)).state === 'debt').length
    const unassigned = data.care.filter(item => item.status === 'open' && !item.ownerRef).length
    const openPastoral = data.pastoral.filter(item => item.status === 'open').length
    return { visitors, returns, mesaPeople, mesaJoined, prayer, onTime, responses, absences, pastoral, explicitNext, rootMeetings, rootActive, newRoot, careDebt, unassigned, openPastoral }
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
      `Pessoas que ficaram no pós-culto: ${metrics.mesaJoined}`,
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
          [t.visitors, metrics.visitors],[t.returns, metrics.returns],[t.postService, metrics.mesaJoined],[t.prayer, metrics.prayer],
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
