import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, House, Minus, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { auth } from './firebase'
import {
  createJourneyGroup,
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyGroups,
  loadJourneyAccess,
  updateJourneyGroup,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyGroupRecord,
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
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)

  const refresh = useCallback(async (orgId: string, unitId: string) => setGroups(await listJourneyGroups(orgId, unitId)), [])

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
    setCongregationId(unitId); setBusy(true); setError('')
    try { await refresh(access.organizationId, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function adjust(group: JourneyGroupRecord, delta: number) {
    if (!access) return
    const next = Math.max(0, (group.participants ?? 0) + delta)
    setBusy(true); setError('')
    try {
      await updateJourneyGroup({ organizationId: access.organizationId, groupId: group.id, actorId: access.userId, patch: { participants: next } })
      await refresh(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
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
        return <article className="runtime-panel runtime-card" key={group.id}><div className="runtime-card-head"><span className="runtime-icon"><House size={18}/></span><div><h2>{group.name}</h2><p>{[group.neighborhood,group.weekday,group.time].filter(Boolean).join(' · ')||'—'}</p></div><span className={ratio>=.85?'runtime-badge attention':'runtime-badge'}>{ratio>=.85?t.nearCapacity:t.healthy}</span></div>
          <div className="runtime-facts"><span><small>{t.leader}</small><b>{group.leader||'—'}</b></span><span><small>{t.host}</small><b>{group.host||'—'}</b></span><span><small>{t.apprentice}</small><b>{group.apprentice||'—'}</b></span></div>
          <div className="runtime-count"><Users size={17}/><span><small>{t.participants}</small><strong>{participants} / {capacity}</strong></span><div><button disabled={busy||participants===0} aria-label={t.decrease} onClick={()=>void adjust(group,-1)}><Minus size={16}/></button><button disabled={busy||participants>=capacity} aria-label={t.increase} onClick={()=>void adjust(group,1)}><Plus size={16}/></button></div></div>
        </article>
      })}
      {!groups.length ? <div className="runtime-panel runtime-empty">{t.empty}</div> : null}
    </section>
    <p className="runtime-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div>
  {showNew ? <NewGroupModal locale={locale} close={()=>setShowNew(false)} save={async data=>{
    if(!access)return;setBusy(true);setError('')
    try{await createJourneyGroup({organizationId:access.organizationId,congregationId,actorId:access.userId,...data});setShowNew(false);await refresh(access.organizationId,congregationId)}
    catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }}/> : null}
  </main>
}

function NewGroupModal({locale,close,save}:{locale:AppLocale;close:()=>void;save:(data:{name:string;leader:string;host:string;apprentice:string;neighborhood:string;weekday:string;time:string;capacity:number})=>Promise<void>}){
  const t=groupsRuntimeCopy[locale]
  const [name,setName]=useState(''),[leader,setLeader]=useState(''),[host,setHost]=useState(''),[apprentice,setApprentice]=useState(''),[neighborhood,setNeighborhood]=useState(''),[weekday,setWeekday]=useState(''),[time,setTime]=useState(''),[capacity,setCapacity]=useState(12)
  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal" onMouseDown={e=>e.stopPropagation()}><div className="runtime-modal-head"><h2>{t.newGroup}</h2><button className="runtime-button" onClick={close}><X size={17}/></button></div><div className="runtime-form">
    <label><span>{t.name}</span><input autoFocus value={name} onChange={e=>setName(e.target.value)}/></label><label><span>{t.leader}</span><input value={leader} onChange={e=>setLeader(e.target.value)}/></label><label><span>{t.host}</span><input value={host} onChange={e=>setHost(e.target.value)}/></label><label><span>{t.apprentice}</span><input value={apprentice} onChange={e=>setApprentice(e.target.value)}/></label><label><span>{t.neighborhood}</span><input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)}/></label><label><span>{t.weekday}</span><input value={weekday} onChange={e=>setWeekday(e.target.value)}/></label><label><span>{t.time}</span><input value={time} onChange={e=>setTime(e.target.value)}/></label><label><span>{t.capacity}</span><input type="number" min={1} max={100} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
  </div><div className="runtime-modal-actions"><button className="runtime-button" onClick={close}>{t.cancel}</button><button className="runtime-button primary" disabled={!name.trim()} onClick={()=>void save({name,leader,host,apprentice,neighborhood,weekday,time,capacity})}>{t.create}</button></div></section></div>
}
