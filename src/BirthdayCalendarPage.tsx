import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import {
  CalendarDays,ChevronLeft,ChevronRight,Download,ExternalLink,Gift,Plus,
  Search,ShieldCheck,Trash2,Users,
} from 'lucide-react'
import {auth} from './firebase'
import {
  getActiveJourneyOrganizationId,getActiveJourneyCongregationId,
  listJourneyCongregations,listJourneyPeople,loadJourneyAccess,
  resolveActiveJourneyCongregationId,setActiveJourneyCongregationId,
  type JourneyAccessContext,type JourneyCongregation,type JourneyPersonRecord,
} from './journeyRepository'
import {
  canManageBirthdays,canSeeSharedBirthdays,listPersonBirthdays,
  removePersonBirthday,savePersonBirthday,type PersonBirthdayRecord,
} from './birthdayRepository'
import {
  downloadBirthdayIcs,googleBirthdayUrl,upcomingBirthdays,
  validBirthdayDate,
} from './birthdayCalendar'
import {getInitialLocale,localeLabels,persistLocale,type AppLocale} from './i18n'
import {AccessDeniedState} from './AccessDeniedState'
import {BirthdayCalendarSubscriptionPanel} from './BirthdayCalendarSubscriptionPanel'
import './BirthdayCalendarPage.css'

const words={
  'pt-BR':{
    title:'Datas que aproximam',subtitle:'Celebre pessoas, preserve a privacidade e nunca deixe um aniversário passar despercebido.',
    eyebrow:'Pessoas / Celebrações',today:'Hoje',week:'Próximos 7 dias',known:'Aniversários cadastrados',
    search:'Buscar pessoa',unit:'Congregação',month:'Mês',upcoming:'Próximos aniversários',empty:'Ainda não existem aniversários visíveis nesta congregação.',
    noMatch:'Nenhuma pessoa encontrada',add:'Cadastrar aniversário',edit:'Editar aniversário',save:'Salvar aniversário',
    permission:'Confirmo que a pessoa, ou seu responsável legal, autorizou registrar esta data para lembranças de aniversário.',
    share:'A pessoa também autorizou mostrar seu aniversário à equipe de acolhimento.',
    day:'Dia',monthLabel:'Mês',person:'Pessoa',cancel:'Cancelar',remove:'Remover data',import:'Adicionar à agenda',
    google:'Google Agenda',ics:'Apple / Outlook / arquivo .ics',notice:'Uma agenda exportada fica sob seu controle. Alterações ou remoções no NestJourney não apagam eventos já importados.',
    private:'Somente gestão',shared:'Visível à equipe',missing:'Sem data cadastrada',loading:'Carregando aniversários…',
    success:'Aniversário salvo.',deleted:'Data removida.',error:'Não foi possível concluir. Confira a conexão e suas permissões.',
    privacy:'Datas armazenadas por organização. A divulgação à equipe exige autorização específica. Sem mensagens automáticas e sem venda de dados pessoais.',
    editHint:'Somente gestores autorizados podem cadastrar, alterar ou remover datas.',
    instruction:'Selecione uma pessoa e informe somente dia e mês. Não é necessário registrar o ano de nascimento.',
    loadingUnits:'Nenhuma congregação disponível.',
  },
  en:{
    title:'Dates that connect',subtitle:'Celebrate people, protect privacy, and remember every birthday.',
    eyebrow:'People / Celebrations',today:'Today',week:'Next 7 days',known:'Saved birthdays',
    search:'Search people',unit:'Campus',month:'Month',upcoming:'Upcoming birthdays',empty:'No birthdays are visible at this campus yet.',
    noMatch:'No people found',add:'Add birthday',edit:'Edit birthday',save:'Save birthday',
    permission:'I confirm this person, or their legal guardian, authorized recording this date for birthday reminders.',
    share:'The person also authorized sharing their birthday with the welcome team.',
    day:'Day',monthLabel:'Month',person:'Person',cancel:'Cancel',remove:'Remove date',import:'Add to calendar',
    google:'Google Calendar',ics:'Apple / Outlook / .ics file',notice:'Imported events remain in your personal calendar. Changes here cannot delete copies you exported.',
    private:'Management only',shared:'Visible to team',missing:'No date saved',loading:'Loading birthdays…',
    success:'Birthday saved.',deleted:'Birthday removed.',error:'Unable to finish. Check connection and permissions.',
    privacy:'Organization-scoped dates. Team visibility requires specific permission. No automatic messaging or personal-data sales.',
    editHint:'Only authorized managers can add, edit, or remove dates.',
    instruction:'Choose a person and enter only day and month. A birth year is not required.',
    loadingUnits:'No campus available.',
  },
  es:{
    title:'Fechas que acercan',subtitle:'Celebra a las personas, cuida la privacidad y recuerda cada cumpleaños.',
    eyebrow:'Personas / Celebraciones',today:'Hoy',week:'Próximos 7 días',known:'Cumpleaños registrados',
    search:'Buscar personas',unit:'Sede',month:'Mes',upcoming:'Próximos cumpleaños',empty:'Todavía no hay cumpleaños visibles en esta sede.',
    noMatch:'Ninguna persona encontrada',add:'Registrar cumpleaños',edit:'Editar cumpleaños',save:'Guardar cumpleaños',
    permission:'Confirmo que la persona, o su responsable legal, autorizó registrar esta fecha para recordatorios de cumpleaños.',
    share:'La persona también autorizó compartir su cumpleaños con el equipo de acogida.',
    day:'Día',monthLabel:'Mes',person:'Persona',cancel:'Cancelar',remove:'Eliminar fecha',import:'Añadir al calendario',
    google:'Google Calendar',ics:'Apple / Outlook / archivo .ics',notice:'Los eventos importados quedan en tu calendario personal. Los cambios aquí no eliminan copias exportadas.',
    private:'Solo gestión',shared:'Visible al equipo',missing:'Sin fecha',loading:'Cargando cumpleaños…',
    success:'Cumpleaños guardado.',deleted:'Fecha eliminada.',error:'No se pudo completar. Revisa conexión y permisos.',
    privacy:'Fechas aisladas por organización. Compartir requiere autorización específica. Sin mensajes automáticos ni venta de datos.',
    editHint:'Solo los gestores autorizados pueden crear, editar o eliminar fechas.',
    instruction:'Elige una persona e introduce únicamente día y mes. No es necesario el año.',
    loadingUnits:'No hay sedes disponibles.',
  }
}
const weekNames:Record<AppLocale,string[]>={
  'pt-BR':['S','T','Q','Q','S','S','D'],en:['M','T','W','T','F','S','S'],es:['L','M','M','J','V','S','D']
}
function monthGrid(year:number,month:number){
  const count=new Date(year,month+1,0).getDate()
  const offset=(new Date(year,month,1).getDay()+6)%7
  return Array.from({length:Math.ceil((offset+count)/7)*7},(_,index)=>{
    const day=index-offset+1
    return day>0&&day<=count?day:0
  })
}
export default function BirthdayCalendarPage(){
  const requestedPerson=useRef(new URLSearchParams(window.location.search).get('person')||'')
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=words[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [records,setRecords]=useState<PersonBirthdayRecord[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [filter,setFilter]=useState('')
  const [cursor,setCursor]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const [editing,setEditing]=useState(false)
  const [personId,setPersonId]=useState('')
  const [day,setDay]=useState(1)
  const [month,setMonth]=useState(1)
  const [shareWithTeam,setShareWithTeam]=useState(false)
  const [permissionConfirmed,setPermissionConfirmed]=useState(false)
  const currentScopeRef=useRef('')
  const loadGenerationRef=useRef(0)
  const canRead=Boolean(access&&canSeeSharedBirthdays(access))
  const canEdit=Boolean(access&&canManageBirthdays(access))
  const loadUnit=useCallback(async (ctx:JourneyAccessContext,id:string)=>{
    // A slower response for a prior congregation must never replace this scope's PII.
    const generation=++loadGenerationRef.current
    currentScopeRef.current=ctx.organizationId+':'+id
    const [p,b]=await Promise.all([
      listJourneyPeople(ctx.organizationId,id),
      listPersonBirthdays(ctx,id),
    ])
    if(generation!==loadGenerationRef.current||
       currentScopeRef.current!==ctx.organizationId+':'+id)return
    setPeople(p);setRecords(b)
  },[])
  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,org=getActiveJourneyOrganizationId()
      if(!user||!org)throw new Error('missing_context')
      const context=await loadJourneyAccess(user.uid,org)
      setAccess(context)
      if(!canSeeSharedBirthdays(context))return
      const available=await listJourneyCongregations(context)
      setUnits(available)
      const id=resolveActiveJourneyCongregationId(org,available)
      setUnitId(id)
      if(id)await loadUnit(context,id)
    }catch{setError(words[locale].error)}
    finally{setLoading(false)}
  },[loadUnit,locale])
  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>{
    const onScope=()=>{const current=access&&getActiveJourneyCongregationId(access.organizationId);if(current&&currentScopeRef.current!==access!.organizationId+':'+current&&units.some(u=>u.id===current)){
      setUnitId(current);setPeople([]);setRecords([]);setEditing(false);setPersonId('')
      void loadUnit(access!,current).catch(()=>setError(words[locale].error))
    }}
    window.addEventListener('nestjourney:unit',onScope)
    return()=>window.removeEventListener('nestjourney:unit',onScope)
  },[access,unitId,units,loadUnit])
  const merged=useMemo(()=>records.map(record=>{
    const person=people.find(p=>p.id===record.personId)
    return person?{...record,name:person.preferredName||person.name,phone:person.phone||'',consent:person.consent===true}:null
  }).filter((x):x is NonNullable<typeof x>=>Boolean(x)),[records,people])
  const upcoming=useMemo(()=>upcomingBirthdays(merged),[merged])
  const thisMonth=useMemo(()=>merged.filter(p=>p.month===cursor.getMonth()+1&&p.name.toLocaleLowerCase(locale).includes(filter.trim().toLocaleLowerCase(locale))),[merged,cursor,filter,locale])
  const searched=useMemo(()=>upcoming.filter(p=>p.name.toLocaleLowerCase(locale).includes(filter.trim().toLocaleLowerCase(locale))),[upcoming,filter,locale])
  const days=useMemo(()=>monthGrid(cursor.getFullYear(),cursor.getMonth()),[cursor])
  const picker=people.find(p=>p.id===personId)
  const already=records.find(r=>r.personId===personId)
  const selectedName=picker?.preferredName||picker?.name||''
  function openEditor(id=''){
    const chosenId=id||people.find(p=>!records.some(r=>r.personId===p.id))?.id||''
    const current=records.find(r=>r.personId===chosenId)
    setPersonId(chosenId)
    setDay(current?.day||1);setMonth(current?.month||1)
    setShareWithTeam(current?.shareWithTeam??false)
    setPermissionConfirmed(false);setError('');setMessage('');setEditing(true)
  }
  function choosePerson(id:string){
    setPersonId(id)
    const current=records.find(r=>r.personId===id)
    setDay(current?.day||1);setMonth(current?.month||1)
    setShareWithTeam(current?.shareWithTeam??false)
    setPermissionConfirmed(false)
  }
  useEffect(()=>{
    if(!loading&&canEdit&&requestedPerson.current&&people.some(p=>p.id===requestedPerson.current)){
      const id=requestedPerson.current
      requestedPerson.current=''
      openEditor(id)
    }
  },[loading,canEdit,people])
  async function save(e:FormEvent){
    e.preventDefault()
    if(!access||!picker)return
    setBusy(true);setError('')
    try{
      await savePersonBirthday({access,person:picker,day,month,shareWithTeam,permissionConfirmed})
      await loadUnit(access,unitId)
      setEditing(false);setMessage(t.success)
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  async function remove(){
    if(!access||!picker||!window.confirm(t.remove+'?'))return
    setBusy(true);setError('')
    try{
      await removePersonBirthday({access,person:picker})
      await loadUnit(access,unitId)
      setEditing(false);setMessage(t.deleted)
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  async function changeUnit(id:string){
    if(!access)return
    // Prevent the synchronous global scope event from starting a duplicate request.
    currentScopeRef.current=access.organizationId+':'+id
    ++loadGenerationRef.current
    setUnitId(id);setPeople([]);setRecords([]);setEditing(false);setPersonId('')
    setActiveJourneyCongregationId(access.organizationId,id)
    setBusy(true);setError('')
    try{await loadUnit(access,id)}catch{setError(t.error)}finally{setBusy(false)}
  }
  const monthTitle=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(cursor)
  const initials=(s:string)=>s.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')
  if(loading)return <main className="birthdays-page"><p className="bd-loading">{t.loading}</p></main>
  if(!canRead)return <main className="birthdays-page"><AccessDeniedState locale={locale} title={t.title} body={t.editHint} retryLabel={t.loading} onRetry={()=>void bootstrap()}/></main>
  return <main className="birthdays-page">
    <div className="bd-container">
      <header className="bd-head">
        <div><span className="bd-eyebrow"><Gift size={15}/>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
        <div className="bd-head-actions">
          <select aria-label="Language" value={locale} onChange={e=>{const id=e.target.value as AppLocale;setLocale(id);persistLocale(id)}}>
            {(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}
          </select>
          {canEdit&&people.some(p=>!records.some(r=>r.personId===p.id))?<button className="bd-primary" onClick={()=>openEditor()}><Plus size={16}/>{t.add}</button>:null}
        </div>
      </header>
      {message?<p role="status" className="bd-confirmation">{message}</p>:null}
      {error?<p role="alert" className="bd-error">{error}</p>:null}
      <section className="bd-pulse" aria-label={t.week}>
        <article className="bd-pulse-feature"><span>{t.today}</span><strong>{upcoming.filter(x=>x.daysUntil===0).length}</strong><small>{upcoming.find(x=>x.daysUntil===0)?.name||t.empty}</small></article>
        <article><span>{t.week}</span><strong>{upcoming.filter(x=>x.daysUntil<=7).length}</strong><small>{upcoming.find(x=>x.daysUntil>0&&x.daysUntil<=7)?.name||'—'}</small></article>
        <article><span>{t.known}</span><strong>{records.length}</strong><small>{units.find(u=>u.id===unitId)?.name||'—'}</small></article>
      </section>
      {canEdit&&access&&unitId?<BirthdayCalendarSubscriptionPanel key={access.organizationId+':'+unitId} access={access} congregationId={unitId} locale={locale}/>:null}
      <div className="bd-toolbar">
        {units.length>1?<label><span>{t.unit}</span><select value={unitId} disabled={busy} onChange={e=>void changeUnit(e.target.value)}>{units.map(unit=><option value={unit.id} key={unit.id}>{unit.name}</option>)}</select></label>:null}
        <label className="bd-search"><span>{t.search}</span><div><Search size={16}/><input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder={t.search}/></div></label>
      </div>
      <div className="bd-body">
        <section className="bd-calendar" aria-label={monthTitle}>
          <div className="bd-calendar-head"><div><span className="bd-mini-label">{t.month}</span><h2>{monthTitle}</h2></div>
            <div className="bd-arrows"><button aria-label="Previous month" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}><ChevronLeft size={19}/></button><button aria-label="Next month" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}><ChevronRight size={19}/></button></div>
          </div>
          <div className="bd-grid">
            {weekNames[locale].map((name,i)=><div className="bd-weekday" key={i}>{name}</div>)}
            {days.map((number,i)=>{
              const events=thisMonth.filter(p=>p.day===number||(p.month===2&&p.day===29&&new Date(cursor.getFullYear(),2,0).getDate()===28&&number===28))
              const today=new Date(),isToday=number===today.getDate()&&cursor.getMonth()===today.getMonth()&&cursor.getFullYear()===today.getFullYear()
              return <div key={i} className={'bd-day '+(!number?'inactive ':'')+(isToday?'today ':'')+(events.length?'has-event':'')}>
                {number?<><span>{number}</span><div className="bd-day-names">{events.slice(0,2).map(e=><button type="button" key={e.personId} title={e.name} onClick={()=>canEdit&&openEditor(e.personId)}>{e.name.split(' ')[0]}</button>)}{events.length>2?<small>+{events.length-2}</small>:null}</div></>:null}
              </div>
            })}
          </div>
        </section>
        <aside className="bd-upcoming">
          <div className="bd-upcoming-title"><div className="bd-mini-label"><CalendarDays size={16}/>{t.upcoming}</div><span>{searched.length}</span></div>
          <div className="bd-upcoming-list">{searched.length===0?<p className="bd-empty">{filter?t.noMatch:t.empty}</p>:searched.slice(0,60).map(person=><article className="bd-person" key={person.personId}>
            <span className="bd-avatar">{initials(person.name)}</span>
            <div className="bd-person-detail"><strong>{person.name}</strong><small>{new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',timeZone:'UTC'}).format(person.nextDate)} · {person.daysUntil===0?t.today:person.daysUntil===1?'1 dia':person.daysUntil+' dias'}</small><span className="bd-visibility"><ShieldCheck size={12}/>{person.shareWithTeam?t.shared:t.private}</span></div>
            <div className="bd-person-actions">
              <button type="button" title={t.ics} aria-label={t.ics+' — '+person.name} onClick={()=>downloadBirthdayIcs(person)}><Download size={17}/></button>
              <a href={googleBirthdayUrl(person)} target="_blank" rel="noopener noreferrer" aria-label={t.google+' — '+person.name} title={t.google}><ExternalLink size={16}/></a>
              {canEdit?<button type="button" onClick={()=>openEditor(person.personId)} aria-label={t.edit+' — '+person.name}><ChevronRight size={18}/></button>:null}
            </div>
          </article>)}</div>
        </aside>
      </div>
      <footer className="bd-footer"><ShieldCheck size={17}/><p>{t.privacy} {t.notice}</p></footer>
    </div>
    {editing&&canEdit?<div className="bd-modal-wrap" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setEditing(false)}}>
      <section className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="bd-modal-title">
        <div className="bd-modal-top"><span><Users size={17}/>{t.edit}</span><button type="button" onClick={()=>setEditing(false)} disabled={busy} aria-label={t.cancel}>×</button></div>
        <h2 id="bd-modal-title">{already?t.edit:t.add}</h2>
        <p>{t.instruction}</p>
        <form onSubmit={e=>void save(e)}>
          <label>{t.person}<select required value={personId} disabled={busy} onChange={e=>choosePerson(e.target.value)}>{people.map(p=><option value={p.id} key={p.id}>{p.preferredName||p.name}</option>)}</select></label>
          <div className="bd-date-fields"><label>{t.day}<input type="number" required min={1} max={31} value={day} onChange={e=>setDay(Number(e.target.value))}/></label><label>{t.monthLabel}<select value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>{new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(2026,i,1))}</option>)}</select></label></div>
          <label className="bd-consent"><input type="checkbox" required checked={permissionConfirmed} onChange={e=>setPermissionConfirmed(e.target.checked)}/><span>{t.permission}</span></label>
          <label className="bd-consent"><input type="checkbox" checked={shareWithTeam} onChange={e=>setShareWithTeam(e.target.checked)}/><span>{t.share}</span></label>
          <p className="bd-modal-note">{selectedName} · {shareWithTeam?t.shared:t.private}</p>
          {error?<p role="alert" className="bd-error">{error}</p>:null}
          <div className="bd-modal-actions">{already?<button type="button" disabled={busy} onClick={()=>void remove()} className="bd-remove"><Trash2 size={15}/>{t.remove}</button>:null}<button type="button" onClick={()=>setEditing(false)} disabled={busy}>{t.cancel}</button><button type="submit" className="bd-primary" disabled={busy||!permissionConfirmed||!validBirthdayDate(month,day)||!personId}>{busy?'…':t.save}</button></div>
        </form>
      </section>
    </div>:null}
  </main>
}
