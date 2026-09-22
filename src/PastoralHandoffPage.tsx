import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ShieldAlert, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyPeople,
  listPastoralHandoffs,
  loadJourneyAccess,
  resolvePastoralHandoff,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, pastoralHandoffCopy, persistLocale, type AppLocale } from './i18n'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './PastoralHandoffPage.css'

type Tab = 'open' | 'resolved'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default function PastoralHandoffPage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=pastoralHandoffCopy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [handoffs,setHandoffs]=useState<JourneyPastoralHandoff[]>([])
  const [tab,setTab]=useState<Tab>('open')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const peopleById=useMemo(()=>new Map(people.map((person)=>[person.id,person])),[people])
  const open=useMemo(()=>handoffs.filter((item)=>item.status==='open'),[handoffs])
  const resolved=useMemo(()=>handoffs.filter((item)=>item.status==='resolved'),[handoffs])
  const visible=tab==='open'?open:resolved
  const empty=emptyGuidance(locale,tab==='open'?'pastoral_open_clear':'pastoral_resolved_none')

  const activeUnit=congregations.find(item=>item.id===congregationId)
  const focusTitle=open.length>0
    ?locale==='en'?open.length+' pastoral handoff(s) waiting':locale==='es'?open.length+' derivación(es) pastoral(es) pendientes':open.length+' encaminhamento(s) pastoral(is) aguardando'
    :locale==='en'?'No pastoral handoff is waiting':locale==='es'?'No hay derivaciones pastorales pendientes':'Nenhum encaminhamento pastoral aguardando'
  const focusBody=open.length>0
    ?locale==='en'?'Open the pending list and make the pastoral contact. Keep this space restricted to the marker and action — not intimate narratives.'
      :locale==='es'?'Abre la lista pendiente y realiza el contacto pastoral. Mantén este espacio restringido al marcador y a la acción, no a relatos íntimos.'
      :'Abra a lista pendente e faça o contato pastoral. Mantenha este espaço restrito ao marcador e à ação — não a relatos íntimos.'
    :locale==='en'?'The pastoral queue is clear. Nothing needs to be opened just to fill the screen.'
      :locale==='es'?'La fila pastoral está al día. No hace falta abrir nada solo para llenar la pantalla.'
      :'A fila pastoral está em dia. Nada precisa ser aberto apenas para preencher a tela.'

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextHandoffs]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      listPastoralHandoffs(nextAccess.organizationId,unitId),
    ])
    setPeople(nextPeople)
    setHandoffs(nextHandoffs)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId)
      setAccess(nextAccess)
      if(!nextAccess.canManagePastoral)return
      const units=await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId=units[0]?.id??''
      setCongregationId(unitId)
      if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])

  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(unitId:string){
    if(!access)return
    setCongregationId(unitId);setBusy(true);setError('')
    try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function resolve(item:JourneyPastoralHandoff){
    if(!access||busy)return
    setBusy(true);setError('')
    try{
      await resolvePastoralHandoff({organizationId:access.organizationId,handoff:item,actorId:access.userId})
      await refresh(access,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="pastoral-runtime"><div className="pastoral-loading">{t.loading}</div></main>
  if(!access?.canManagePastoral)return <main className="pastoral-runtime"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={()=>void bootstrap()} /></main>

  return <main className="pastoral-runtime"><div className="pastoral-shell">
    <header className="pastoral-topbar">
      <div className="pastoral-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="pastoral-actions"><a href="/vision"><ArrowLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="pastoral-hero"><div><span className="pastoral-kicker">Journey / Pastoral</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><span className="pastoral-badge"><ShieldCheck size={15}/>{t.restricted}</span></section>
    {error?<div className="pastoral-error">{error}</div>:null}

    <JourneyAreaFocus
      locale={locale}
      context={activeUnit?.name}
      title={focusTitle}
      body={focusBody}
      metrics={[
        {label:t.open,value:open.length,tone:open.length?'attention':'muted'},
        {label:t.resolved,value:resolved.length,tone:resolved.length?'good':'muted'},
      ]}
      actions={open.length
        ?[{label:t.open,onClick:()=>{setTab('open');document.getElementById('pastoral-list')?.scrollIntoView({behavior:'smooth',block:'start'})},primary:true}]
        :[{label:t.back,href:'/vision',primary:true}]
      }
    />

    {congregations.length>1?<section className="journey-area-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(unit=><option key={unit.id} value={unit.id}>{unit.name}{unit.city?` · ${unit.city}`:''}</option>)}</select></label></section>:null}

    <div className="pastoral-safety"><ShieldAlert size={18}/><p>{t.safety}</p></div>

    <nav className="pastoral-tabs"><button className={tab==='open'?'active':''} onClick={()=>setTab('open')}>{t.open} <b>{open.length}</b></button><button className={tab==='resolved'?'active':''} onClick={()=>setTab('resolved')}>{t.resolved} <b>{resolved.length}</b></button></nav>

    <section className="pastoral-list" id="pastoral-list">
      {visible.map(item=>{
        const person=peopleById.get(item.personId)
        return <article className="pastoral-panel pastoral-card" key={item.id}>
          <i>{initials(person?.name||'?')}</i>
          <div className="pastoral-card-body"><span className="pastoral-kicker">{t.marker}</span><h2>{person?.name||t.unknownPerson}</h2><p>{t.markerOnly}</p><small>{t.requested} · {formatDate(item.requestedAt)}</small>{item.status==='resolved'?<small>{t.completed} · {formatDate(item.resolvedAt)}</small>:null}</div>
          {item.status==='open'?<button className="pastoral-button primary" disabled={busy} onClick={()=>void resolve(item)}><UserRoundCheck size={16}/>{t.markContacted}</button>:<span className="pastoral-done"><CheckCircle2 size={15}/>{t.done}</span>}
        </article>
      })}
      {!visible.length?<div className="pastoral-panel"><GuidedEmptyState icon={ShieldCheck} title={empty.title} body={empty.body} primary={tab==='open'?{label:empty.primary,href:'/vision'}:{label:empty.primary,onClick:()=>setTab('open')}} secondary={{label:empty.secondary||t.back,href:tab==='open'?'/my-today':'/vision'}}/></div>:null}
    </section>

    <p className="pastoral-rule"><ShieldCheck size={15}/>{t.privacyRule}</p>
  </div></main>
}
