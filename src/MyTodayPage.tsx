import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Clock3, HeartHandshake, House, Leaf, ShieldAlert,
  ShieldCheck, UserCheck, UserRound, UsersRound,
} from 'lucide-react'
import { auth } from './firebase'
import { buildMyTodayItems, type MyTodayKind } from './myToday'
import { buildTodayPrimaryAction, todayActionKicker } from './todayActionCenter'
import {
  getActiveJourneyOrganizationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroups,
  listJourneyPeople,
  listMesaParticipationRecords,
  loadMesaPreparation,
  listPastoralHandoffs,
  listPresenceSessions,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
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
    presence_host:{title:'Seu foco: Presença',body:'Próximo culto, abrir ou acompanhar a sessão, confirmar presença, registrar visitante e vínculo.'},
    mesa_team:{title:'Seu foco: Mesa',body:'Preparação, convidados, participação e continuidade do vínculo depois do culto.'},
    caregiver:{title:'Seu foco: Cuidado',body:'Comece pelos contatos atribuídos e pelos prazos de 24–48h. Registre resultado e próximo passo.'},
    group_leader:{title:'Seu foco: Casa de Paz',body:'Veja sua Casa, participantes, convidados, capacidade e o que precisa de atenção operacional.'},
    discipler:{title:'Seu foco: Raiz',body:'Veja quem você acompanha, o encontro atual de 1 a 7 e a próxima data registrada.'},
    coordinator:{title:'Seu foco: Coordenação',body:'Resolva pendências, distribua carga e encontre itens sem responsável antes que virem dívida operacional.'},
    pastor:{title:'Seu foco: cuidado pastoral',body:'Priorize Care Debt, encaminhamentos pastorais e jornadas que precisam de decisão.'},
    admin:{title:'Seu foco: operação da organização',body:'Você enxerga todas as áreas. Use Hoje para pendências e Visão para acompanhar saúde e carga.'},
    ceo:{title:'Seu foco: ecossistema',body:'Use Hoje para a organização atual e Visão para acompanhar organizações, acessos, auditoria e simulações.'},
    member:{title:'Seu foco',body:'Quando uma responsabilidade operacional for atribuída a você, as ações aparecerão aqui automaticamente.'},
  },
  en:{
    presence_host:{title:'Your focus: Presence',body:'Next service, open or follow the session, confirm attendance, register visitors, and relationships.'},
    mesa_team:{title:'Your focus: Table',body:'Preparation, guests, participation, and relationship continuity after the service.'},
    caregiver:{title:'Your focus: Care',body:'Start with assigned contacts and 24–48h promises. Record the outcome and next step.'},
    group_leader:{title:'Your focus: House',body:'See your group, participants, guests, capacity, and operational attention points.'},
    discipler:{title:'Your focus: Root',body:'See who you accompany, the current meeting from 1 to 7, and the next recorded date.'},
    coordinator:{title:'Your focus: Coordination',body:'Resolve pending work, distribute workload, and find unassigned items before they become operational debt.'},
    pastor:{title:'Your focus: pastoral care',body:'Prioritize Care Debt, pastoral handoffs, and journeys that need a decision.'},
    admin:{title:'Your focus: organization operations',body:'You can see every area. Use Today for pending work and Vision for health and workload.'},
    ceo:{title:'Your focus: ecosystem',body:'Use Today for the current organization and Vision for organizations, access, audit, and simulations.'},
    member:{title:'Your focus',body:'When an operational responsibility is assigned to you, its actions will appear here automatically.'},
  },
  es:{
    presence_host:{title:'Tu foco: Presencia',body:'Próximo culto, abrir o acompañar la sesión, confirmar presencia, registrar visitantes y vínculos.'},
    mesa_team:{title:'Tu foco: Mesa',body:'Preparación, invitados, participación y continuidad del vínculo después del culto.'},
    caregiver:{title:'Tu foco: Cuidado',body:'Empieza por los contactos asignados y plazos de 24–48h. Registra resultado y próximo paso.'},
    group_leader:{title:'Tu foco: Casa de Paz',body:'Ve tu Casa, participantes, invitados, capacidad y lo que necesita atención operativa.'},
    discipler:{title:'Tu foco: Raíz',body:'Ve a quién acompañas, el encuentro actual del 1 al 7 y la próxima fecha registrada.'},
    coordinator:{title:'Tu foco: Coordinación',body:'Resuelve pendientes, distribuye carga y encuentra elementos sin responsable antes de que se conviertan en deuda.'},
    pastor:{title:'Tu foco: cuidado pastoral',body:'Prioriza Care Debt, derivaciones pastorales y jornadas que necesitan decisión.'},
    admin:{title:'Tu foco: operación de la organización',body:'Ves todas las áreas. Usa Hoy para pendientes y Visión para salud y carga.'},
    ceo:{title:'Tu foco: ecosistema',body:'Usa Hoy para la organización actual y Visión para organizaciones, accesos, auditoría y simulaciones.'},
    member:{title:'Tu foco',body:'Cuando se te asigne una responsabilidad operativa, sus acciones aparecerán aquí automáticamente.'},
  },
}

export default function MyTodayPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=myTodayCopy[locale]
  const {labels}=useJourneyLabels()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
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
  const visible=filter==='all'?items:filter==='mesa'?[]:items.filter(item=>filterFor(item.kind)===filter)
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
    setPeople(nextPeople);setCare(nextCare);setSessions(nextSessions);setGroups(scopedGroups);setDiscipleships(nextDiscipleships);setPastoralHandoffs(nextPastoral)
    const mesaSession=nextSessions.find(x=>x.status==='open')??nextSessions[0]
    if(nextAccess.canManageMesa&&mesaSession){
      const [nextMesa,nextPreparation]=await Promise.all([
        listMesaParticipationRecords(nextAccess.organizationId,unitId,mesaSession.id),
        loadMesaPreparation(nextAccess.organizationId,unitId,mesaSession.id),
      ])
      setMesa(nextMesa);setMesaPreparation(nextPreparation)
    }else{
      setMesa([]);setMesaPreparation(null)
    }
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      const nextCongregations=await listJourneyCongregations(nextAccess);setCongregations(nextCongregations)
      const unitId=nextCongregations[0]?.id??'';setCongregationId(unitId)
      if(unitId)await refreshScope(nextAccess,unitId)
    }catch(cause){console.error('Today bootstrap failed',cause);setError(t.error)}
    finally{setLoading(false)}
  },[refreshScope,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectCongregation(unitId:string){
    if(!access)return
    setCongregationId(unitId);setBusy(true);setError('')
    try{await refreshScope(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
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

  const showMesa=filter==='all'||filter==='mesa'
  const hasAnything=visible.length>0||(showMesa&&(mesaPending.length>0||mesaPreparationPending))
  const primaryAction=buildTodayPrimaryAction({
    locale,
    responsibility,
    items,
    mesaPreparationPending,
    mesaPendingCount:mesaPending.length,
  })
  const activeUnit=congregations.find(item=>item.id===congregationId)

  return <main className="today-page"><div className="today-shell">
    <header className="today-topbar"><div className="today-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>{focus.title}</small></span></div><div className="today-actions"><a href="/journey-profile"><UserRound size={16}/>{t.profile}</a><select value={locale} aria-label="Language" onChange={event=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></div></header>

    <section className="today-hero"><div><span className="today-kicker">NestJourney / Today</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error?<div className="today-error" role="alert">{error}</div>:null}

    <section className={'today-primary-action '+(primaryAction.urgent?'urgent':'calm')}>
      <div className="today-primary-copy">
        <span className="today-action-kicker">{todayActionKicker(locale)}{activeUnit?' · '+activeUnit.name:''}</span>
        <h2>{primaryAction.title}</h2>
        <p>{primaryAction.body}</p>
      </div>
      <a href={primaryAction.href}>{primaryAction.cta}<ArrowRight size={15}/></a>
    </section>

    <section className="today-focus"><div><strong>{focus.title}</strong><p>{focus.body}</p></div><div className="today-quick-actions">{quickActions.map(item=>{const Icon=item.Icon;return <a href={item.href} key={item.href}><Icon size={15}/>{item.label}<ArrowRight size={13}/></a>})}</div></section>

    {congregations.length>1?<section className="today-panel today-toolbar"><label><span>{t.congregation}</span><select value={congregationId} onChange={event=>void selectCongregation(event.target.value)} disabled={busy}>{congregations.map(item=><option key={item.id} value={item.id}>{item.name+(item.city?' · '+item.city:'')}</option>)}</select></label></section>:null}

    <div className="today-filters">
      {([
        ['all',t.all,items.length+mesaPending.length+(mesaPreparationPending?1:0)],
        ['care',labels.care||t.care,counts.care],
        ['presence',labels.presence||t.presence,counts.presence],
        ['mesa',labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta'),counts.mesa],
        ['groups',labels.groups||t.groups,counts.groups],
        ['discipleship',labels.discipleship||t.discipleship,counts.discipleship],
        ['pastoral',t.pastoral,counts.pastoral],
      ] as Array<[Filter,string,number]>).filter(([id])=>{
        if(id==='all')return true
        if(id==='care')return Boolean(access&&(access.canManageCare||access.broadJourneyAccess))
        if(id==='presence')return Boolean(access?.canManagePresence)
        if(id==='mesa')return Boolean(access?.canManageMesa)
        if(id==='groups')return Boolean(access&&(access.canManageGroups||access.broadJourneyAccess))
        if(id==='discipleship')return Boolean(access&&(access.canManageDiscipleship||access.broadJourneyAccess))
        return Boolean(access?.canManagePastoral)
      }).map(([id,label,count])=><button className={filter===id?'active':''} key={id} onClick={()=>setFilter(id)}>{label}<b>{count}</b></button>)}
    </div>

    <section className="today-list">
      {showMesa&&mesaPreparationPending?<article className="today-panel today-item">
        <span className="today-icon warning"><UsersRound size={18}/></span>
        <div className="today-item-body"><span className="today-item-kind">{labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta')}</span><h2>{locale==='en'?'Prepare the next Table':locale==='es'?'Preparar la próxima Mesa':'Preparar a próxima Mesa'}</h2><p>{locale==='en'?'Confirm environment, hosts, welcome, and simple supplies before the service.':locale==='es'?'Confirma ambiente, anfitriones, recepción y elementos simples antes del culto.':'Confirme ambiente, anfitriões, acolhimento e itens simples antes do culto.'}</p></div>
        <a className="today-button" href="/mesa-runtime">{locale==='en'?'Prepare':locale==='es'?'Preparar':'Preparar'}</a>
      </article>:null}

      {showMesa&&mesaPending.length>0?<article className="today-panel today-item">
        <span className="today-icon info"><UsersRound size={18}/></span>
        <div className="today-item-body"><span className="today-item-kind">{labels.table||(locale==='en'?'Open Table':locale==='es'?'Mesa Abierta':'Mesa Aberta')}</span><h2>{mesaPending.length} {locale==='en'?'guest(s) awaiting participation record':locale==='es'?'invitado(s) esperando registro de participación':'convidado(s) aguardando registro de participação'}</h2><p>{focusCopy[locale].mesa_team.body}</p></div>
        <a className="today-button" href="/mesa-runtime">{locale==='en'?'Open Table':locale==='es'?'Abrir Mesa':'Abrir Mesa'}</a>
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
        return <article className="today-panel today-item" key={item.id}><span className={'today-icon '+tone}><Icon size={18}/></span><div className="today-item-body"><span className="today-item-kind">{label}</span><h2>{item.personName||item.titleRef}</h2><p>{detail}</p></div><a className="today-button" href={actionHref}>{item.kind.startsWith('care_')?t.goCare:item.kind==='presence_open'?t.goPresence:item.kind==='group_attention'?(labels.groups||t.groups):item.kind==='pastoral_handoff'?t.goPastoral:item.kind==='discipleship_next'?(labels.discipleship||t.discipleship):item.personId?t.openPerson:t.profile}</a></article>
      })}
      {!hasAnything?<div className="today-panel today-empty"><ShieldCheck size={20}/><strong>{locale==='en'?'Nothing urgent right now':locale==='es'?'Nada urgente ahora':'Nada urgente agora'}</strong><span>{locale==='en'?'Your factual queue is clear. Use the suggested action above to keep your responsibility moving without hunting through menus.':locale==='es'?'Tu fila factual está al día. Usa la acción sugerida arriba para mantener tu responsabilidad avanzando sin buscar por menús.':'Sua fila factual está em dia. Use a ação sugerida acima para manter sua responsabilidade andando sem precisar procurar pelos menus.'}</span><div className="today-empty-actions"><a href={primaryAction.href}>{primaryAction.cta}</a><a href="/areas">{locale==='en'?'View Areas':locale==='es'?'Ver Áreas':'Ver Áreas'}</a><a href="/help">{locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda'}</a></div></div>:null}
    </section>

    <p className="today-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div></main>
}
