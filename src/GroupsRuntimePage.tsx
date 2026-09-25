import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Check, ChevronLeft, House, Play, Search, Send, ShieldCheck, Square, UserCheck, UserMinus, Users, X } from 'lucide-react'
import { auth } from './firebase'
import {
  canCreateJourneyGroupEntryRequest,
  canManageJourneyGroupRoster,
  closeJourneyGroupMeeting,
  confirmJourneyGroupAttendance,
  createJourneyGroup,
  createJourneyGroupMeeting,
  createJourneyGroupEntryRequest,
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listJourneyCongregations,
  listJourneyGroupAttendance,
  listJourneyGroupEntryRequests,
  listJourneyGroupMeetings,
  listJourneyGroupMemberships,
  listJourneyGroups,
  listJourneyPeople,
  loadJourneyAccess,
  resolveJourneyGroupEntryRequest,
  setJourneyGroupMembership,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyGroupAttendanceRecord,
  type JourneyGroupEntryRequest,
  type JourneyGroupMeetingRecord,
  type JourneyGroupMembership,
  type JourneyGroupRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import { getInitialLocale, groupsRuntimeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { useJourneyLabels } from './journeyLabels'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './JourneyRuntimePages.css'

export default function GroupsRuntimePage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const baseCopy = groupsRuntimeCopy[locale]
  const { labels } = useJourneyLabels()
  const t = { ...baseCopy, title: labels.groups || baseCopy.title }
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [groups, setGroups] = useState<JourneyGroupRecord[]>([])
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [rosterGroup, setRosterGroup] = useState<JourneyGroupRecord | null>(null)
  const [roster, setRoster] = useState<JourneyGroupMembership[]>([])
  const [entryRequests, setEntryRequests] = useState<JourneyGroupEntryRequest[]>([])
  const [meetings, setMeetings] = useState<JourneyGroupMeetingRecord[]>([])
  const [attendance, setAttendance] = useState<JourneyGroupAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)

  const refresh = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const allGroups = await listJourneyGroups(nextAccess.organizationId, unitId)
    const nextGroups = nextAccess.role === 'group_leader' && !nextAccess.broadJourneyAccess
      ? allGroups.filter(group => group.leaderId === nextAccess.userId || group.createdBy === nextAccess.userId)
      : allGroups
    const nextPeople = canCreateJourneyGroupEntryRequest(nextAccess)
      ? await listJourneyPeople(nextAccess.organizationId, unitId)
      : []
    setGroups(nextGroups)
    setPeople(nextPeople)
    return nextGroups
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!(nextAccess.canManageGroups || nextAccess.broadJourneyAccess)) return
      const units = await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, units)
      setCongregationId(unitId)
      if (unitId) await refresh(nextAccess, unitId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setLoading(false) }
  }, [refresh, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  useEffect(() => {
    if (!(access?.canManageGroups || access?.broadJourneyAccess) || !congregationId) return
    return subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId,
      collections: ['people', 'groups', 'groupMemberships', 'groupEntryRequests', 'groupMeetings', 'groupAttendance'],
      onChange: () => {
        void (async () => {
          try {
            const nextGroups = await refresh(access, congregationId)
            if (!rosterGroup) return
            const currentGroup = nextGroups.find((group) => group.id === rosterGroup.id) ?? rosterGroup
            if (!canManageJourneyGroupRoster(access, currentGroup)) return
            const [nextRoster, nextRequests, nextMeetings] = await Promise.all([
              listJourneyGroupMemberships(access, currentGroup),
              listJourneyGroupEntryRequests(access, currentGroup),
              listJourneyGroupMeetings(access, currentGroup),
            ])
            const openMeeting = nextMeetings.find((item) => item.status === 'open')
            const nextAttendance = openMeeting ? await listJourneyGroupAttendance(access, currentGroup, openMeeting.id) : []
            setRosterGroup(currentGroup)
            setRoster(nextRoster)
            setEntryRequests(nextRequests)
            setMeetings(nextMeetings)
            setAttendance(nextAttendance)
          } catch (cause) {
            console.error('Groups live refresh failed', cause)
          }
        })()
      },
      onError: (cause) => console.error('Groups live subscription failed', cause),
    })
  }, [access, congregationId, refresh, rosterGroup?.id])

  async function selectUnit(unitId: string) {
    if (!access) return
    setCongregationId(unitId); setActiveJourneyCongregationId(access.organizationId,unitId); setBusy(true); setError(''); setRosterGroup(null); setRoster([]); setEntryRequests([]); setMeetings([]); setAttendance([])
    try { await refresh(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function loadRoster(group: JourneyGroupRecord) {
    if (!access || !canManageJourneyGroupRoster(access, group)) return
    const [nextRoster, nextRequests, nextMeetings] = await Promise.all([
      listJourneyGroupMemberships(access, group),
      listJourneyGroupEntryRequests(access, group),
      listJourneyGroupMeetings(access, group),
    ])
    const openMeeting = nextMeetings.find(item => item.status === 'open')
    const nextAttendance = openMeeting
      ? await listJourneyGroupAttendance(access, group, openMeeting.id)
      : []
    setRoster(nextRoster)
    setEntryRequests(nextRequests)
    setMeetings(nextMeetings)
    setAttendance(nextAttendance)
  }

  async function openRoster(group: JourneyGroupRecord) {
    if (!access || !canManageJourneyGroupRoster(access, group)) return
    setBusy(true); setError('')
    try {
      await loadRoster(group)
      setRosterGroup(group)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function startMeeting() {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await createJourneyGroupMeeting(access, rosterGroup)
      await loadRoster(rosterGroup)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function finishMeeting(meeting: JourneyGroupMeetingRecord) {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await closeJourneyGroupMeeting(access, rosterGroup, meeting)
      await loadRoster(rosterGroup)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function confirmAttendance(personId: string, meeting: JourneyGroupMeetingRecord) {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await confirmJourneyGroupAttendance({ access, group: rosterGroup, meeting, personId })
      setAttendance(await listJourneyGroupAttendance(access, rosterGroup, meeting.id))
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function removeMembership(person: JourneyPersonRecord) {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await setJourneyGroupMembership({ access, group: rosterGroup, person, active: false })
      const nextGroups = await refresh(access, congregationId)
      const nextGroup = nextGroups.find((item) => item.id === rosterGroup.id) ?? rosterGroup
      setRosterGroup(nextGroup)
      await loadRoster(nextGroup)
    } catch (cause) {
      console.error(cause)
      setError(t.error)
    } finally { setBusy(false) }
  }

  async function requestEntry(person: JourneyPersonRecord) {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await createJourneyGroupEntryRequest({ access, group: rosterGroup, person })
      await loadRoster(rosterGroup)
    } catch (cause) {
      console.error(cause)
      const message = cause instanceof Error ? cause.message : ''
      setError(message === 'group_entry_request_exists' ? t.requestAlreadyPending : message === 'group_entry_already_member' ? t.alreadyParticipant : t.error)
    } finally { setBusy(false) }
  }

  async function resolveEntry(request: JourneyGroupEntryRequest, decision: 'accepted' | 'declined') {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await resolveJourneyGroupEntryRequest({ access, group: rosterGroup, request, decision })
      const nextGroups = await refresh(access, congregationId)
      const nextGroup = nextGroups.find((item) => item.id === rosterGroup.id) ?? rosterGroup
      setRosterGroup(nextGroup)
      await loadRoster(nextGroup)
    } catch (cause) {
      console.error(cause)
      setError(cause instanceof Error && cause.message === 'group_capacity_reached' ? t.capacityReached : t.error)
    } finally { setBusy(false) }
  }

  if (loading) return <main className="journey-runtime"><div className="runtime-loading">{t.loading}</div></main>
  if (!(access?.canManageGroups || access?.broadJourneyAccess)) return <main className="journey-runtime"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>

  const canCreateGroup=Boolean(access&&canCreateJourneyGroupEntryRequest(access))
  const empty=emptyGuidance(locale,canCreateGroup?'groups_none':'groups_unassigned')
  const activeUnit=congregations.find(item=>item.id===congregationId)
  const attentionGroups=groups.filter(group=>{
    const participants=group.participants??0
    const capacity=Math.max(1,group.capacity??12)
    return participants/capacity>=.85
  })
  const totalParticipants=groups.reduce((sum,group)=>sum+(group.participants??0),0)
  const focusTitle=!groups.length
    ?locale==='en'?'No House is connected to this view yet':locale==='es'?'Todavía no hay una Casa conectada a esta vista':'Ainda não há uma Casa conectada a esta visão'
    :attentionGroups.length>0
      ?locale==='en'?attentionGroups.length+' House(s) need attention':locale==='es'?attentionGroups.length+' Casa(s) necesitan atención':attentionGroups.length+' Casa(s) precisam de atenção'
      :locale==='en'?'Your Houses are operating without capacity alerts':locale==='es'?'Tus Casas están operando sin alertas de capacidad':'Suas Casas estão operando sem alertas de capacidade'
  const focusBody=!groups.length
    ?locale==='en'?'Start only if this responsibility belongs to you. A group leader should see the House they actually lead, not the whole organization.'
      :locale==='es'?'Empieza solo si esta responsabilidad te pertenece. Un líder debe ver la Casa que realmente lidera, no toda la organización.'
      :'Comece somente se esta responsabilidade for sua. Um líder deve enxergar a Casa que realmente lidera, não a organização inteira.'
    :attentionGroups.length>0
      ?locale==='en'?'Start with the Houses closest to their recorded capacity. Review participants, entry requests, and the next meeting.'
        :locale==='es'?'Empieza por las Casas más próximas de su capacidad registrada. Revisa participantes, solicitudes de entrada y próximo encuentro.'
        :'Comece pelas Casas mais próximas da capacidade registrada. Revise participantes, pedidos de entrada e o próximo encontro.'
      :locale==='en'?'Open a House only when you need to manage people, requests, attendance, or the next meeting.'
        :locale==='es'?'Abre una Casa solo cuando necesites gestionar personas, solicitudes, presencia o el próximo encuentro.'
        :'Abra uma Casa somente quando precisar cuidar de pessoas, pedidos, presença ou do próximo encontro.'

  return <main className="journey-runtime"><div className="runtime-shell">
    <header className="runtime-topbar"><div className="runtime-brand"><img src="/brand/nestjourney-symbol-light.png" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="runtime-actions"><a href="/my-today"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={(e)=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="runtime-hero"><div><span className="runtime-kicker">Journey / Community</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error ? <div className="runtime-error">{error}</div> : null}

    <JourneyAreaFocus
      locale={locale}
      title={focusTitle}
      body={focusBody}
      context={activeUnit?.name}
      metrics={[
        {label:locale==='en'?'Houses':locale==='es'?'Casas':'Casas',value:groups.length,tone:groups.length?'good':'muted'},
        {label:locale==='en'?'Attention':locale==='es'?'Atención':'Atenção',value:attentionGroups.length,tone:attentionGroups.length?'attention':'muted'},
        {label:t.participants,value:totalParticipants,tone:totalParticipants?'good':'muted'},
      ]}
      actions={groups.length
        ?[
          {label:attentionGroups.length?(locale==='en'?'Review attention':locale==='es'?'Revisar atención':'Revisar atenção'):(locale==='en'?'Open Houses':locale==='es'?'Abrir Casas':'Abrir Casas'),href:'#groups-list',primary:true},
          ...(canCreateGroup?[{label:t.newGroup,onClick:()=>setShowNew(true)}]:[]),
        ]
        :canCreateGroup
          ?[{label:t.newGroup,onClick:()=>setShowNew(true),primary:true},{label:locale==='en'?'Implementation':locale==='es'?'Implementación':'Implantação',href:'/implementation-runtime'}]
          :[{label:locale==='en'?'Return to Today':locale==='es'?'Volver a Hoy':'Voltar para Hoje',href:'/my-today',primary:true}]
      }
    />

    {congregations.length>1?<section className="journey-area-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={(e)=>void selectUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}{x.city?` · ${x.city}`:''}</option>)}</select></label></section>:null}
    <section className="runtime-grid" id="groups-list">
      {groups.map(group=>{
        const participants=group.participants??0, capacity=Math.max(1,group.capacity??12), ratio=participants/capacity
        const canRoster=Boolean(access&&canManageJourneyGroupRoster(access,group))
        return <article className="runtime-panel runtime-card" key={group.id}>
          <div className="runtime-card-head"><span className="runtime-icon"><House size={18}/></span><div><h2>{group.name}</h2><p>{[group.neighborhood,group.weekday,group.time].filter(Boolean).join(' · ')||'—'}</p></div><span className={ratio>=.85?'runtime-badge attention':'runtime-badge'}>{ratio>=.85?t.nearCapacity:t.healthy}</span></div>
          <div className="runtime-facts"><span><small>{t.leader}</small><b>{group.leader||'—'}</b></span><span><small>{t.host}</small><b>{group.host||'—'}</b></span><span><small>{t.apprentice}</small><b>{group.apprentice||'—'}</b></span></div>
          <div className="runtime-count"><Users size={17}/><span><small>{t.participants}</small><strong>{participants} / {capacity}</strong></span>{canRoster?<button className="runtime-button compact" disabled={busy} onClick={()=>void openRoster(group)}>{t.manageRoster}</button>:<small className="runtime-count-note">{t.rosterRestricted}</small>}</div>
        </article>
      })}
      {!groups.length ? <div className="runtime-panel"><GuidedEmptyState icon={House} title={empty.title} body={empty.body} primary={canCreateGroup?{label:empty.primary,onClick:()=>setShowNew(true)}:{label:empty.primary,href:'/my-today'}} secondary={{label:empty.secondary||t.empty,href:canCreateGroup?'/implementation-runtime':'/help'}}/></div> : null}
    </section>
    <p className="runtime-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div>
  {showNew ? <NewGroupModal locale={locale} close={()=>setShowNew(false)} save={async data=>{
    if(!access)return;setBusy(true);setError('')
    try{
      await createJourneyGroup({
        organizationId:access.organizationId,congregationId,actorId:access.userId,
        leaderId:access.role==='group_leader'?access.userId:'',...data,
      })
      setShowNew(false);await refresh(access,congregationId)
    } catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }}/> : null}
  {rosterGroup&&access?<RosterModal
    locale={locale}
    group={rosterGroup}
    people={people}
    memberships={roster}
    entryRequests={entryRequests}
    meetings={meetings}
    attendance={attendance}
    canRequest={canCreateJourneyGroupEntryRequest(access)}
    busy={busy}
    close={()=>{setRosterGroup(null);setRoster([]);setEntryRequests([]);setMeetings([]);setAttendance([])}}
    remove={removeMembership}
    requestEntry={requestEntry}
    resolveEntry={resolveEntry}
    startMeeting={startMeeting}
    finishMeeting={finishMeeting}
    confirmAttendance={confirmAttendance}
  />:null}
  </main>
}

function NewGroupModal({locale,close,save}:{locale:AppLocale;close:()=>void;save:(data:{name:string;leader:string;host:string;apprentice:string;neighborhood:string;weekday:string;time:string;capacity:number})=>Promise<void>}){
  const t=groupsRuntimeCopy[locale]
  const [name,setName]=useState(''),[leader,setLeader]=useState(''),[host,setHost]=useState(''),[apprentice,setApprentice]=useState(''),[neighborhood,setNeighborhood]=useState(''),[weekday,setWeekday]=useState(''),[time,setTime]=useState(''),[capacity,setCapacity]=useState(12)
  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal" onMouseDown={e=>e.stopPropagation()}><div className="runtime-modal-head"><h2>{t.newGroup}</h2><button className="runtime-button" onClick={close}><X size={17}/></button></div><div className="runtime-form">
    <label><span>{t.name}</span><input autoFocus value={name} onChange={e=>setName(e.target.value)}/></label><label><span>{t.leader}</span><input value={leader} onChange={e=>setLeader(e.target.value)}/></label><label><span>{t.host}</span><input value={host} onChange={e=>setHost(e.target.value)}/></label><label><span>{t.apprentice}</span><input value={apprentice} onChange={e=>setApprentice(e.target.value)}/></label><label><span>{t.neighborhood}</span><input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)}/></label><label><span>{t.weekday}</span><input value={weekday} onChange={e=>setWeekday(e.target.value)}/></label><label><span>{t.time}</span><input value={time} onChange={e=>setTime(e.target.value)}/></label><label><span>{t.capacity}</span><input type="number" min={1} max={100} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
  </div><div className="runtime-modal-actions"><button className="runtime-button" onClick={close}>{t.cancel}</button><button className="runtime-button primary" disabled={!name.trim()} onClick={()=>void save({name,leader,host,apprentice,neighborhood,weekday,time,capacity})}>{t.create}</button></div></section></div>
}

function RosterModal({
  locale,group,people,memberships,entryRequests,meetings,attendance,canRequest,busy,close,remove,requestEntry,resolveEntry,startMeeting,finishMeeting,confirmAttendance,
}:{
  locale:AppLocale
  group:JourneyGroupRecord
  people:JourneyPersonRecord[]
  memberships:JourneyGroupMembership[]
  entryRequests:JourneyGroupEntryRequest[]
  meetings:JourneyGroupMeetingRecord[]
  attendance:JourneyGroupAttendanceRecord[]
  canRequest:boolean
  busy:boolean
  close:()=>void
  remove:(person:JourneyPersonRecord)=>Promise<void>
  requestEntry:(person:JourneyPersonRecord)=>Promise<void>
  resolveEntry:(request:JourneyGroupEntryRequest,decision:'accepted'|'declined')=>Promise<void>
  startMeeting:()=>Promise<void>
  finishMeeting:(meeting:JourneyGroupMeetingRecord)=>Promise<void>
  confirmAttendance:(personId:string,meeting:JourneyGroupMeetingRecord)=>Promise<void>
}){
  const t=groupsRuntimeCopy[locale]
  const [query,setQuery]=useState('')
  const activeMemberships=useMemo(()=>memberships.filter(item=>item.status==='active'),[memberships])
  const activeIds=useMemo(()=>new Set(activeMemberships.map(item=>item.personId)),[activeMemberships])
  const pending=useMemo(()=>entryRequests.filter(item=>item.status==='pending'),[entryRequests])
  const pendingIds=useMemo(()=>new Set(pending.map(item=>item.personId)),[pending])
  const needle=query.trim().toLocaleLowerCase(locale)
  const active=activeMemberships
    .map(item=>people.find(person=>person.id===item.personId)??({
      id:item.personId,organizationId:item.organizationId,congregationId:item.congregationId,name:item.personName??'—',
    } satisfies JourneyPersonRecord))
    .filter(person=>!needle||person.name.toLocaleLowerCase(locale).includes(needle))
  const available=canRequest
    ? people.filter(person=>!activeIds.has(person.id)&&!pendingIds.has(person.id)&&(!needle||person.name.toLocaleLowerCase(locale).includes(needle)))
    : []
  const visiblePending=pending.filter(item=>!needle||item.personName.toLocaleLowerCase(locale).includes(needle))
  const capacity=Math.max(1,group.capacity??12)
  const participants=group.participants??0
  const openMeeting=meetings.find(item=>item.status==='open')
  const presentIds=new Set(attendance.map(item=>item.personId))
  const meetingCopy=locale==='en'
    ? {title:'Meeting attendance',open:'Open meeting',close:'Close meeting',present:'Present',confirm:'Confirm presence',none:'No meeting is open.',rule:'Confirm only people who were actually present. NestJourney never infers absence.'}
    : locale==='es'
      ? {title:'Presencia del encuentro',open:'Abrir encuentro',close:'Cerrar encuentro',present:'Presente',confirm:'Confirmar presencia',none:'No hay un encuentro abierto.',rule:'Confirma solamente a quien realmente estuvo presente. NestJourney nunca presume ausencia.'}
      : {title:'Presença do encontro',open:'Abrir encontro',close:'Encerrar encontro',present:'Presente',confirm:'Confirmar presença',none:'Nenhum encontro está aberto.',rule:'Confirme apenas quem realmente esteve presente. O NestJourney nunca presume ausência.'}

  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal runtime-roster-modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="runtime-modal-head"><div><span className="runtime-kicker">Journey / Community</span><h2>{group.name}</h2><p className="runtime-muted">{participants} / {capacity} · {t.explicitRoster}</p></div><button className="runtime-button" onClick={close}><X size={17}/></button></div>
    <label className="runtime-roster-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.searchPerson}/></label>

    <section className="runtime-meeting-panel">
      <div className="runtime-roster-head"><span><CalendarCheck size={14}/> {meetingCopy.title}</span><b>{openMeeting?attendance.length:meetings.filter(item=>item.status==='closed').length}</b></div>
      {!openMeeting?<div className="runtime-meeting-empty"><p>{meetingCopy.none}</p><button className="runtime-button primary compact" disabled={busy} onClick={()=>void startMeeting()}><Play size={15}/>{meetingCopy.open}</button></div>
      :<div className="runtime-meeting-open">
        <div className="runtime-meeting-summary"><span className="runtime-badge">{meetingCopy.present}: {attendance.length}</span><button className="runtime-button compact" disabled={busy} onClick={()=>void finishMeeting(openMeeting)}><Square size={14}/>{meetingCopy.close}</button></div>
        <div className="runtime-roster-list">
          {active.map(person=>{
            const present=presentIds.has(person.id)
            return <article key={'attendance-'+person.id}><span><strong>{person.name}</strong><small>{present?meetingCopy.present:meetingCopy.confirm}</small></span><button className={`runtime-icon-button ${present?'accept':''}`} disabled={busy||present} onClick={()=>void confirmAttendance(person.id,openMeeting)} aria-label={meetingCopy.confirm}>{present?<Check size={16}/>:<UserCheck size={16}/>}</button></article>
          })}
          {!active.length?<p className="runtime-roster-empty">{t.noExplicitParticipants}</p>:null}
        </div>
        <p className="runtime-attendance-rule"><ShieldCheck size={14}/>{meetingCopy.rule}</p>
      </div>}
    </section>

    <section className="runtime-entry-panel">
      <div className="runtime-roster-head"><span>{t.pendingEntryRequests}</span><b>{visiblePending.length}</b></div>
      <div className="runtime-roster-list">
        {visiblePending.map(request=><article key={request.id}><span><strong>{request.personName}</strong><small>{t.entryRequestOperational}</small></span><div className="runtime-inline-actions"><button className="runtime-icon-button accept" disabled={busy||participants>=capacity} onClick={()=>void resolveEntry(request,'accepted')} aria-label={t.acceptEntry}><Check size={16}/></button><button className="runtime-icon-button danger" disabled={busy} onClick={()=>void resolveEntry(request,'declined')} aria-label={t.declineEntry}><X size={16}/></button></div></article>)}
        {!visiblePending.length?<p className="runtime-roster-empty">{t.noPendingEntryRequests}</p>:null}
      </div>
    </section>

    <div className="runtime-roster-columns">
      <section><div className="runtime-roster-head"><span>{t.currentParticipants}</span><b>{active.length}</b></div><div className="runtime-roster-list">
        {active.map(person=><article key={person.id}><span><strong>{person.name}</strong><small>{t.explicitLink}</small></span><button className="runtime-icon-button danger" disabled={busy} onClick={()=>void remove(person)} aria-label={t.removeParticipant}><UserMinus size={16}/></button></article>)}
        {!active.length?<p className="runtime-roster-empty">{t.noExplicitParticipants}</p>:null}
      </div></section>
      <section><div className="runtime-roster-head"><span>{canRequest?t.availablePeople:t.entryRequestAccess}</span><b>{canRequest?available.length:'—'}</b></div><div className="runtime-roster-list">
        {canRequest?available.map(person=><article key={person.id}><span><strong>{person.name}</strong><small>{person.consent?t.contactAuthorized:t.contactNotAuthorized}</small></span><button className="runtime-icon-button" disabled={busy} onClick={()=>void requestEntry(person)} aria-label={t.requestEntry}><Send size={16}/></button></article>):<p className="runtime-roster-empty">{t.candidateRestricted}</p>}
        {canRequest&&!available.length?<p className="runtime-roster-empty">{t.noAvailablePeople}</p>:null}
      </div></section>
    </div>
    <p className="runtime-rule"><ShieldCheck size={15}/>{t.entryRequestRule}</p>
  </section></div>
}
