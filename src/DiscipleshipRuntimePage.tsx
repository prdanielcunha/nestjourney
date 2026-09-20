import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, ChevronLeft, Leaf, Pause, Play, Plus, ShieldCheck, X } from 'lucide-react'
import { auth } from './firebase'
import {
  createJourneyDiscipleship,
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyPeople,
  loadJourneyAccess,
  updateJourneyDiscipleship,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import { discipleshipRuntimeCopy, getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import './JourneyRuntimePages.css'

export default function DiscipleshipRuntimePage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const baseCopy=discipleshipRuntimeCopy[locale]
  const { labels } = useJourneyLabels()
  const t={...baseCopy,title:labels.discipleship||baseCopy.title}
  const [access,setAccess]=useState<JourneyAccessContext|null>(null),[congregations,setCongregations]=useState<JourneyCongregation[]>([]),[congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([]),[items,setItems]=useState<JourneyDiscipleshipRecord[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showNew,setShowNew]=useState(false)
  const activePersonIds=useMemo(()=>new Set(items.filter(x=>x.status!=='completed').map(x=>x.personId)),[items])

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextItems]=await Promise.all([listJourneyPeople(nextAccess.organizationId,unitId),listJourneyDiscipleships(nextAccess,unitId)])
    setPeople(nextPeople);setItems(nextItems)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!(nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess))return
      const units=await listJourneyCongregations(nextAccess);setCongregations(units);const unitId=units[0]?.id??'';setCongregationId(unitId);if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(unitId:string){if(!access)return;setCongregationId(unitId);setBusy(true);setError('');try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}
  async function act(item:JourneyDiscipleshipRecord,action:'advance'|'pause'|'resume'){if(!access)return;setBusy(true);setError('');try{await updateJourneyDiscipleship({organizationId:access.organizationId,relation:item,actorId:access.userId,action});await refresh(access,congregationId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}

  const empty=emptyGuidance(locale,'discipleship_none')
  const availablePeople=people.filter(person=>!activePersonIds.has(person.id))

  if(loading)return <main className="journey-runtime"><div className="runtime-loading">{t.loading}</div></main>
  if(!(access?.canManageDiscipleship||access?.broadJourneyAccess))return <main className="journey-runtime"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={()=>void bootstrap()} /></main>

  return <main className="journey-runtime"><div className="runtime-shell">
    <header className="runtime-topbar"><div className="runtime-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="runtime-actions"><a href="/my-today"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="runtime-hero"><div><span className="runtime-kicker">Journey / Track</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="runtime-button primary" disabled={!availablePeople.length} onClick={()=>setShowNew(true)}><Plus size={17}/>{t.newRelation}</button></section>
    {error?<div className="runtime-error">{error}</div>:null}
    <section className="runtime-panel runtime-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}{x.city?` · ${x.city}`:''}</option>)}</select></label></section>
    <section className="runtime-grid">
      {items.map(item=>{
        const prep=locale==='en'
          ? {title:'Prepare this meeting',items:['Pray before the conversation','Review the official material for this meeting','Prepare open questions and listen without rushing','Do not record intimate or sensitive narratives']}
          : locale==='es'
            ? {title:'Prepara este encuentro',items:['Ora antes de la conversación','Revisa el material oficial de este encuentro','Prepara preguntas abiertas y escucha sin prisa','No registres relatos íntimos o sensibles']}
            : {title:'Prepare este encontro',items:['Ore antes da conversa','Revise o material oficial deste encontro','Prepare perguntas abertas e escute sem pressa','Não registre relatos íntimos ou sensíveis']}
        return <article className="runtime-panel runtime-card" key={item.id}><div className="runtime-card-head"><span className="runtime-icon"><Leaf size={18}/></span><div><h2>{item.personName||item.personId}</h2><p>{t.discipler}: {item.disciplerName||item.disciplerId}</p></div><span className={`runtime-badge ${item.status==='paused'?'attention':''}`}>{item.status==='completed'?t.completed:item.status==='paused'?t.paused:t.active}</span></div>
        <div className="runtime-progress"><span><small>{t.meeting}</small><strong>{item.meeting}/7</strong></span><div><i style={{width:`${Math.min(100,item.meeting/7*100)}%`}}/></div></div><p className="runtime-next"><b>{t.next}:</b> {item.nextMeeting||'—'}</p>
        {item.status!=='completed'?<div className="runtime-preparation"><span><BookOpen size={15}/><strong>{prep.title} · {item.meeting}/7</strong></span><ul>{prep.items.map(step=><li key={step}>{step}</li>)}</ul></div>:null}
        <div className="runtime-card-actions">{item.status!=='completed'?<><button className="runtime-button primary" disabled={busy||item.status==='paused'} onClick={()=>void act(item,'advance')}><CheckCircle2 size={16}/>{t.advance}</button>{item.status==='paused'?<button className="runtime-button" disabled={busy} onClick={()=>void act(item,'resume')}><Play size={16}/>{t.resume}</button>:<button className="runtime-button" disabled={busy} onClick={()=>void act(item,'pause')}><Pause size={16}/>{t.pause}</button>}</>:null}</div>
      </article>})}
      {!items.length?<div className="runtime-panel"><GuidedEmptyState icon={Leaf} title={empty.title} body={empty.body} primary={availablePeople.length?{label:empty.primary,onClick:()=>setShowNew(true)}:{label:locale==='en'?'View People':locale==='es'?'Ver Personas':'Ver Pessoas',href:'/journey-profile'}} secondary={{label:empty.secondary||t.empty,href:'/journey-profile'}}/></div>:null}
    </section><p className="runtime-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div>
  {showNew?<NewRelationModal locale={locale} people={people} activePersonIds={activePersonIds} close={()=>setShowNew(false)} save={async person=>{
    if(!access)return;setBusy(true);setError('')
    try{await createJourneyDiscipleship({organizationId:access.organizationId,congregationId,person,actorId:access.userId,disciplerName:auth?.currentUser?.displayName||''});setShowNew(false);await refresh(access,congregationId)}
    catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }}/>:null}</main>
}

function NewRelationModal({locale,people,activePersonIds,close,save}:{locale:AppLocale;people:JourneyPersonRecord[];activePersonIds:Set<string>;close:()=>void;save:(person:JourneyPersonRecord)=>Promise<void>}){
  const t=discipleshipRuntimeCopy[locale],available=people.filter(x=>!activePersonIds.has(x.id)),[personId,setPersonId]=useState(available[0]?.id??'')
  const person=available.find(x=>x.id===personId)
  return <div className="runtime-modal-backdrop" onMouseDown={close}><section className="runtime-panel runtime-modal" onMouseDown={e=>e.stopPropagation()}><div className="runtime-modal-head"><h2>{t.newRelation}</h2><button className="runtime-button" onClick={close}><X size={17}/></button></div><div className="runtime-form"><label><span>{t.choosePerson}</span><select value={personId} onChange={e=>setPersonId(e.target.value)}>{available.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{!available.length?<p className="runtime-muted">{t.duplicate}</p>:null}</div><div className="runtime-modal-actions"><button className="runtime-button" onClick={close}>{t.cancel}</button><button className="runtime-button primary" disabled={!person} onClick={()=>person&&void save(person)}>{t.start}</button></div></section></div>
}
