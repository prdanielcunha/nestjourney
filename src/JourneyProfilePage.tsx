import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Clock3, HeartHandshake, House, Leaf, Search, ShieldCheck, UserRound } from 'lucide-react'
import { auth } from './firebase'
import { buildJourneyProfileSnapshot } from './journeyProfile'
import {
  canManageJourneyGroupRoster,
  getActiveJourneyOrganizationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroupMemberships,
  listJourneyGroupsForAccess,
  listJourneyPeopleForAccess,
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

  const canView = Boolean(access && (access.broadJourneyAccess || access.canManagePeople || access.canManageCare || access.canManageGroups || access.canManageDiscipleship))
  const canReadDiscipleship = Boolean(access && (access.broadJourneyAccess || access.canManageDiscipleship))
  const selected = people.find((person) => person.id === selectedId) ?? people[0]
  const snapshot = useMemo(() => selected ? buildJourneyProfileSnapshot({ person: selected, careRequests: care, groups, memberships, discipleships }) : null, [selected, care, groups, memberships, discipleships])
  const visiblePeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale)
    return needle ? people.filter((person) => person.name.toLocaleLowerCase(locale).includes(needle)) : people
  }, [people, query, locale])

  const refreshScope = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const tasks: [Promise<JourneyPersonRecord[]>, Promise<JourneyGroupRecord[]>, Promise<CareRequestRecord[]>] = [
      listJourneyPeopleForAccess(nextAccess, unitId),
      listJourneyGroupsForAccess(nextAccess, unitId),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess
        ? listCareRequests(nextAccess.organizationId, unitId)
        : Promise.resolve([]),
    ]
    const [nextPeople, nextGroups, nextCare] = await Promise.all(tasks)
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
      const hasLens = nextAccess.broadJourneyAccess || nextAccess.canManagePeople || nextAccess.canManageCare || nextAccess.canManageGroups || nextAccess.canManageDiscipleship
      if (!hasLens) return
      const nextCongregations = await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId = nextCongregations[0]?.id ?? ''
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
    setBusy(true)
    setError('')
    try { await refreshScope(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  if (loading) return <main className="journey-profile"><div className="journey-loading">{t.loading}</div></main>
  if (!canView) return <main className="journey-profile"><section className="journey-panel journey-no-access"><ShieldCheck size={34} /><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="journey-button" onClick={() => void bootstrap()}>{t.retry}</button></section></main>

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
      <div className="journey-shortcuts"><a className="journey-button" href="/presence-assist"><UserRound size={16} /> {t.openPresence}</a><a className="journey-button primary" href="/care-integrity"><HeartHandshake size={16} /> {t.openCarePage}</a></div>
    </section>

    {error ? <div className="journey-error" role="alert">{error}</div> : null}

    <section className="journey-panel journey-toolbar">
      <label className="journey-field"><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>
      <label className="journey-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
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
        {!snapshot ? <div className="journey-panel journey-empty big">{t.selectPerson}</div> : <>
          <article className="journey-panel journey-person-card">
            <div className="journey-person-title"><span className="journey-avatar large">{initials(snapshot.person.name)}</span><div><span className="journey-kicker">{t.profile}</span><h2>{snapshot.person.name}</h2><p>{snapshot.person.stage || t.noStage}</p></div></div>
            <div className="journey-facts">
              <div><span>{t.firstVisit}</span><strong>{formatDate(snapshot.person.firstVisit, locale)}</strong></div>
              <div><span>{t.visits}</span><strong>{snapshot.person.visits ?? 0}</strong></div>
              <div><span>{t.contact}</span><strong>{snapshot.person.consent ? t.authorized : t.notAuthorized}</strong></div>
              <div><span>{t.source}</span><strong>{t.peopleSource}</strong></div>
            </div>
          </article>

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
