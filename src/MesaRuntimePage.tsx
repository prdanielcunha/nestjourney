import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ClipboardCheck, ShieldCheck, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import { withTimeout } from './asyncGuard'
import { JourneyLoadState } from './JourneyLoadState'
import {
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listJourneyCongregations,
  listMesaParticipationRecords,
  loadMesaPreparation,
  listPresencePeople,
  listPresenceSessions,
  loadJourneyAccess,
  setMesaParticipation,
  setMesaPreparationItem,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type MesaParticipationRecord,
  type MesaPreparationItemKey,
  type MesaPreparationRecord,
  type PresencePerson,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './JourneySectionPages.css'
import './MesaRuntimePage.css'

const copy={
  'pt-BR':{
    title:'Mesa Aberta',subtitle:'A Mesa é vínculo, não funil. Organize convidados e registre apenas o que realmente aconteceu.',
    loading:'Preparando a Mesa…',noAccess:'Seu perfil não possui acesso à operação da Mesa.',
    unit:'Unidade',service:'Culto / sessão',noSession:'Ainda não existe uma sessão de culto para esta unidade. A equipe de Presença precisa abrir a sessão antes do registro da Mesa.',
    guests:'Convidados',joined:'Participaram',people:'Pessoas',search:'Buscar pessoa…',invite:'Registrar convite',invited:'Convidado',markJoined:'Registrar participação',participated:'Participou',
    relationship:'Anfitrião de vínculo',relationshipHint:'O primeiro responsável fica associado ao registro para dar continuidade ao vínculo.',preparation:'Preparação do próximo culto',preparationHint:'A equipe vê o que já está pronto e quem assumiu cada item.',environment:'Ambiente preparado',hosts:'Anfitriões confirmados',hospitality:'Recepção da Mesa alinhada',supplies:'Equipe responsável pelo café alinhada',ready:'Mesa pronta',preparing:'Em preparação',you:'Você',otherOwner:'Outro responsável',
    empty:'Nenhuma pessoa encontrada.',rule:'Registre somente convite ou participação real. O status não mede interesse espiritual, maturidade ou valor da pessoa.',error:'Não foi possível carregar a Mesa.',
  },
  en:{
    title:'Open Table',subtitle:'The Table is relationship, not a funnel. Organize guests and record only what actually happened.',
    loading:'Preparing the Table…',noAccess:'Your profile does not have access to Table operations.',
    unit:'Campus',service:'Service / session',noSession:'There is no service session for this campus yet. The Presence team must open one before Table participation can be recorded.',
    guests:'Invited',joined:'Joined',people:'People',search:'Search person…',invite:'Record invitation',invited:'Invited',markJoined:'Record participation',participated:'Joined',
    relationship:'Relationship host',relationshipHint:'The first responsible person stays associated with the record to support continuity.',preparation:'Next service preparation',preparationHint:'The team sees what is ready and who took responsibility for each item.',environment:'Environment ready',hosts:'Hosts confirmed',hospitality:'Table welcome aligned',supplies:'Coffee service team confirmed',ready:'Table ready',preparing:'In preparation',you:'You',otherOwner:'Another owner',
    empty:'No people found.',rule:'Record only a real invitation or participation. Status does not measure spiritual interest, maturity, or personal value.',error:'The Table could not be loaded.',
  },
  es:{
    title:'Mesa Abierta',subtitle:'La Mesa es vínculo, no embudo. Organiza invitados y registra solamente lo que realmente ocurrió.',
    loading:'Preparando la Mesa…',noAccess:'Tu perfil no tiene acceso a la operación de la Mesa.',
    unit:'Sede',service:'Culto / sesión',noSession:'Todavía no existe una sesión de culto para esta sede. El equipo de Presencia debe abrirla antes del registro de la Mesa.',
    guests:'Invitados',joined:'Participaron',people:'Personas',search:'Buscar persona…',invite:'Registrar invitación',invited:'Invitado',markJoined:'Registrar participación',participated:'Participó',
    relationship:'Anfitrión de vínculo',relationshipHint:'La primera persona responsable queda asociada al registro para dar continuidad al vínculo.',preparation:'Preparación del próximo culto',preparationHint:'El equipo ve lo que ya está listo y quién asumió cada elemento.',environment:'Ambiente preparado',hosts:'Anfitriones confirmados',hospitality:'Recepción de la Mesa alineada',supplies:'Equipo de café coordinado',ready:'Mesa lista',preparing:'En preparación',you:'Tú',otherOwner:'Otro responsable',
    empty:'No se encontraron personas.',rule:'Registra solamente invitación o participación real. El estado no mide interés espiritual, madurez ni valor de la persona.',error:'No se pudo cargar la Mesa.',
  }
} as const

export default function MesaRuntimePage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const base=copy[locale]
  const {labels}=useJourneyLabels()
  const t={...base,title:labels.table||base.title}
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [sessionId,setSessionId]=useState('')
  const [people,setPeople]=useState<PresencePerson[]>([])
  const [records,setRecords]=useState<MesaParticipationRecord[]>([])
  const [preparation,setPreparation]=useState<MesaPreparationRecord|null>(null)
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadingSlow,setLoadingSlow]=useState(false)
  const [loadFailed,setLoadFailed]=useState(false)
  const bootstrapRef=useRef(0)
  const scopeKeyRef=useRef('')
  const scopeRequestRef=useRef(0)
  const selectedSessionRef=useRef('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const loadScope=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const scope=nextAccess.organizationId+':'+unitId
    if(scopeKeyRef.current!==scope)return
    const request=++scopeRequestRef.current
    const [nextPeople,nextSessions]=await withTimeout(Promise.all([
      listPresencePeople(nextAccess.organizationId,unitId),
      listPresenceSessions(nextAccess.organizationId,unitId),
    ]),11000,'mesa_roster')
    const selected=nextSessions.find(x=>x.id===selectedSessionRef.current)
      ??nextSessions.find(x=>x.status==='open')??nextSessions[0]
    const nextSessionId=selected?.id??''
    const [nextRecords,nextPreparation]=nextSessionId
      ?await withTimeout(Promise.all([
        listMesaParticipationRecords(nextAccess.organizationId,unitId,nextSessionId),
        loadMesaPreparation(nextAccess.organizationId,unitId,nextSessionId),
      ]),11000,'mesa_session')
      :[[],null] as [MesaParticipationRecord[],MesaPreparationRecord|null]
    if(scopeKeyRef.current!==scope||request!==scopeRequestRef.current)return
    selectedSessionRef.current=nextSessionId
    setPeople(nextPeople.filter(person=>!person.archived))
    setSessions(nextSessions)
    setSessionId(nextSessionId)
    setRecords(nextRecords)
    setPreparation(nextPreparation)
  },[])

  const bootstrap=useCallback(async()=>{
    const run=++bootstrapRef.current
    ++scopeRequestRef.current
    scopeKeyRef.current='';selectedSessionRef.current=''
    setLoading(true);setLoadingSlow(false);setLoadFailed(false);setError('')
    setAccess(null);setCongregations([]);setCongregationId('')
    setPeople([]);setSessions([]);setSessionId('');setRecords([]);setPreparation(null)
    const slowTimer=window.setTimeout(()=>{if(run===bootstrapRef.current)setLoadingSlow(true)},5000)
    try{
      await withTimeout((async()=>{
        const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
        if(!user||!organizationId)throw new Error('missing_ecosystem_context')
        const nextAccess=await loadJourneyAccess(user.uid,organizationId)
        if(run!==bootstrapRef.current)return
        setAccess(nextAccess)
        if(!nextAccess.canManageMesa)return
        const units=await listJourneyCongregations(nextAccess)
        if(run!==bootstrapRef.current)return
        setCongregations(units)
        const unitId=resolveActiveJourneyCongregationId(nextAccess.organizationId,units)
        scopeKeyRef.current=nextAccess.organizationId+':'+unitId
        setCongregationId(unitId)
        if(unitId)await loadScope(nextAccess,unitId)
      })(),14000,'mesa_bootstrap')
    }catch(cause){
      if(run!==bootstrapRef.current)return
      ++scopeRequestRef.current
      console.error('Mesa bootstrap failed',cause)
      setLoadFailed(true)
    }finally{
      window.clearTimeout(slowTimer)
      if(run===bootstrapRef.current)setLoading(false)
    }
  },[loadScope])
  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>()=>{bootstrapRef.current++;scopeRequestRef.current++},[])

  useEffect(()=>{
    if(!access?.canManageMesa||!congregationId||loadFailed)return
    try{
      return subscribeJourneyLiveChanges({
        organizationId:access.organizationId,
        congregationId,
        collections:['people','presenceSessions','mesaParticipations','mesaPreparations'],
        onChange:()=>{void loadScope(access,congregationId).catch(cause=>{console.error('Mesa live refresh failed',cause);setError('read_failed')})},
        onError:cause=>{console.error('Mesa live subscription failed',cause);setError('read_failed')},
      })
    }catch(cause){console.error('Mesa live subscription failed',cause);setError('read_failed')}
  },[access,congregationId,loadFailed,loadScope])

  async function changeUnit(unitId:string){
    if(!access)return
    const scope=access.organizationId+':'+unitId
    scopeKeyRef.current=scope
    selectedSessionRef.current=''
    ++scopeRequestRef.current
    setBusy(true);setCongregationId(unitId)
    setPeople([]);setSessions([]);setSessionId('');setRecords([]);setPreparation(null)
    setActiveJourneyCongregationId(access.organizationId,unitId);setError('')
    try{await loadScope(access,unitId)}
    catch(cause){++scopeRequestRef.current;console.error('Mesa congregation load failed',cause);setError('read_failed')}
    finally{setBusy(false)}
  }

  async function changeSession(nextSessionId:string){
    if(!access)return
    const request=++scopeRequestRef.current
    const scope=scopeKeyRef.current
    selectedSessionRef.current=nextSessionId
    setBusy(true);setSessionId(nextSessionId);setRecords([]);setPreparation(null);setError('')
    try{
      if(nextSessionId){
        const [nextRecords,nextPreparation]=await withTimeout(Promise.all([
          listMesaParticipationRecords(access.organizationId,congregationId,nextSessionId),
          loadMesaPreparation(access.organizationId,congregationId,nextSessionId),
        ]),11000,'mesa_change_session')
        if(scope===scopeKeyRef.current&&request===scopeRequestRef.current){
          setRecords(nextRecords);setPreparation(nextPreparation)
        }
      }
    }catch(cause){console.error('Mesa session load failed',cause);setError('read_failed')}
    finally{setBusy(false)}
  }

  async function togglePreparation(item:MesaPreparationItemKey,checked:boolean){
    if(!access||!sessionId)return
    setBusy(true);setError('')
    try{
      const scope=scopeKeyRef.current,selected=sessionId
      await setMesaPreparationItem({access,congregationId,sessionId,item,checked})
      const next=await loadMesaPreparation(access.organizationId,congregationId,sessionId)
      if(scope===scopeKeyRef.current&&selected===selectedSessionRef.current)setPreparation(next)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function mark(person:PresencePerson,status:'invited'|'joined'){
    if(!access||!sessionId)return
    setBusy(true);setError('')
    try{
      const scope=scopeKeyRef.current,selected=sessionId
      await setMesaParticipation({organizationId:access.organizationId,congregationId,sessionId,personId:person.id,actorId:access.userId,status})
      const next=await listMesaParticipationRecords(access.organizationId,congregationId,sessionId)
      if(scope===scopeKeyRef.current&&selected===selectedSessionRef.current)setRecords(next)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  const byPerson=useMemo(()=>new Map(records.map(x=>[x.personId,x])),[records])
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(locale)
    return needle?people.filter(p=>p.name.toLocaleLowerCase(locale).includes(needle)):people
  },[people,query,locale])
  const invited=records.filter(x=>x.status==='invited').length
  const joined=records.filter(x=>x.status==='joined').length

  const noSessionGuide=emptyGuidance(locale,'mesa_no_session')
  const noPeopleGuide=emptyGuidance(locale,'mesa_no_people')
  const activeUnit=congregations.find(x=>x.id===congregationId)
  const activeSession=sessions.find(x=>x.id===sessionId)
  const preparationCount=Object.values(preparation?.items??{}).filter(Boolean).length
  const focusTitle=!activeSession
    ?locale==='en'?'Open Presence before operating the Table':locale==='es'?'Abre Presencia antes de operar la Mesa':'Abra Presença antes de operar a Mesa'
    :activeSession.status==='open'&&preparation?.status!=='ready'
      ?locale==='en'?'Prepare the Table before the service ends':locale==='es'?'Prepara la Mesa antes de terminar el culto':'Prepare a Mesa antes do encerramento do culto'
      :invited>0
        ?locale==='en'?invited+' guest(s) still need a real participation record':locale==='es'?invited+' invitado(s) aún necesitan un registro real de participación':invited+' convidado(s) ainda precisam de registro real de participação'
        :locale==='en'?'Table flow is ready':locale==='es'?'El flujo de la Mesa está listo':'O fluxo da Mesa está pronto'
  const focusBody=!activeSession
    ?locale==='en'?'The Table starts from a factual service session. Do not create a parallel list here.'
      :locale==='es'?'La Mesa parte de una sesión factual del culto. No crees una lista paralela aquí.'
      :'A Mesa começa a partir de uma sessão factual do culto. Não crie uma lista paralela aqui.'
    :preparation?.status!=='ready'
      ?t.preparationHint
      :locale==='en'?'Now register invitations and participation only when they actually happened, preserving relationship continuity.'
        :locale==='es'?'Ahora registra invitaciones y participación solo cuando realmente ocurrieron, preservando la continuidad del vínculo.'
        :'Agora registre convite e participação somente quando realmente aconteceram, preservando a continuidade do vínculo.'

  if(loading)return <JourneyLoadState locale={locale} title={t.title} phase="loading" slow={loadingSlow} onRetry={()=>void bootstrap()}/>
  if(loadFailed)return <JourneyLoadState locale={locale} title={t.title} phase="error" onRetry={()=>void bootstrap()}/>
  if(!access?.canManageMesa)return <main className="journey-section-page"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} /></main>

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Mesa</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="journey-error" role="alert">{t.error} <button type="button" className="mesa-retry" onClick={()=>void bootstrap()}>{locale==='en'?'Try again':locale==='es'?'Intentar de nuevo':'Tentar novamente'}</button></div>:null}

    <JourneyAreaFocus
      locale={locale}
      title={focusTitle}
      body={focusBody}
      context={[activeUnit?.name,activeSession?.eventName||activeSession?.eventRef].filter(Boolean).join(' · ')||undefined}
      metrics={[
        {label:t.guests,value:invited,tone:invited>0?'attention':'muted'},
        {label:t.joined,value:joined,tone:joined>0?'good':'muted'},
        {label:t.preparation,value:preparationCount+'/4',tone:preparation?.status==='ready'?'good':'attention'},
      ]}
      actions={!activeSession
        ?[{label:access.canManagePresence?noSessionGuide.primary:(locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda'),href:access.canManagePresence?'/presence-assist':'/help',primary:true}]
        :activeSession.status==='open'&&preparation?.status!=='ready'
          ?[{label:locale==='en'?'Prepare now':locale==='es'?'Preparar ahora':'Preparar agora',href:'#mesa-preparation',primary:true},{label:locale==='en'?'Go to people':locale==='es'?'Ir a personas':'Ir para pessoas',href:'#mesa-people'}]
          :[{label:locale==='en'?'Record participation':locale==='es'?'Registrar participación':'Registrar participação',href:'#mesa-people',primary:true}]
      }
    />

    <section className="journey-area-toolbar">
      {congregations.length>1?<label><span>{t.unit}</span><select value={congregationId} disabled={busy} onChange={e=>void changeUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>:null}
      {sessions.length>1?<label className="grow"><span>{t.service}</span><select value={sessionId} disabled={busy||!sessions.length} onChange={e=>void changeSession(e.target.value)}><option value="">—</option>{sessions.map(x=><option key={x.id} value={x.id}>{x.eventName||x.eventRef}</option>)}</select></label>:null}
    </section>

    {sessionId&&sessions.find(x=>x.id===sessionId)?.status==='open'?<section className="journey-section-block mesa-preparation" id="mesa-preparation">
      <header><div><span className="journey-section-kicker">{t.preparation}</span><h2>{t.preparation}</h2><p className="journey-section-copy">{t.preparationHint}</p></div><span className={`journey-status ${preparation?.status==='ready'?'':'warn'}`}><ClipboardCheck size={13}/>{preparation?.status==='ready'?t.ready:t.preparing}</span></header>
      <div className="mesa-checklist">
        {([
          ['environment',t.environment],
          ['hosts',t.hosts],
          ['hospitality',t.hospitality],
          ['supplies',t.supplies],
        ] as Array<[MesaPreparationItemKey,string]>).map(([key,label])=>{
          const checked=preparation?.items[key]??false
          const owner=preparation?.owners[key]??''
          return <button key={key} disabled={busy} className={checked?'checked':''} onClick={()=>void togglePreparation(key,!checked)}>
            <span className="mesa-check"><Check size={15}/></span>
            <span><strong>{label}</strong><small>{owner?(owner===access.userId?t.you:t.otherOwner):t.preparing}</small></span>
          </button>
        })}
      </div>
    </section>:null}

    {!sessionId?<section className="journey-section-block"><GuidedEmptyState icon={UsersRound} title={noSessionGuide.title} body={noSessionGuide.body} primary={{label:access.canManagePresence?noSessionGuide.primary:(locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda'),href:access.canManagePresence?'/presence-assist':'/help'}} secondary={{label:noSessionGuide.secondary||t.title,href:'/my-today'}}/></section>:<section className="journey-section-block" id="mesa-people">
      <header><div><span className="journey-section-kicker">{t.people}</span><h2>{t.people}</h2></div><input className="journey-section-select" value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)}/></header>
      <div className="journey-list">
        {visible.map(person=>{
          const record=byPerson.get(person.id)
          return <div className="journey-list-row mesa-person-row" key={person.id}><div className="mesa-person-identity">
            {person.photoUrl?<img className="mesa-person-avatar" src={person.photoUrl} loading="lazy" alt="" referrerPolicy="no-referrer"/>:<span className="mesa-person-avatar mesa-person-initials" aria-hidden="true">{person.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')}</span>}
            <div><strong>{person.name}</strong><span>{record?.status==='joined'?t.participated:record?.status==='invited'?t.invited:record?.bondHostRef?t.relationship:'—'}</span></div>
          </div><div className="journey-inline-actions">
            <button className="journey-pill-button" disabled={busy||Boolean(record)} onClick={()=>void mark(person,'invited')}>{record?<><Check size={14}/>{record.status==='joined'?t.participated:t.invited}</>:t.invite}</button>
            <button className="journey-primary-button" disabled={busy||record?.status==='joined'} onClick={()=>void mark(person,'joined')}>{record?.status==='joined'?<><Check size={14}/>{t.participated}</>:t.markJoined}</button>
          </div></div>
        })}
        {!visible.length?query.trim()?<div className="journey-empty">{t.empty}</div>:<GuidedEmptyState icon={UsersRound} title={noPeopleGuide.title} body={noPeopleGuide.body} primary={{label:access.canManagePresence?noPeopleGuide.primary:(locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda'),href:access.canManagePresence?'/presence-assist':'/help'}} secondary={{label:noPeopleGuide.secondary||t.title,href:'/my-today'}} compact/>:null}
      </div>
    </section>}
    <div className="journey-section-note"><ShieldCheck size={18}/><p>{t.rule}</p></div>
  </div></main>
}
