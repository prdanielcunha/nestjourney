import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, CheckCircle2, HeartHandshake, Leaf, MessageCircleWarning, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import {
  canManageJourneyAutomations,
  canManageSafeVoice,
  canRevealSafeVoiceIdentity,
  canViewJourneyIntelligence,
  createJourneyWorkflow,
  getActiveJourneyOrganizationId,
  listCareRequests,
  listExitFeedback,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroups,
  listJourneyPeople,
  listJourneyPulseCheckins,
  listJourneyWorkflows,
  listMemberSignals,
  listPresenceChecks,
  listPresenceSessions,
  listSafeVoiceCases,
  loadJourneyAccess,
  loadMemberSignalPrivate,
  loadSafeVoiceReporterUid,
  resolveActiveJourneyCongregationId,
  resolveMemberSignal,
  resolveSafeVoiceCase,
  setActiveJourneyCongregationId,
  setJourneyWorkflowEnabled,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyExitFeedback,
  type JourneyGroupRecord,
  type JourneyMemberSignal,
  type JourneyPersonRecord,
  type JourneyPulseCheckin,
  type JourneySafeVoiceCase,
  type JourneyWorkflowRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import {
  buildBelongingSignals,
  buildJourneyInsights,
  buildJourneyIntelligenceSnapshot,
  evaluateJourneyWorkflow,
  parseJourneyWorkflowDraft,
  type JourneyBelongingSignal,
} from './journeyAdvanced'
import { getInitialLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './JourneyIntelligencePage.css'

const copy={
  'pt-BR':{
    title:'Inteligência de Cuidado',subtitle:'Sinais explicáveis construídos somente a partir de registros reais. Nenhum diagnóstico, score espiritual ou adivinhação sobre pessoas.',
    loading:'Montando inteligência…',unit:'Unidade',attention:'Pontos de atenção',clear:'Nenhum sinal crítico agora',clearBody:'A unidade está sem sinais objetivos que peçam decisão neste momento.',
    pulse:'Pulse',pulseDesc:'Leitura agregada e voluntária dos últimos 30 dias. Identidade não aparece nesta visão.',
    belonging:'Vínculos',belongingDesc:'Pessoas com presença recorrente nos últimos 90 dias e sem vínculo registrado além do culto. Isso não significa solidão, desinteresse ou risco de saída.',
    visits:'presenças',signals:'Solicitações de membros',signalsDesc:'Pedidos iniciados voluntariamente na Minha Jornada. Abra somente o necessário para concluir o cuidado.',
    showValue:'Ver dado protegido',resolve:'Concluir',safeVoice:'Canal seguro',safeVoiceDesc:'Casos separados da operação comum. A identidade permanece protegida e conflito de interesse bloqueia o acesso.',
    reveal:'Revelar identidade autorizada',protected:'Identidade protegida',exit:'Saídas e pausas',exitDesc:'Tendências agregadas dos últimos 90 dias. O motivo registrado não é usado para prever comportamento individual.',
    workflows:'Fluxos inteligentes',workflowsDesc:'Descreva uma regra simples. O NestJourney só aceita condições objetivas e ações seguras; nada é enviado automaticamente.',
    workflowPlaceholder:'Ex.: Quando houver 2 cuidados atrasados, criar tarefa',understood:'Regra entendida',notUnderstood:'Use cuidado atrasado, sem responsável, capacidade, próximo encontro, pedido de ajuda ou saída.',
    create:'Criar fluxo',enabled:'Ativo',disabled:'Pausado',matched:'Precisa de atenção agora',quiet:'Sem condição atingida',evidence:'Evidência',
    reasons:{moving:'Mudança',routine:'Rotina/horários',another_church:'Outra igreja',lack_of_connection:'Falta de conexão',negative_experience:'Experiência negativa',disagreement:'Discordância',other:'Outro'} as Record<string,string>,
    pulseStates:{well:'Bem',prayer:'Oração',talk:'Conversar',help:'Ajuda',feedback:'Feedback',prefer_not_now:'Prefere não falar'} as Record<string,string>,
    errors:'Não foi possível carregar esta visão.',retry:'Tentar novamente',noAccess:'Seu papel não possui acesso à inteligência agregada.',
  },
  en:{
    title:'Care Intelligence',subtitle:'Explainable signals built only from recorded facts. No diagnosis, spiritual score, or guessing about people.',
    loading:'Building intelligence…',unit:'Campus',attention:'Attention points',clear:'No critical signal right now',clearBody:'This campus has no objective signal requiring a decision at this moment.',
    pulse:'Pulse',pulseDesc:'Aggregate voluntary reading from the last 30 days. Identity is not shown in this view.',
    belonging:'Relationships',belongingDesc:'People with recurring presence in the last 90 days and no recorded relationship beyond services. This does not mean loneliness, disinterest, or exit risk.',
    visits:'presences',signals:'Member requests',signalsDesc:'Requests voluntarily started in My Journey. Open only what is needed to complete care.',
    showValue:'View protected data',resolve:'Resolve',safeVoice:'Safe channel',safeVoiceDesc:'Cases separated from normal operations. Identity remains protected and conflicts of interest block access.',
    reveal:'Reveal authorized identity',protected:'Protected identity',exit:'Exits and pauses',exitDesc:'Aggregate trends from the last 90 days. Recorded reasons are not used to predict individual behavior.',
    workflows:'Smart workflows',workflowsDesc:'Describe a simple rule. NestJourney accepts only objective conditions and safe actions; nothing is sent automatically.',
    workflowPlaceholder:'E.g. When there are 2 overdue care items, create task',understood:'Rule understood',notUnderstood:'Use overdue care, unassigned care, capacity, next meeting, help request, or exit.',
    create:'Create workflow',enabled:'Active',disabled:'Paused',matched:'Needs attention now',quiet:'Condition not reached',evidence:'Evidence',
    reasons:{moving:'Moving',routine:'Routine/schedule',another_church:'Another church',lack_of_connection:'Lack of connection',negative_experience:'Negative experience',disagreement:'Disagreement',other:'Other'} as Record<string,string>,
    pulseStates:{well:'Well',prayer:'Prayer',talk:'Talk',help:'Help',feedback:'Feedback',prefer_not_now:'Prefers not to talk'} as Record<string,string>,
    errors:'This view could not be loaded.',retry:'Try again',noAccess:'Your role does not have access to aggregate intelligence.',
  },
  es:{
    title:'Inteligencia de Cuidado',subtitle:'Señales explicables construidas solo desde registros reales. Sin diagnóstico, puntuación espiritual ni adivinación sobre personas.',
    loading:'Montando inteligencia…',unit:'Sede',attention:'Puntos de atención',clear:'Ninguna señal crítica ahora',clearBody:'La sede no tiene señales objetivas que requieran decisión en este momento.',
    pulse:'Pulse',pulseDesc:'Lectura agregada y voluntaria de los últimos 30 días. La identidad no aparece en esta vista.',
    belonging:'Vínculos',belongingDesc:'Personas con presencia recurrente en los últimos 90 días y sin vínculo registrado fuera del culto. Esto no significa soledad, desinterés ni riesgo de salida.',
    visits:'presencias',signals:'Solicitudes de miembros',signalsDesc:'Solicitudes iniciadas voluntariamente en Mi Jornada. Abre solo lo necesario para concluir el cuidado.',
    showValue:'Ver dato protegido',resolve:'Concluir',safeVoice:'Canal seguro',safeVoiceDesc:'Casos separados de la operación común. La identidad queda protegida y los conflictos de interés bloquean acceso.',
    reveal:'Revelar identidad autorizada',protected:'Identidad protegida',exit:'Salidas y pausas',exitDesc:'Tendencias agregadas de los últimos 90 días. El motivo registrado no se usa para predecir comportamiento individual.',
    workflows:'Flujos inteligentes',workflowsDesc:'Describe una regla simple. NestJourney acepta solo condiciones objetivas y acciones seguras; nada se envía automáticamente.',
    workflowPlaceholder:'Ej.: Cuando haya 2 cuidados atrasados, crear tarea',understood:'Regla entendida',notUnderstood:'Usa cuidado atrasado, sin responsable, capacidad, próximo encuentro, pedido de ayuda o salida.',
    create:'Crear flujo',enabled:'Activo',disabled:'Pausado',matched:'Necesita atención ahora',quiet:'Condición no alcanzada',evidence:'Evidencia',
    reasons:{moving:'Mudanza',routine:'Rutina/horarios',another_church:'Otra iglesia',lack_of_connection:'Falta de conexión',negative_experience:'Experiencia negativa',disagreement:'Desacuerdo',other:'Otro'} as Record<string,string>,
    pulseStates:{well:'Bien',prayer:'Oración',talk:'Conversar',help:'Ayuda',feedback:'Feedback',prefer_not_now:'Prefiere no hablar'} as Record<string,string>,
    errors:'No se pudo cargar esta vista.',retry:'Intentar de nuevo',noAccess:'Tu papel no tiene acceso a la inteligencia agregada.',
  },
} as const

function lastDays(value:string,days:number){return Date.parse(value)>=Date.now()-days*24*60*60*1000}

export default function JourneyIntelligencePage(){
  const [locale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [care,setCare]=useState<CareRequestRecord[]>([])
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([])
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [belonging,setBelonging]=useState<JourneyBelongingSignal[]>([])
  const [pulse,setPulse]=useState<JourneyPulseCheckin[]>([])
  const [signals,setSignals]=useState<JourneyMemberSignal[]>([])
  const [safeVoice,setSafeVoice]=useState<JourneySafeVoiceCase[]>([])
  const [exitFeedback,setExitFeedback]=useState<JourneyExitFeedback[]>([])
  const [workflows,setWorkflows]=useState<JourneyWorkflowRecord[]>([])
  const [privateValues,setPrivateValues]=useState<Record<string,string>>({})
  const [reporters,setReporters]=useState<Record<string,string>>({})
  const [workflowText,setWorkflowText]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const loadScope=useCallback(async(nextAccess:JourneyAccessContext,nextUnit:string)=>{
    const safe=<T,>(promise:Promise<T>,fallback:T)=>promise.catch(cause=>{console.warn(cause);return fallback})
    const [nextPeople,nextCare,nextGroups,nextDiscipleships,nextSessions,nextPulse,nextSignals,nextVoice,nextExit,nextWorkflows]=await Promise.all([
      safe(listJourneyPeople(nextAccess.organizationId,nextUnit),[] as JourneyPersonRecord[]),
      nextAccess.canManageCare?safe(listCareRequests(nextAccess.organizationId,nextUnit),[] as CareRequestRecord[]):Promise.resolve([] as CareRequestRecord[]),
      safe(listJourneyGroups(nextAccess.organizationId,nextUnit),[] as JourneyGroupRecord[]),
      nextAccess.canManageDiscipleship?safe(listJourneyDiscipleships(nextAccess,nextUnit),[] as JourneyDiscipleshipRecord[]):Promise.resolve([] as JourneyDiscipleshipRecord[]),
      nextAccess.canManagePresence?safe(listPresenceSessions(nextAccess.organizationId,nextUnit),[] as PresenceSessionRecord[]):Promise.resolve([] as PresenceSessionRecord[]),
      safe(listJourneyPulseCheckins(nextAccess.organizationId,nextUnit),[] as JourneyPulseCheckin[]),
      (nextAccess.canManageCare||nextAccess.canManagePastoral||nextAccess.canManagePrivacy)?safe(listMemberSignals(nextAccess,nextUnit),[] as JourneyMemberSignal[]):Promise.resolve([] as JourneyMemberSignal[]),
      canManageSafeVoice(nextAccess)?safe(listSafeVoiceCases(nextAccess,nextUnit),[] as JourneySafeVoiceCase[]):Promise.resolve([] as JourneySafeVoiceCase[]),
      safe(listExitFeedback(nextAccess,nextUnit),[] as JourneyExitFeedback[]),
      safe(listJourneyWorkflows(nextAccess,nextUnit),[] as JourneyWorkflowRecord[]),
    ])
    setPeople(nextPeople);setCare(nextCare);setGroups(nextGroups);setDiscipleships(nextDiscipleships);setSessions(nextSessions)
    setPulse(nextPulse);setSignals(nextSignals);setSafeVoice(nextVoice);setExitFeedback(nextExit);setWorkflows(nextWorkflows)
    if(nextAccess.canManagePresence&&nextSessions.length){
      const recent=nextSessions.filter(item=>item.status==='closed'&&lastDays(item.openedAt,90)).slice(0,16)
      const checkSets=await Promise.all(recent.map(session=>safe(listPresenceChecks(nextAccess.organizationId,nextUnit,session.id),[])))
      setBelonging(buildBelongingSignals({people:nextPeople,careRequests:nextCare,discipleships:nextDiscipleships,sessions:recent,checks:checkSets.flat()}))
    }else setBelonging([])
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!canViewJourneyIntelligence(nextAccess))return
      const nextUnits=await listJourneyCongregations(nextAccess);setUnits(nextUnits)
      const nextUnit=resolveActiveJourneyCongregationId(nextAccess.organizationId,nextUnits);setUnitId(nextUnit)
      if(nextUnit)await loadScope(nextAccess,nextUnit)
    }catch(cause){console.error(cause);setError(t.errors)}finally{setLoading(false)}
  },[loadScope,t.errors])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function changeUnit(next:string){
    if(!access)return
    setUnitId(next);setActiveJourneyCongregationId(access.organizationId,next);setBusy('scope')
    try{await loadScope(access,next)}finally{setBusy('')}
  }
  async function refresh(){if(access&&unitId)await loadScope(access,unitId)}
  async function act(key:string,fn:()=>Promise<unknown>){
    setBusy(key);setError('')
    try{await fn();await refresh()}catch(cause){console.error(cause);setError(t.errors)}finally{setBusy('')}
  }

  const snapshot=useMemo(()=>buildJourneyIntelligenceSnapshot({careRequests:care,groups,discipleships,pulse,safeVoice,exitFeedback,belonging,memberSignals:signals}),[care,groups,discipleships,pulse,safeVoice,exitFeedback,belonging,signals])
  const insights=useMemo(()=>buildJourneyInsights(snapshot),[snapshot])
  const workflowDraft=useMemo(()=>parseJourneyWorkflowDraft(workflowText),[workflowText])
  const activeUnit=units.find(item=>item.id===unitId)
  const pulseRecent=pulse.filter(item=>lastDays(item.createdAt,30))
  const pulseCounts=Object.fromEntries(['well','prayer','talk','help','feedback','prefer_not_now'].map(state=>[state,pulseRecent.filter(item=>item.state===state).length]))
  const exitRecent=exitFeedback.filter(item=>lastDays(item.createdAt,90))
  const exitCounts=exitRecent.reduce<Record<string,number>>((acc,item)=>{acc[item.reason]=(acc[item.reason]??0)+1;return acc},{})
  const openSignals=signals.filter(item=>item.status==='open')
  const focus=insights[0]

  if(loading)return <main className="journey-intelligence"><div className="ji-loading">{t.loading}</div></main>
  if(!access||!canViewJourneyIntelligence(access))return <main className="journey-intelligence"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} retryLabel={t.retry} onRetry={()=>void bootstrap()}/></main>

  return <main className="journey-intelligence"><div className="ji-shell">
    <header className="ji-hero"><div><span>NestJourney / Intelligence</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>{units.length>1?<label><small>{t.unit}</small><select value={unitId} disabled={Boolean(busy)} onChange={e=>void changeUnit(e.target.value)}>{units.map(unit=><option value={unit.id} key={unit.id}>{unit.name}</option>)}</select></label>:null}</header>
    {error?<div className="ji-error">{error}</div>:null}

    <JourneyAreaFocus
      locale={locale}
      context={activeUnit?.name}
      title={focus?t.attention+' · '+focus.count:t.clear}
      body={focus?focus.kind.replaceAll('_',' ')+' · '+focus.evidenceRefs.join(' · '):t.clearBody}
      metrics={[
        {label:locale==='en'?'Overdue care':locale==='es'?'Cuidado atrasado':'Cuidado atrasado',value:snapshot.careOverdue,tone:snapshot.careOverdue?'attention':'muted'},
        {label:locale==='en'?'Open member requests':locale==='es'?'Solicitudes abiertas':'Solicitações abertas',value:snapshot.memberSignalsOpen,tone:snapshot.memberSignalsOpen?'attention':'muted'},
        {label:locale==='en'?'Relationship watch':locale==='es'?'Vínculos a observar':'Vínculos a observar',value:snapshot.belongingWithoutRelationship,tone:snapshot.belongingWithoutRelationship?'attention':'muted'},
      ]}
      actions={focus?[{label:locale==='en'?'Open evidence':locale==='es'?'Abrir evidencia':'Abrir evidência',href:focus.actionHref,primary:true}]:[{label:locale==='en'?'Back to Today':locale==='es'?'Volver a Hoy':'Voltar para Hoje',href:'/my-today',primary:true}]}
    />

    <section className="ji-section">
      <header><BrainCircuit size={18}/><div><h2>{t.attention}</h2><p>{t.subtitle}</p></div></header>
      <div className="ji-insights">{insights.length?insights.map(item=><a href={item.actionHref} key={item.id} className={item.severity}><span><strong>{item.kind.replaceAll('_',' ')}</strong><small>{t.evidence}: {item.evidenceRefs.join(' · ')}</small></span><b>{item.count}</b><ArrowRight size={14}/></a>):<div className="ji-empty"><CheckCircle2 size={19}/>{t.clear}</div>}</div>
    </section>

    <div className="ji-grid">
      <section className="ji-section" id="pulse"><header><HeartHandshake size={18}/><div><h2>{t.pulse}</h2><p>{t.pulseDesc}</p></div></header><div className="ji-stats">{Object.entries(pulseCounts).map(([state,count])=><div key={state}><span>{t.pulseStates[state]??state}</span><strong>{count}</strong></div>)}</div></section>
      <section className="ji-section" id="exit"><header><Leaf size={18}/><div><h2>{t.exit}</h2><p>{t.exitDesc}</p></div></header><div className="ji-stats">{Object.entries(exitCounts).length?Object.entries(exitCounts).map(([reason,count])=><div key={reason}><span>{t.reasons[reason]??reason}</span><strong>{count}</strong></div>):<div><span>{locale==='en'?'Last 90 days':locale==='es'?'Últimos 90 días':'Últimos 90 dias'}</span><strong>0</strong></div>}</div></section>
    </div>

    <section className="ji-section" id="belonging"><header><UsersRound size={18}/><div><h2>{t.belonging}</h2><p>{t.belongingDesc}</p></div></header><div className="ji-list">{belonging.length?belonging.map(item=><article key={item.personId}><span><strong>{item.personName}</strong><small>{item.evidenceRefs.slice(1).join(' · ')}</small></span><b>{item.presentSessions} {t.visits}</b><a href={'/journey-profile?person='+encodeURIComponent(item.personId)}><ArrowRight size={14}/></a></article>):<div className="ji-empty"><CheckCircle2 size={19}/>{t.clear}</div>}</div></section>

    {(access.canManageCare||access.canManagePastoral||access.canManagePrivacy)?<section className="ji-section" id="signals"><header><MessageCircleWarning size={18}/><div><h2>{t.signals}</h2><p>{t.signalsDesc}</p></div></header><div className="ji-list">{openSignals.length?openSignals.map(item=><article key={item.id}><span><strong>{item.kind.replaceAll('_',' ')}</strong><small>{new Date(item.createdAt).toLocaleString(locale)}</small>{privateValues[item.id]?<em>{privateValues[item.id]}</em>:null}</span><div className="ji-row-actions">{item.kind==='contact_update'&&access.canManagePrivacy?<button disabled={Boolean(busy)} onClick={()=>void act('private-'+item.id,async()=>setPrivateValues(current=>({...current,[item.id]:await loadMemberSignalPrivate(access,item.id)})))}>{t.showValue}</button>:null}<button disabled={Boolean(busy)} onClick={()=>void act('signal-'+item.id,()=>resolveMemberSignal(access,item))}>{t.resolve}</button></div></article>):<div className="ji-empty"><CheckCircle2 size={19}/>{t.clear}</div>}</div></section>:null}

    {canManageSafeVoice(access)?<section className="ji-section" id="safe-voice"><header><ShieldCheck size={18}/><div><h2>{t.safeVoice}</h2><p>{t.safeVoiceDesc}</p></div></header><div className="ji-safe-list">{safeVoice.length?safeVoice.map(item=><article key={item.id}><div><span>{item.category.replaceAll('_',' ')}</span><strong>{item.summary}</strong><small>{new Date(item.createdAt).toLocaleString(locale)} · {item.reporterMode==='confidential'?t.protected:(reporters[item.id]||t.protected)}</small></div><div>{item.reporterMode==='identified'&&canRevealSafeVoiceIdentity(access)&&!reporters[item.id]?<button onClick={()=>void act('reporter-'+item.id,async()=>setReporters(current=>({...current,[item.id]:await loadSafeVoiceReporterUid(access,item.id)})))}>{t.reveal}</button>:null}{item.status==='open'?<button className="primary" onClick={()=>void act('voice-'+item.id,()=>resolveSafeVoiceCase(access,item))}>{t.resolve}</button>:null}</div></article>):<div className="ji-empty"><CheckCircle2 size={19}/>{t.clear}</div>}</div></section>:null}

    <section className="ji-section" id="workflows"><header><Sparkles size={18}/><div><h2>{t.workflows}</h2><p>{t.workflowsDesc}</p></div></header>
      {canManageJourneyAutomations(access)?<div className="ji-builder"><input value={workflowText} onChange={e=>setWorkflowText(e.target.value)} placeholder={t.workflowPlaceholder}/><div className={workflowDraft?'understood':'hint'}>{workflowText.trim()?(workflowDraft?t.understood+': '+workflowDraft.condition+' → '+workflowDraft.action+' · '+workflowDraft.threshold:t.notUnderstood):t.notUnderstood}</div><button className="ji-primary" disabled={!workflowDraft||Boolean(busy)} onClick={()=>workflowDraft&&void act('workflow-create',async()=>{await createJourneyWorkflow({access,congregationId:unitId,...workflowDraft});setWorkflowText('')})}>{t.create}</button></div>:null}
      <div className="ji-workflows">{workflows.length?workflows.map(item=>{const matched=evaluateJourneyWorkflow(item,snapshot);return <article key={item.id}><span><strong>{item.label}</strong><small>{item.condition} · {item.action} · ≥ {item.threshold}</small></span><b className={matched?'matched':''}>{matched?t.matched:t.quiet}</b>{canManageJourneyAutomations(access)?<button onClick={()=>void act('workflow-'+item.id,()=>setJourneyWorkflowEnabled(access,item,!item.enabled))}>{item.enabled?t.enabled:t.disabled}</button>:null}</article>}):<div className="ji-empty">{locale==='en'?'No workflow configured.':locale==='es'?'Ningún flujo configurado.':'Nenhum fluxo configurado.'}</div>}</div>
    </section>

    <footer className="ji-principle"><ShieldCheck size={16}/><p>{locale==='en'?'Every signal stays traceable to recorded evidence. Missing data never becomes a conclusion about a person.':locale==='es'?'Toda señal permanece rastreable a evidencia registrada. La ausencia de datos nunca se convierte en conclusión sobre una persona.':'Todo sinal permanece rastreável a evidência registrada. Ausência de dados nunca vira conclusão sobre uma pessoa.'}</p></footer>
  </div></main>
}
