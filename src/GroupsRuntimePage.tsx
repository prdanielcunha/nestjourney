import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, House, Plus, Search, ShieldCheck, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { auth } from './firebase'
import {
  canManageJourneyGroupRoster,
  createJourneyGroup,
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyGroupMemberships,
  listJourneyGroups,
  listJourneyPeople,
  loadJourneyAccess,
  setJourneyGroupMembership,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyGroupMembership,
  type JourneyGroupRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import { getInitialLocale, groupsRuntimeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneyRuntimePages.css'

export default function GroupsRuntimePage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = groupsRuntimeCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [groups, setGroups] = useState<JourneyGroupRecord[]>([])
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [rosterGroup, setRosterGroup] = useState<JourneyGroupRecord | null>(null)
  const [roster, setRoster] = useState<JourneyGroupMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)

  const refresh = useCallback(async (orgId: string, unitId: string) => {
    const [nextGroups, nextPeople] = await Promise.all([
      listJourneyGroups(orgId, unitId),
      listJourneyPeople(orgId, unitId),
    ])
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
      const unitId = units[0]?.id ?? ''
      setCongregationId(unitId)
      if (unitId) await refresh(organizationId, unitId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setLoading(false) }
  }, [refresh, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  async function selectUnit(unitId: string) {
    if (!access) return
    setCongregationId(unitId); setBusy(true); setError(''); setRosterGroup(null); setRoster([])
    try { await refresh(access.organizationId, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function openRoster(group: JourneyGroupRecord) {
    if (!access || !canManageJourneyGroupRoster(access, group)) return
    setBusy(true); setError('')
    try {
      const next = await listJourneyGroupMemberships(access, group)
      setRoster(next)
      setRosterGroup(group)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function changeMembership(person: JourneyPersonRecord, active: boolean) {
    if (!access || !rosterGroup) return
    setBusy(true); setError('')
    try {
      await setJourneyGroupMembership({ access, group: rosterGroup, person, active })
      const nextGroups = await refresh(access.organizationId, congregationId)
      const nextGroup = nextGroups.find((item) => item.id === rosterGroup.id) ?? rosterGroup
      setRosterGroup(nextGroup)
      setRoster(await listJourneyGroupMemberships(access, nextGroup))
    } catch (cause) {
      console.error(cause)
      setError(cause instanceof Error && cause.message === 'group_capacity_reached' ? t.capacityReached : t.error)
    } finally { setBusy(false) }
  }

  if (loading) return <main className="journey-runtime"><div className="runtime-loading">{t.loading}</div></main>
  if (!(access?.canManageGroups || access?.broadJourneyAccess)) return <main className="journey-runtime"><section className="runtime-panel runtime-no-access"><ShieldCheck size={34}/><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="runtime-button" onClick={() => void bootstrap()}>{t.retry}</button></section></main>

  return <main className="journey-runtime"><div className="runtime-shell">
    <header className="runtime-topbar"><div className="runtime-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="runtime-actions"><a href="/my-today"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={(e)=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="runtime-hero"><div><span className="runtime-kicker">Journey / Community</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="runtime-button primary" onClick={()=>setShowNew(true)}><Plus size={17}/>{t.newGroup}</button></section>
    {error ? <div className="runtime-error">{error}</div> : null}
    <section className="runtime-panel runtime-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={(e)=>void selectUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}{x.city?` · ${x.city}`:''}</option>)}</select></label></section>
    <section className="runtime-grid">
      {groups.map(group=>{
        const participants=group.participants??0, capacity=Math.max(1,group.capacity??12), ratio=participants/capacity
        const canRoster=Boolean(access&&canManageJourneyGroupRoster(access,group))
        return <article className="runtime-panel runtime-card" key={group.id}>
          <div className="runtime-card-head"><span className="runtime-icon"><House size={18}/></span><div><h2>{group.name}</h2><p>{[group.neighborhood,group.weekday,group.time].filter(Boolean).join(' · ')||'—'}</p></div><span className={ratio>=.85?'runtime-badge attention':'runtime-badge'}>{ratio>=.85?t.nearCapacity:t.healthy}</span></div>
          <div className="runtime-facts"><span><small>{t.leader}</small><b>{group.leader||'—'}</b></span><span><small>{t.host}</small><b>{group.host||'—'}</b></span><span><small>{t.apprentice}</small><b>{group.apprentice||'—'}</b></span></div>
          <div className="runtime-count"><Users size={17}/><span><small>{t.participants}</small><strong>{participants} / {capacity}</strong></span>{canRoster?<button className="runtime-button compact" disabled={busy} onClick={()=>void openRoster(group)}>{t.manageRoster}</button>:<small className="runtime-count-note">{t.rosterRestricted}</small>}</div>
        </article>
      })}
      {!groups.length ? <div className="runtime-panel runtime-empty">{t.empty}</div> : null}
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
      setShowNew(false);await refresh(access.organizationId,congregationId)
    } catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }}/> : null}
  {rosterGroup&&access?<RosterModal locale={locale} group={rosterGroup} people={people} memberships={roster} busy={busy} close={()=>{setRosterGroup(null);setRoster([])}} change={changeMembership}/>:null}
  </main>
}

function NewGroupModal({locale,close,save}:{locale:AppLocale;close:()=>void;save:(data:{name:string;leader:string;host:string;apprentice:string;neighborhood:string;weekday:string;time:string;capacity:number})=>Promise<void>}){
  const t=groupsRuntimeCopy[locale]
  const [name,setName]=useState(''),[leader,setLeader]=useState(''),[host,setHost]=useState(''),[apprentice,setApprentice]=useState(''),[neighborhood,setNeighborhood]=useState(''),[weekday,setWeekday]=useState(''),[time,setTime]=useState(''),[capacity,setCapacity]=useState(12)
  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal" onMouseDown={e=>e.stopPropagation()}><div className="runtime-modal-head"><h2>{t.newGroup}</h2><button className="runtime-button" onClick={close}><X size={17}/></button></div><div className="runtime-form">
    <label><span>{t.name}</span><input autoFocus value={name} onChange={e=>setName(e.target.value)}/></label><label><span>{t.leader}</span><input value={leader} onChange={e=>setLeader(e.target.value)}/></label><label><span>{t.host}</span><input value={host} onChange={e=>setHost(e.target.value)}/></label><label><span>{t.apprentice}</span><input value={apprentice} onChange={e=>setApprentice(e.target.value)}/></label><label><span>{t.neighborhood}</span><input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)}/></label><label><span>{t.weekday}</span><input value={weekday} onChange={e=>setWeekday(e.target.value)}/></label><label><span>{t.time}</span><input value={time} onChange={e=>setTime(e.target.value)}/></label><label><span>{t.capacity}</span><input type="number" min={1} max={100} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
  </div><div className="runtime-modal-actions"><button className="runtime-button" onClick={close}>{t.cancel}</button><button className="runtime-button primary" disabled={!name.trim()} onClick={()=>void save({name,leader,host,apprentice,neighborhood,weekday,time,capacity})}>{t.create}</button></div></section></div>
}

function RosterModal({locale,group,people,memberships,busy,close,change}:{locale:AppLocale;group:JourneyGroupRecord;people:JourneyPersonRecord[];memberships:JourneyGroupMembership[];busy:boolean;close:()=>void;change:(person:JourneyPersonRecord,active:boolean)=>Promise<void>}){
  const t=groupsRuntimeCopy[locale]
  const [query,setQuery]=useState('')
  const activeIds=useMemo(()=>new Set(memberships.filter(item=>item.status==='active').map(item=>item.personId)),[memberships])
  const needle=query.trim().toLocaleLowerCase(locale)
  const visible=people.filter(person=>!needle||person.name.toLocaleLowerCase(locale).includes(needle))
  const active=visible.filter(person=>activeIds.has(person.id))
  const available=visible.filter(person=>!activeIds.has(person.id))
  const capacity=Math.max(1,group.capacity??12)
  const participants=group.participants??0

  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal runtime-roster-modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="runtime-modal-head"><div><span className="runtime-kicker">Journey / Community</span><h2>{group.name}</h2><p className="runtime-muted">{participants} / {capacity} · {t.explicitRoster}</p></div><button className="runtime-button" onClick={close}><X size={17}/></button></div>
    <label className="runtime-roster-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.searchPerson}/></label>
    <div className="runtime-roster-columns">
      <section><div className="runtime-roster-head"><span>{t.currentParticipants}</span><b>{active.length}</b></div><div className="runtime-roster-list">
        {active.map(person=><article key={person.id}><span><strong>{person.name}</strong><small>{t.explicitLink}</small></span><button className="runtime-icon-button danger" disabled={busy} onClick={()=>void change(person,false)} aria-label={t.removeParticipant}><UserMinus size={16}/></button></article>)}
        {!active.length?<p className="runtime-roster-empty">{t.noExplicitParticipants}</p>:null}
      </div></section>
      <section><div className="runtime-roster-head"><span>{t.availablePeople}</span><b>{available.length}</b></div><div className="runtime-roster-list">
        {available.map(person=><article key={person.id}><span><strong>{person.name}</strong><small>{person.consent?t.contactAuthorized:t.contactNotAuthorized}</small></span><button className="runtime-icon-button" disabled={busy||participants>=capacity} onClick={()=>void change(person,true)} aria-label={t.addParticipant}><UserPlus size={16}/></button></article>)}
        {!available.length?<p className="runtime-roster-empty">{t.noAvailablePeople}</p>:null}
      </div></section>
    </div>
    <p className="runtime-rule"><ShieldCheck size={15}/>{t.rosterRule}</p>
  </section></div>
}
