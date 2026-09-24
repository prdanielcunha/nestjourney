import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock3, HeartHandshake, House, Leaf,
  ShieldAlert, ShieldCheck, UserCheck, UserRound, UsersRound,
} from 'lucide-react'
import { auth } from './firebase'
import { buildMyTodayItems, type MyTodayKind } from './myToday'
import { buildTodayPrimaryAction } from './todayActionCenter'
import {
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroups,
  listJourneyOrganizationsForSystemAdmin,
  listJourneyPeople,
  listMesaParticipationRecords,
  loadMesaPreparation,
  listPastoralHandoffs,
  listPresenceSessions,
  loadJourneyAccess,
  setActiveJourneyOrganizationId,
  subscribeJourneyLiveChanges,
  type JourneyLiveCollection,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyOrganizationSummary,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type MesaParticipationRecord,
  type MesaPreparationRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { resolveJourneyResponsibility, type JourneyResponsibility } from './journeyExperience'
import { getInitialLocale, localeLabels, myTodayCopy, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import './MyTodayPage.css'

type Filter='all'|'care'|'presence'|'mesa'|'groups'|'discipleship'|'pastoral'

function filterFor(kind:MyTodayKind):Exclude<Filter,'all'|'mesa'>{
  if(kind.startsWith('care_'))return 'care'
  if(kind==='presence_open')return 'presence'
  if(kind==='group_attention')return 'groups'
  if(kind==='pastoral_handoff')return 'pastoral'
  return 'discipleship'
}

const focusCopy:Record<AppLocale,Record<JourneyResponsibility,{title:string;body:string}>>={
  'pt-BR':{
    presence_host:{title:'Presença',body:'Receba, confirme e registre apenas o vínculo necessário para o próximo passo.'},
    mesa_team:{title:'Mesa Aberta',body:'Prepare o ambiente e ajude a comunhão continuar depois do culto.'},
    caregiver:{title:'Cuidado & Conexão',body:'Comece por quem tem contato atribuído e promessa de cuidado em 24–48 horas.'},
    group_leader:{title:'Casa de Paz',body:'Cuide da sua Casa, participantes, capacidade e próximo encontro.'},
    discipler:{title:'Raiz',body:'Acompanhe encontro, próxima data e continuidade de quem está caminhando com você.'},
    coordinator:{title:'Coordenação',body:'Distribua carga, resolva pendências e mantenha as áreas simples para a equipe.'},
    pastor:{title:'Cuidado pastoral',body:'Veja apenas o que pede decisão pastoral, sem transformar histórias em prontuário.'},
    admin:{title:'Organização',body:'Acompanhe operação, equipe e cada área sem precisar abrir módulo por módulo.'},
    ceo:{title:'Visão CEO',body:'Leia o ecossistema, escolha organização e unidade e entre somente onde existe atenção real.'},
    member:{title:'Sua jornada',body:'Quando uma responsabilidade for atribuída, o NestJourney mostra o que precisa ser feito.'},
  },
  en:{
    presence_host:{title:'Presence',body:'Welcome, confirm, and record only the relationship needed for the next step.'},
    mesa_team:{title:'Open Table',body:'Prepare the environment and help community continue after the service.'},
    caregiver:{title:'Care & Connection',body:'Start with assigned contacts and the 24–48 hour care promise.'},
    group_leader:{title:'Peace House',body:'Care for your group, participants, capacity, and next meeting.'},
    discipler:{title:'Root',body:'Follow the meeting, next date, and continuity for the people walking with you.'},
    coordinator:{title:'Coordination',body:'Distribute workload, resolve pending work, and keep each area simple for the team.'},
    pastor:{title:'Pastoral care',body:'See only what needs pastoral decision without turning stories into case files.'},
    admin:{title:'Organization',body:'Follow operations, team, and every area without opening modules one by one.'},
    ceo:{title:'CEO view',body:'Read the ecosystem, choose organization and campus, and enter only where attention is real.'},
    member:{title:'Your journey',body:'When a responsibility is assigned, NestJourney shows what needs to be done.'},
  },
  es:{
    presence_host:{title:'Presencia',body:'Recibe, confirma y registra solo el vínculo necesario para el próximo paso.'},
    mesa_team:{title:'Mesa Abierta',body:'Prepara el ambiente y ayuda a que la comunión continúe después del culto.'},
    caregiver:{title:'Cuidado & Conexión',body:'Empieza por los contactos asignados y la promesa de cuidado en 24–48 horas.'},
    group_leader:{title:'Casa de Paz',body:'Cuida tu Casa, participantes, capacidad y próximo encuentro.'},
    discipler:{title:'Raíz',body:'Acompaña encuentro, próxima fecha y continuidad de quienes caminan contigo.'},
    coordinator:{title:'Coordinación',body:'Distribuye carga, resuelve pendientes y mantén cada área simple para el equipo.'},
    pastor:{title:'Cuidado pastoral',body:'Ve solo lo que requiere decisión pastoral sin convertir historias en expediente.'},
    admin:{title:'Organización',body:'Acompaña operación, equipo y cada área sin abrir módulo por módulo.'},
    ceo:{title:'Visión CEO',body:'Lee el ecosistema, elige organización y sede y entra solo donde haya atención real.'},
    member:{title:'Tu jornada',body:'Cuando se asigne una responsabilidad, NestJourney muestra lo que necesita hacerse.'},
  },
}

const uiCopy={
  'pt-BR':{
    ecosystem:'Ecossistema',unit:'Unidade',whatNeeds:'O que precisa de você',whatNeedsHint:'Ações reais, em ordem de prioridade.',
    pulse:'Pulso executivo',upToDate:'Em dia',careAttention:'contato(s) precisam de atenção',presenceOpen:'sessão(ões) aberta(s)',
    groupsAttention:'Casa(s) precisam de atenção',rootAttention:'acompanhamento(s) com próximo passo',
    organizations:'organizações',units:'unidades nesta organização',allGood:'Tudo em dia',
    allGoodBody:'Nenhuma ação precisa da sua atenção nesta unidade agora.',nextMove:'Próximo movimento recomendado',
    shortcuts:'Atalhos',currentContext:'Contexto atual',selectOrg:'Organização',selectUnit:'Unidade',
    people:'pessoas acompanhadas',openVision:'Abrir Visão',openTeam:'Equipe & responsabilidades',
  },
  en:{
    ecosystem:'Ecosystem',unit:'Campus',whatNeeds:'What needs you',whatNeedsHint:'Real actions, ordered by priority.',
    pulse:'Executive pulse',upToDate:'Up to date',careAttention:'care contact(s) need attention',presenceOpen:'open service session(s)',
    groupsAttention:'House(s) need attention',rootAttention:'follow-up item(s) with a next step',
    organizations:'organizations',units:'campuses in this organization',allGood:'All caught up',
    allGoodBody:'No action needs your attention in this campus right now.',nextMove:'Recommended next move',
    shortcuts:'Shortcuts',currentContext:'Current context',selectOrg:'Organization',selectUnit:'Campus',
    people:'people in view',openVision:'Open Vision',openTeam:'Team & responsibilities',
  },
  es:{
    ecosystem:'Ecosistema',unit:'Sede',whatNeeds:'Lo que necesita de ti',whatNeedsHint:'Acciones reales, ordenadas por prioridad.',
    pulse:'Pulso ejecutivo',upToDate:'Al día',careAttention:'contacto(s) necesitan atención',presenceOpen:'sesión(es) abierta(s)',
    groupsAttention:'Casa(s) necesitan atención',rootAttention:'acompañamiento(s) con próximo paso',
    organizations:'organizaciones',units:'sedes en esta organización',allGood:'Todo al día',
    allGoodBody:'Ninguna acción necesita tu atención en esta sede ahora.',nextMove:'Próximo movimiento recomendado',
    shortcuts:'Atajos',currentContext:'Contexto actual',selectOrg:'Organización',selectUnit:'Sede',
    people:'personas en vista',openVision:'Abrir Visión',openTeam:'Equipo y responsabilidades',
  },
} as const

export default function MyTodayPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=myTodayCopy[locale]
  const ui=uiCopy[locale]
  const {labels}=useJourneyLabels()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [organizations,setOrganizations]=useState<JourneyOrganizationSummary[]>([])
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [care,setCare]=useState<CareRequestRecord[]>([])
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([])
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [mesa,setMesa]=useState<MesaParticipationRecord[]>([])
  const [mesaPreparation,setMesaPreparation]=useState<MesaPreparationRecord|null>(null)
  const [pastoralHandoffs,setPastoralHandoffs]=useState<JourneyPastoralHandoff[]>([])
  const [filter,setFilter]=useState<Filter>('all')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const responsibility=useMemo(()=>access?resolveJourneyResponsibility(access):'member',[access])
  const focus=focusCopy[locale][responsibility]

  const items=useMemo(()=>access?buildMyTodayItems({
    people,careRequests:care,groups,discipleships,sessions:access.canManagePresence?sessions:[],pastoralHandoffs,
    actorId:access.userId,broadAccess:access.broadJourneyAccess,
  }):[],[access,people,care,groups,discipleships,sessions,pastoralHandoffs])

  const mesaPending=useMemo(()=>mesa.filter(x=>x.status==='invited'),[mesa])
  const mesaPreparationPending=Boolean(access?.canManageMesa&&sessions.find(x=>x.status==='open')&&mesaPreparation?.status!=='ready')
  const counts=useMemo(()=>({
    care:items.filter(item=>filterFor(item.kind)==='care').length,
    presence:items.filter(item=>filterFor(item.kind)==='presence').length,
    mesa:mesaPending.length+(mesaPreparationPending?1:0),
    groups:items.filter(item=>filterFor(item.kind)==='groups').length,
    discipleship:items.filter(item=>filterFor(item.kind)==='discipleship').length,
    pastoral:items.filter(item=>filterFor(item.kind)==='pastoral').length,
  }),[items,mesaPending,mesaPreparationPending])

  const refreshScope=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextCare,nextSessions,nextGroups,nextDiscipleships,nextPastoral]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      nextAccess.canManageCare||nextAccess.broadJourneyAccess?listCareRequests(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManagePresence||nextAccess.canManageMesa?listPresenceSessions(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManageGroups||nextAccess.broadJourneyAccess?listJourneyGroups(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess?listJourneyDiscipleships(nextAccess,unitId):Promise.resolve([]),
      nextAccess.canManagePastoral?listPastoralHandoffs(nextAccess.organizationId,unitId):Promise.resolve([]),
    ])
    const scopedGroups=nextAccess.role==='group_leader'&&!nextAccess.broadJourneyAccess
      ?nextGroups.filter(group=>group.leaderId===nextAccess.userId||group.createdBy===nextAccess.userId)
      :nextGroups
    setPeople(nextPeople)
    setCare(nextCare)
    setSessions(nextSessions)
    setGroups(scopedGroups)
    setDiscipleships(nextDiscipleships)
    setPastoralHandoffs(nextPastoral)
    const mesaSession=nextSessions.find(x=>x.status==='open')??nextSessions[0]
    if(nextAccess.canManageMesa&&mesaSession){
      const [nextMesa,nextPreparation]=await Promise.all([
        listMesaParticipationRecords(nextAccess.organizationId,unitId,mesaSession.id),
        loadMesaPreparation(nextAccess.organizationId,unitId,mesaSession.id),
      ])
      setMesa(nextMesa)
      setMesaPreparation(nextPreparation)
    }else{
      setMesa([])
      setMesaPreparation(null)
    }
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true)
    setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId)
      setAccess(nextAccess)
      setOrganizations(nextAccess.isSystemAdmin?await listJourneyOrganizationsForSystemAdmin(nextAccess):[])
      const nextCongregations=await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId=resolveActiveJourneyCongregationId(nextAccess.organizationId,nextCongregations)
      setCongregationId(unitId)
      if(unitId)await refreshScope(nextAccess,unitId)
    }catch(cause){
      console.error('Today bootstrap failed',cause)
      setError(t.error)
    }finally{
      setLoading(false)
    }
  },[refreshScope,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  useEffect(()=>{
    if(!access||!congregationId)return
    const collections:JourneyLiveCollection[]=['people']
    if(access.canManageCare||access.broadJourneyAccess)collections.push('careRequests')
    if(access.canManagePresence||access.canManageMesa)collections.push('presenceSessions','presenceChecks')
    if(access.canManageMesa)collections.push('mesaParticipations','mesaPreparations')
    if(access.canManageGroups||access.broadJourneyAccess)collections.push('groups','groupMemberships','groupMeetings','groupAttendance')
    if(access.canManageDiscipleship||access.broadJourneyAccess)collections.push('discipleships')
    if(access.canManagePastoral)collections.push('pastoralHandoffs')
    return subscribeJourneyLiveChanges({
      organizationId:access.organizationId,
      congregationId,
      collections,
      onChange:()=>{void refreshScope(access,congregationId).catch(cause=>console.error('Today live refresh failed',cause))},
      onError:cause=>console.error('Today live subscription failed',cause),
    })
  },[access,congregationId,refreshScope])

  async function selectCongregation(unitId:string){
    if(!access)return
    setCongregationId(unitId)
    setActiveJourneyCongregationId(access.organizationId,unitId)
    setBusy(true)
    setError('')
    try{await refreshScope(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  function selectOrganization(organizationId:string){
    setActiveJourneyOrganizationId(organizationId)
    window.location.reload()
  }

  if(loading)return <main className="today-page"><div className="today-loading">{t.loading}</div></main>

  const meta=(kind:MyTodayKind)=>{
    if(kind==='care_debt')return{Icon:AlertTriangle,label:t.debt,tone:'danger'}
    if(kind==='care_due_soon')return{Icon:Clock3,label:t.dueSoon,tone:'warning'}
    if(kind==='care_unassigned')return{Icon:HeartHandshake,label:t.unassigned,tone:'warning'}
    if(kind==='presence_open')return{Icon:UserCheck,label:t.openPresence,tone:'info'}
    if(kind==='group_attention')return{Icon:House,label:t.groupAttention,tone:'info'}
    if(kind==='pastoral_handoff')return{Icon:ShieldAlert,label:t.pastoralHandoff,tone:'warning'}
    return{Icon:Leaf,label:t.discipleshipNext,tone:'neutral'}
  }

  const quickActions=[
    access?.canManagePresence?{href:'/presence-assist',label:labels.presence||t.presence,Icon:UserCheck}:null,
    access?.canManageMesa?{href:'/mesa-runtime',label:labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta'),Icon:UsersRound}:null,
    access&&(access.canManageCare||access.broadJourneyAccess)?{href:'/care-integrity',label:labels.care||t.care,Icon:HeartHandshake}:null,
    access&&(access.canManageGroups||access.broadJourneyAccess)?{href:'/groups-runtime',label:labels.groups||t.groups,Icon:House}:null,
    access&&(access.canManageDiscipleship||access.broadJourneyAccess)?{href:'/discipleship-runtime',label:labels.discipleship||t.discipleship,Icon:Leaf}:null,
    access?.canManagePastoral?{href:'/pastoral-handoff',label:t.pastoral,Icon:ShieldAlert}:null,
  ].filter(Boolean) as Array<{href:string;label:string;Icon:typeof UserCheck}>

  const filters=([
    ['care',labels.care||t.care,counts.care],
    ['presence',labels.presence||t.presence,counts.presence],
    ['mesa',labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta'),counts.mesa],
    ['groups',labels.groups||t.groups,counts.groups],
    ['discipleship',labels.discipleship||t.discipleship,counts.discipleship],
    ['pastoral',t.pastoral,counts.pastoral],
  ] as Array<[Exclude<Filter,'all'>,string,number]>).filter(([, ,count])=>count>0)

  const showMesa=filter==='all'||filter==='mesa'
  const visible=filter==='all'?items:filter==='mesa'?[]:items.filter(item=>filterFor(item.kind)===filter)
  const hasAnything=visible.length>0||(showMesa&&(mesaPending.length>0||mesaPreparationPending))
  const primaryAction=buildTodayPrimaryAction({
    locale,
    responsibility,
    items,
    mesaPreparationPending,
    mesaPendingCount:mesaPending.length,
  })
  const activeUnit=congregations.find(item=>item.id===congregationId)
  const activeOrganization=organizations.find(item=>item.id===access?.organizationId)
  const openSessions=sessions.filter(item=>item.status==='open').length

  return <main className="today-page"><div className="today-shell">
    <header className="today-headline">
      <div>
        <span className="today-kicker">NestJourney</span>
        <h1>{t.title}</h1>
        <p>{[activeOrganization?.name,activeUnit?.name,activeUnit?.city].filter(Boolean).join(' · ')||focus.title}</p>
      </div>
      <div className="today-scope-controls">
        {responsibility==='ceo'&&organizations.length>0?<label><span>{ui.selectOrg}</span><select value={access?.organizationId||''} onChange={event=>selectOrganization(event.target.value)}>{organizations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>:null}
        {congregations.length>1?<label><span>{ui.selectUnit}</span><select value={congregationId} onChange={event=>void selectCongregation(event.target.value)} disabled={busy}>{congregations.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?' · '+item.city:''}</option>)}</select></label>:null}
        <label className="today-language"><span>{locale==='en'?'Language':locale==='es'?'Idioma':'Idioma'}</span><select value={locale} aria-label="Language" onChange={event=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></label>
      </div>
    </header>

    {error?<div className="today-error" role="alert">{error}</div>:null}

    {responsibility==='ceo'?<section className="today-executive-pulse">
      <div className="today-pulse-head">
        <div><span className="today-section-label">{ui.pulse}</span><strong>{organizations.length||1} {ui.organizations} · {congregations.length} {ui.units}</strong></div>
        <a href="/vision">{ui.openVision}<ArrowRight size={14}/></a>
      </div>
      <div className="today-pulse-grid">
        <article><HeartHandshake size={16}/><span>{labels.care||t.care}</span><strong>{counts.care?counts.care+' '+ui.careAttention:ui.upToDate}</strong></article>
        <article><UserCheck size={16}/><span>{labels.presence||t.presence}</span><strong>{openSessions?openSessions+' '+ui.presenceOpen:ui.upToDate}</strong></article>
        <article><House size={16}/><span>{labels.groups||t.groups}</span><strong>{counts.groups?counts.groups+' '+ui.groupsAttention:ui.upToDate}</strong></article>
        <article><Leaf size={16}/><span>{labels.discipleship||t.discipleship}</span><strong>{counts.discipleship?counts.discipleship+' '+ui.rootAttention:ui.upToDate}</strong></article>
      </div>
    </section>:null}

    <section className="today-context">
      <div><span className="today-section-label">{ui.currentContext}</span><strong>{focus.title}</strong><p>{focus.body}</p></div>
      <div className="today-context-meta"><span><Building2 size={14}/>{activeUnit?.name||ui.unit}</span><span><UserRound size={14}/>{people.length} {ui.people}</span></div>
    </section>

    <section className="today-action-center">
      <header className="today-section-head">
        <div><span className="today-section-label">{ui.whatNeeds}</span><h2>{ui.whatNeeds}</h2><p>{ui.whatNeedsHint}</p></div>
        {filters.length>1?<div className="today-filters"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>{t.all}</button>{filters.map(([id,label,count])=><button className={filter===id?'active':''} key={id} onClick={()=>setFilter(id)}>{label}<b>{count}</b></button>)}</div>:null}
      </header>

      <div className="today-list">
        {showMesa&&mesaPreparationPending?<article className="today-action-row">
          <span className="today-action-icon warning"><UsersRound size={17}/></span>
          <div><span>{labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta')} · {locale==='en'?'attention':locale==='es'?'atención':'atenção'}</span><h3>{locale==='en'?'Prepare the next Table':locale==='es'?'Preparar la próxima Mesa':'Preparar a próxima Mesa'}</h3><p>{locale==='en'?'Confirm environment, hosts, welcome, and simple supplies before the service ends.':locale==='es'?'Confirma ambiente, anfitriones, recepción y elementos simples antes de terminar el culto.':'Confirme ambiente, anfitriões, acolhimento e itens simples antes do encerramento do culto.'}</p></div>
          <a href="/mesa-runtime">{locale==='en'?'Prepare':locale==='es'?'Preparar':'Preparar'}<ArrowRight size={14}/></a>
        </article>:null}

        {showMesa&&mesaPending.length>0?<article className="today-action-row">
          <span className="today-action-icon info"><UsersRound size={17}/></span>
          <div><span>{labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta')}</span><h3>{mesaPending.length} {locale==='en'?'guest(s) need a participation record':locale==='es'?'invitado(s) necesitan registro de participación':'convidado(s) precisam de registro de participação'}</h3><p>{focusCopy[locale].mesa_team.body}</p></div>
          <a href="/mesa-runtime">{locale==='en'?'Open Table':locale==='es'?'Abrir Mesa':'Abrir Mesa'}<ArrowRight size={14}/></a>
        </article>:null}

        {visible.map(item=>{
          const {Icon,label,tone}=meta(item.kind)
          const actionHref=item.kind.startsWith('care_')?'/care-integrity':item.kind==='presence_open'?'/presence-assist':item.kind==='group_attention'?'/groups-runtime':item.kind==='pastoral_handoff'?'/pastoral-handoff':item.kind==='discipleship_next'?'/discipleship-runtime':item.personId?'/journey-profile?person='+encodeURIComponent(item.personId):'/journey-profile'
          const detail=item.kind==='care_debt'?t.overdue+': '+(item.dueAt?new Date(item.dueAt).toLocaleString(locale):'—')
            :item.kind==='care_due_soon'||item.kind==='care_unassigned'?t.due+': '+(item.dueAt?new Date(item.dueAt).toLocaleString(locale):'—')
            :item.kind==='presence_open'?t.goPresence
            :item.kind==='group_attention'?t.capacity+': '+Math.round((item.ratio??0)*100)+'%'
            :item.kind==='pastoral_handoff'?t.pastoralMarker
            :t.meeting+': '+String(item.meeting??'—')+' · '+item.titleRef
          return <article className="today-action-row" key={item.id}>
            <span className={'today-action-icon '+tone}><Icon size={17}/></span>
            <div><span>{label}</span><h3>{item.personName||item.titleRef}</h3><p>{detail}</p></div>
            <a href={actionHref}>{item.kind.startsWith('care_')?t.goCare:item.kind==='presence_open'?t.goPresence:item.kind==='group_attention'?(labels.groups||t.groups):item.kind==='pastoral_handoff'?t.goPastoral:item.kind==='discipleship_next'?(labels.discipleship||t.discipleship):item.personId?t.openPerson:t.profile}<ArrowRight size={14}/></a>
          </article>
        })}

        {!hasAnything?<div className="today-empty-premium">
          <CheckCircle2 size={24}/>
          <div><strong>{ui.allGood}</strong><p>{ui.allGoodBody}</p></div>
          <div className="today-next-move"><span>{ui.nextMove}</span><b>{primaryAction.title}</b><p>{primaryAction.body}</p><a href={primaryAction.href}>{primaryAction.cta}<ArrowRight size={14}/></a></div>
        </div>:null}
      </div>
    </section>

    {quickActions.length?<section className="today-shortcuts">
      <div className="today-shortcuts-head"><span className="today-section-label">{ui.shortcuts}</span>{responsibility==='ceo'?<a href="/team-runtime">{ui.openTeam}<ArrowRight size={13}/></a>:null}</div>
      <div>{quickActions.map(item=>{const Icon=item.Icon;return <a href={item.href} key={item.href}><Icon size={15}/><span>{item.label}</span><ArrowRight size={12}/></a>})}</div>
    </section>:null}

    <p className="today-rule"><ShieldCheck size={14}/>{t.sourceRule}</p>
  </div></main>
}
