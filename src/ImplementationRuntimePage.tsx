import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, ChevronLeft, CircleCheck, Clock3, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { auth } from './firebase'
import { completeImplementationStep, createImplementationCycle, getActiveJourneyOrganizationId, listImplementationCycles, listJourneyCongregations, loadJourneyAccess, type JourneyAccessContext, type JourneyCongregation, type JourneyImplementationCycle } from './journeyRepository'
import { IMPLEMENTATION_PREPARATION_KEYS, IMPLEMENTATION_REQUIRED_KEYS, implementationPlaybooks, implementationProgress, implementationWeekForProgress, implementationWeekKeys } from './implementationPlaybook'
import { getInitialLocale, implementationRuntimeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import './ImplementationRuntimePage.css'

export default function ImplementationRuntimePage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=implementationRuntimeCopy[locale],playbook=implementationPlaybooks[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [cycles,setCycles]=useState<JourneyImplementationCycle[]>([])
  const [selectedWeek,setSelectedWeek]=useState(1)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const cycle=cycles[0]
  const progress=useMemo(()=>implementationProgress(cycle?.completedKeys??[]),[cycle])
  const suggestedWeek=useMemo(()=>implementationWeekForProgress(cycle?.completedKeys??[]),[cycle])
  const completed=new Set(cycle?.completedKeys??[])
  const week=playbook.weeks[selectedWeek-1]

  const refresh=useCallback(async(orgId:string,unitId:string)=>{
    const next=await listImplementationCycles(orgId,unitId)
    setCycles(next)
    setSelectedWeek(next[0]?implementationWeekForProgress(next[0].completedKeys):1)
  },[])
  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!nextAccess.canManageImplementation)return
      const units=await listJourneyCongregations(nextAccess);setCongregations(units)
      const unitId=units[0]?.id??'';setCongregationId(unitId)
      if(unitId)await refresh(organizationId,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(unitId:string){if(!access)return;setCongregationId(unitId);setBusy(true);setError('');try{await refresh(access.organizationId,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}
  async function start(){if(!access||!congregationId)return;setBusy(true);setError('');try{await createImplementationCycle({organizationId:access.organizationId,congregationId,actorId:access.userId});await refresh(access.organizationId,congregationId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}
  async function mark(key:string){if(!access||!cycle||completed.has(key)||cycle.status==='completed')return;setBusy(true);setError('');try{await completeImplementationStep({organizationId:access.organizationId,cycle,actorId:access.userId,key,requiredKeys:IMPLEMENTATION_REQUIRED_KEYS});await refresh(access.organizationId,congregationId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}

  if(loading)return <main className="implementation-runtime"><div className="implementation-loading">{t.loading}</div></main>
  if(!access?.canManageImplementation)return <main className="implementation-runtime"><section className="implementation-panel implementation-no-access"><ShieldCheck size={34}/><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="implementation-button" onClick={()=>void bootstrap()}>{t.retry}</button></section></main>

  return <main className="implementation-runtime"><div className="implementation-shell">
    <header className="implementation-topbar"><div className="implementation-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="implementation-actions"><a href="/journey-overview"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="implementation-hero"><div><span className="implementation-kicker">Journey / Playbook</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>{!cycle?<button className="implementation-button primary" disabled={busy||!congregationId} onClick={()=>void start()}><Play size={17}/>{t.startCycle}</button>:null}</section>
    {error?<div className="implementation-error">{error}</div>:null}
    <section className="implementation-panel implementation-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(unit=><option key={unit.id} value={unit.id}>{unit.name}{unit.city?` · ${unit.city}`:''}</option>)}</select></label></section>

    {!cycle?<section className="implementation-panel implementation-empty"><BookOpen size={28}/><h2>{t.noCycle}</h2><p>{playbook.progressiveDecision}</p><button className="implementation-button primary" disabled={busy||!congregationId} onClick={()=>void start()}><Play size={17}/>{t.startCycle}</button></section>:<>
      <section className="implementation-panel implementation-cycle"><div><span className="implementation-kicker">{cycle.status==='completed'?t.completedCycle:t.activeCycle}</span><h2>{playbook.title}</h2><p>{playbook.subtitle}</p></div><div className="implementation-progress"><div><span>{t.progress}</span><strong>{progress.percent}%</strong></div><div className="implementation-progress-track"><i style={{width:`${progress.percent}%`}}/></div><small>{progress.done} / {progress.total}</small></div></section>
      {cycle.status==='completed'?<section className="implementation-panel implementation-complete"><CircleCheck size={26}/><div><strong>{t.completedCycle}</strong><p>{t.allDone}</p></div></section>:null}
      <section className="implementation-panel implementation-source"><Sparkles size={18}/><div><strong>{t.progressive}</strong><p>{playbook.progressiveDecision}</p><small>{t.source}</small></div></section>
      <section className="implementation-panel implementation-prep"><div className="implementation-section-title"><div><span className="implementation-kicker">0 / PREPARAÇÃO</span><h2>{t.preparation}</h2><p>{playbook.preparationIntro}</p></div><span className="implementation-step-count">{IMPLEMENTATION_PREPARATION_KEYS.filter(key=>completed.has(key)).length}/{IMPLEMENTATION_PREPARATION_KEYS.length}</span></div><div className="implementation-checklist">{playbook.preparation.map((item,index)=>{const key=IMPLEMENTATION_PREPARATION_KEYS[index],done=completed.has(key);return <button key={key} className={done?'done':''} disabled={busy||done||cycle.status==='completed'} onClick={()=>void mark(key)}><span>{done?<Check size={16}/>:index+1}</span><p>{item}</p><b>{done?t.done:t.markDone}</b></button>})}</div></section>
      <section className="implementation-rhythm"><div className="implementation-section-title"><div><span className="implementation-kicker">40–45 MIN</span><h2>{t.rhythm}</h2></div></div><div className="implementation-rhythm-grid">{playbook.rhythm.map(item=><article className="implementation-panel" key={item.block}><Clock3 size={16}/><strong>{item.time}</strong><span>{item.block}</span><p>{item.objective}</p></article>)}</div></section>
      <section className="implementation-week-layout">
        <aside className="implementation-panel implementation-week-nav"><span className="implementation-kicker">{t.weeks}</span>{playbook.weeks.map(item=>{const keys=implementationWeekKeys(item.week),doneCount=keys.filter(key=>completed.has(key)).length,isDone=doneCount===keys.length;return <button key={item.week} className={selectedWeek===item.week?'active':''} onClick={()=>setSelectedWeek(item.week)}><span className={isDone?'done':''}>{isDone?<Check size={14}/>:item.week}</span><div><strong>{t.week} {item.week}</strong><small>{item.title}</small></div><b>{doneCount}/{keys.length}</b>{suggestedWeek===item.week&&cycle.status!=='completed'?<i/>:null}</button>})}</aside>
        <section className="implementation-panel implementation-week-card"><div className="implementation-week-heading"><span className="implementation-kicker">{t.week} {week.week}</span><h2>{week.title}</h2><p>{week.objective}</p></div><blockquote>{week.facilitatorQuote}<small>{t.facilitator}</small></blockquote><div className="implementation-scriptures"><span>{t.scriptures}</span>{week.scriptures.map(ref=><b key={ref}>{ref}</b>)}</div><div className="implementation-content-block"><h3>{t.teaching}</h3><div className="implementation-checklist">{week.teaching.map((item,index)=>{const key=`week.${week.week}.teach.${index+1}`,done=completed.has(key);return <button key={key} className={done?'done':''} disabled={busy||done||cycle.status==='completed'} onClick={()=>void mark(key)}><span>{done?<Check size={16}/>:index+1}</span><p>{item}</p><b>{done?t.done:t.markDone}</b></button>})}</div></div><div className="implementation-practice"><span className="implementation-kicker">{t.practice}</span><p>{week.practice}</p>{(()=>{const key=`week.${week.week}.practice`,done=completed.has(key);return <button className={`implementation-button ${done?'done':''}`} disabled={busy||done||cycle.status==='completed'} onClick={()=>void mark(key)}>{done?<Check size={16}/>:<CircleCheck size={16}/>} {done?t.done:t.markDone}</button>})()}</div></section>
      </section>
      <p className="implementation-rule"><ShieldCheck size={15}/>{t.sourceNote}</p>
    </>}
  </div></main>
}
