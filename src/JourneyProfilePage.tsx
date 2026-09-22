import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Clock3, HeartHandshake, House, Leaf, Search, ShieldCheck, UserRound } from 'lucide-react'
import { auth } from './firebase'
import { buildJourneyProfileSnapshot } from './journeyProfile'
import {
  canManageJourneyGroupRoster,
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroupMemberships,
  listJourneyGroups,
  listJourneyPeople,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupMembership,
  type JourneyGroupRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import { getInitialLocale, journeyProfileCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import { canViewJourneyPeople } from './journeyExperience'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyPath, inferJourneyStep } from './JourneyPath'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './JourneyProfilePage.css'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(value: string | undefined, locale: AppLocale) {
  if (!value) return '—'
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(locale)
}

export default function JourneyProfilePage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = journeyProfileCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [care, setCare] = useState<CareRequestRecord[]>([])
  const [groups, setGroups] = useState<JourneyGroupRecord[]>([])
  const [memberships, setMemberships] = useState<JourneyGroupMembership[]>([])
  const [discipleships, setDiscipleships] = useState<JourneyDiscipleshipRecord[]>([])
  const requestedPersonId = useMemo(() => new URLSearchParams(window.location.search).get('person') ?? '', [])
  const [selectedId, setSelectedId] = useState(requestedPersonId)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canView = Boolean(access && canViewJourneyPeople(access))
  const canReadDiscipleship = Boolean(access && (access.broadJourneyAccess || access.canManageDiscipleship))
  const selected = people.find((person) => person.id === selectedId) ?? people[0]
  const snapshot = useMemo(() => selected ? buildJourneyProfileSnapshot({ person: selected, careRequests: care, groups, memberships, discipleships }) : null, [selected, care, groups, memberships, discipleships])
  const visiblePeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale)
    return needle ? people.filter((person) => person.name.toLocaleLowerCase(locale).includes(needle)) : people
  }, [people, query, locale])

  const refreshScope = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const tasks: [Promise<JourneyPersonRecord[]>, Promise<JourneyGroupRecord[]>, Promise<CareRequestRecord[]>] = [
      listJourneyPeople(nextAccess.organizationId, unitId),
      nextAccess.canManageGroups || nextAccess.broadJourneyAccess
        ? listJourneyGroups(nextAccess.organizationId, unitId)
        : Promise.resolve([]),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess
        ? listCareRequests(nextAccess.organizationId, unitId)
        : Promise.resolve([]),
    ]
    const [nextPeople, allGroups, nextCare] = await Promise.all(tasks)
    const nextGroups = nextAccess.role === 'group_leader' && !nextAccess.broadJourneyAccess
      ? allGroups.filter(group => group.leaderId === nextAccess.userId || group.createdBy === nextAccess.userId)
      : allGroups
    const [nextDiscipleships, membershipSets] = await Promise.all([
      nextAccess.broadJourneyAccess || nextAccess.canManageDiscipleship
        ? listJourneyDiscipleships(nextAccess, unitId)
        : Promise.resolve([]),
      Promise.all(
        nextGroups
          .filter((group) => canManageJourneyGroupRoster(nextAccess, group))
          .map((group) => listJourneyGroupMemberships(nextAccess, group)),
      ),
    ])
    setPeople(nextPeople)
    setGroups(nextGroups)
    setCare(nextCare)
    setMemberships(membershipSets.flat())
    setDiscipleships(nextDiscipleships)
    setSelectedId((current) => nextPeople.some((person) => person.id === current) ? current : nextPeople.some((person) => person.id === requestedPersonId) ? requestedPersonId : nextPeople[0]?.id ?? '')
  }, [requestedPersonId])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!canViewJourneyPeople(nextAccess)) return
      const nextCongregations = await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, nextCongregations)
      setCongregationId(unitId)
      if (unitId) await refreshScope(nextAccess, unitId)
    } catch (cause) {
      console.error('Journey Profile bootstrap failed', cause)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [refreshScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  async function selectCongregation(unitId: string) {
    if (!access) return
    setCongregationId(unitId)
    setActiveJourneyCongregationId(access.organizationId,unitId)
    setBusy(true)
    setError('')
    try { await refreshScope(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  const empty = emptyGuidance(locale,'people_none')
  const shortcuts = [
    access?.canManagePresence ? {href:'/presence-assist',label:t.openPresence,Icon:UserRound} : null,
    access?.canManageCare ? {href:'/care-integrity',label:t.openCarePage,Icon:HeartHandshake} : null,
  ].filter(Boolean) as Array<{href:string;label:string;Icon:typeof UserRound}>

  const profileFocus=snapshot?(()=>{
    if(snapshot.care.debt>0)return{
      title:locale==='en'?snapshot.care.debt+' overdue care promise(s)':locale==='es'?snapshot.care.debt+' promesa(s) de cuidado vencida(s)':snapshot.care.debt+' promessa(s) de cuidado vencida(s)',
      body:locale==='en'?'This is the clearest next operational step for this person. Open Care and resolve the overdue promise before adding anything new.':locale==='es'?'Este es el próximo paso operativo más claro para esta persona. Abre Cuidado y resuelve la promesa vencida antes de agregar algo nuevo.':'Este é o próximo passo operacional mais claro desta pessoa. Abra Cuidado e resolva a promessa vencida antes de acrescentar algo novo.',
      href:'/care-integrity',
    }
    if(snapshot.care.open>0)return{
      title:locale==='en'?'Care is already in progress':locale==='es'?'El cuidado ya está en curso':'O cuidado já está em andamento',
      body:locale==='en'?'Keep continuity from the existing care promise instead of creating a parallel path.':locale==='es'?'Mantén la continuidad desde la promesa de cuidado existente, sin crear un camino paralelo.':'Mantenha a continuidade a partir da promessa de cuidado já existente, sem criar um caminho paralelo.',
      href:'/care-integrity',
    }
    if(canReadDiscipleship&&snapshot.discipleship&&snapshot.discipleship.status!=='completed')return{
      title:locale==='en'?'Root · meeting '+snapshot.discipleship.meeting+'/7':locale==='es'?'Raíz · encuentro '+snapshot.discipleship.meeting+'/7':'Raiz · encontro '+snapshot.discipleship.meeting+'/7',
      body:locale==='en'?'The active discipleship relationship is this person’s current recorded next step.':locale==='es'?'La relación activa de discipulado es el próximo paso registrado para esta persona.':'O acompanhamento ativo no discipulado é o próximo passo registrado desta pessoa.',
      href:'/discipleship-runtime',
    }
    if(snapshot.groups.length>0)return{
      title:locale==='en'?'Connected to '+snapshot.groups[0].name:locale==='es'?'Conectado a '+snapshot.groups[0].name:'Conectado à '+snapshot.groups[0].name,
      body:locale==='en'?'Community is the current recorded connection. Open the House only when you need to manage its real next step.':locale==='es'?'La comunidad es el vínculo registrado actual. Abre la Casa solo cuando necesites gestionar su próximo paso real.':'A comunidade é o vínculo registrado atual. Abra a Casa somente quando precisar cuidar do próximo passo real.',
      href:'/groups-runtime',
    }
    return{
      title:locale==='en'?'No next step recorded yet':locale==='es'?'Todavía no hay próximo paso registrado':'Ainda não há próximo passo registrado',
      body:locale==='en'?'This is not a failure state. Use the journey only when a real relationship creates a next step.':locale==='es'?'Esto no es una falla. Usa la jornada solo cuando una relación real genere un próximo paso.':'Isso não é uma falha. Use a jornada somente quando um vínculo real gerar um próximo passo.',
      href:access?.canManageCare?'/care-integrity':'/areas',
    }
  })():null

  if (loading) return <main className="journey-profile"><div className="journey-loading">{t.loading}</div></main>
  if (!canView) return <main className="journey-profile"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>

  return <main className="journey-profile"><div className="journey-shell">
    <header className="journey-topbar">
      <div className="journey-brand"><img src="/icon.svg" alt="" /><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="journey-actions">
        <a href="/"><ChevronLeft size={16} /> {t.back}</a>
        <select value={locale} aria-label="Language" onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map((id) => <option value={id} key={id}>{localeLabels[id]}</option>)}</select>
      </div>
    </header>

    <section className="journey-hero">
      <div><span className="journey-kicker">Journey / Profile</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <div className="journey-shortcuts">{shortcuts.map((item,index)=>{const Icon=item.Icon;return <a className={'journey-button '+(index===shortcuts.length-1?'primary':'')} href={item.href} key={item.href}><Icon size={16}/>{item.label}</a>})}</div>
    </section>

    {error ? <div className="journey-error" role="alert">{error}</div> : null}

    <section className="journey-area-toolbar">
      {congregations.length>1?<label><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>:null}
      <label className="grow journey-search-compact"><span>{t.people}</span><span className="journey-search-inline"><Search size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={t.search}/></span></label>
    </section>

    <section className="journey-layout">
      <aside className="journey-panel journey-people">
        <div className="journey-section-head"><span>{t.people}</span><b>{visiblePeople.length}</b></div>
        <div className="journey-people-list">
          {visiblePeople.map((person) => <button className={selected?.id === person.id ? 'active' : ''} key={person.id} onClick={() => setSelectedId(person.id)}><span className="journey-avatar">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.visits ?? 0} · {formatDate(person.firstVisit, locale)}</small></span></button>)}
          {!visiblePeople.length ? <p className="journey-empty">{t.noPeople}</p> : null}
        </div>
      </aside>

      <section className="journey-profile-main">
        {!snapshot ? <div className="journey-panel journey-empty big">{!people.length?<GuidedEmptyState icon={UserRound} title={empty.title} body={empty.body} primary={{label:empty.primary,href:access?.canManagePresence?'/presence-assist':'/areas'}} secondary={{label:empty.secondary||t.back,href:'/areas'}}/>:t.selectPerson}</div> : <>
          {profileFocus?<JourneyAreaFocus
            locale={locale}
            context={snapshot.person.name}
            title={profileFocus.title}
            body={profileFocus.body}
            metrics={[
              {label:t.firstVisit,value:formatDate(snapshot.person.firstVisit,locale),tone:'muted'},
              {label:t.visits,value:snapshot.person.visits??0,tone:(snapshot.person.visits??0)>0?'good':'muted'},
              {label:t.contact,value:snapshot.person.consent?t.authorized:t.notAuthorized,tone:snapshot.person.consent?'good':'muted'},
            ]}
            actions={[{label:locale==='en'?'Open next step':locale==='es'?'Abrir próximo paso':'Abrir próximo passo',href:profileFocus.href,primary:true}]}
          />:null}

          <JourneyPath
            locale={locale}
            currentStep={inferJourneyStep({
              stage:snapshot.person.stage,
              hasGroup:snapshot.groups.length>0,
              hasDiscipleship:Boolean(snapshot.discipleship),
            })}
          />

          <div className="journey-card-grid">
            <article className="journey-panel journey-domain-card">
              <div className="journey-card-title"><span className="journey-icon"><Clock3 size={17} /></span><div><h3>{t.care}</h3><small>{t.careSource}</small></div></div>
              <div className="journey-stats"><span><strong>{snapshot.care.open}</strong>{t.openCare}</span><span className={snapshot.care.debt ? 'attention' : ''}><strong>{snapshot.care.debt}</strong>{t.careDebt}</span><span><strong>{snapshot.care.resolved}</strong>{t.resolvedCare}</span></div>
              <div className="journey-note"><b>{t.nextPromise}</b><span>{snapshot.care.nextDueAt ? new Date(snapshot.care.nextDueAt).toLocaleString(locale) : t.noOpenCare}</span></div>
            </article>

            <article className="journey-panel journey-domain-card">
              <div className="journey-card-title"><span className="journey-icon"><House size={17} /></span><div><h3>{t.groups}</h3><small>{t.groupSourceLabel}</small></div></div>
              {snapshot.groups.length ? <div className="journey-group-links">{snapshot.groups.map((group) => <div key={group.id}><h4>{group.name}</h4><p>{[group.neighborhood, group.weekday, group.time].filter(Boolean).join(' · ') || '—'}</p><div className="journey-mini-facts"><span>{t.participants}: <b>{group.participants ?? '—'}</b></span><span>{t.capacity}: <b>{group.capacity ?? '—'}</b></span></div></div>)}</div> : <><p className="journey-muted">{t.noGroup}</p><small className="journey-rule-inline">{t.groupSource}</small></>}
            </article>

            <article className="journey-panel journey-domain-card wide">
              <div className="journey-card-title"><span className="journey-icon"><Leaf size={17} /></span><div><h3>{t.discipleship}</h3><small>{t.discipleshipSource}</small></div></div>
              {!canReadDiscipleship ? <p className="journey-muted">{t.restrictedDiscipleship}</p> : snapshot.discipleship ? <div className="journey-discipleship"><div><span>{t.status}</span><strong>{snapshot.discipleship.status === 'completed' ? t.completed : snapshot.discipleship.status === 'paused' ? t.paused : t.active}</strong></div><div><span>{t.meeting}</span><strong>{snapshot.discipleship.meeting}/7</strong></div><div><span>{t.discipler}</span><strong>{snapshot.discipleship.disciplerName || snapshot.discipleship.disciplerId}</strong></div></div> : <p className="journey-muted">{t.noDiscipleship}</p>}
            </article>
          </div>
        </>}
      </section>
    </section>

    <p className="journey-source-rule"><ShieldCheck size={15} /> {t.sourceRule}</p>
  </div></main>
}
