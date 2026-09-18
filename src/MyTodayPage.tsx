import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, Clock3, HeartHandshake, House, Leaf, ShieldAlert, ShieldCheck, UserCheck, UserRound } from 'lucide-react'
import { auth } from './firebase'
import { buildMyTodayItems, type MyTodayKind } from './myToday'
import {
  getActiveJourneyOrganizationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroupsForAccess,
  listJourneyPeopleForAccess,
  listPastoralHandoffs,
  listPresenceSessions,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, myTodayCopy, persistLocale, type AppLocale } from './i18n'
import './MyTodayPage.css'

type Filter = 'all' | 'care' | 'presence' | 'groups' | 'discipleship' | 'pastoral'

function filterFor(kind: MyTodayKind): Exclude<Filter, 'all'> {
  if (kind.startsWith('care_')) return 'care'
  if (kind === 'presence_open') return 'presence'
  if (kind === 'group_attention') return 'groups'
  if (kind === 'pastoral_handoff') return 'pastoral'
  return 'discipleship'
}

export default function MyTodayPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = myTodayCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [care, setCare] = useState<CareRequestRecord[]>([])
  const [groups, setGroups] = useState<JourneyGroupRecord[]>([])
  const [discipleships, setDiscipleships] = useState<JourneyDiscipleshipRecord[]>([])
  const [sessions, setSessions] = useState<PresenceSessionRecord[]>([])
  const [pastoralHandoffs, setPastoralHandoffs] = useState<JourneyPastoralHandoff[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canOperate = Boolean(access && (access.canManageCare || access.canManagePresence || access.canManageGroups || access.canManageDiscipleship || access.canManagePastoral || access.broadJourneyAccess))
  const items = useMemo(() => access ? buildMyTodayItems({
    people, careRequests: care, groups, discipleships, sessions, pastoralHandoffs,
    actorId: access.userId, broadAccess: access.broadJourneyAccess,
  }) : [], [access, people, care, groups, discipleships, sessions, pastoralHandoffs])
  const visible = filter === 'all' ? items : items.filter((item) => filterFor(item.kind) === filter)
  const counts = useMemo(() => ({
    care: items.filter((item) => filterFor(item.kind) === 'care').length,
    presence: items.filter((item) => filterFor(item.kind) === 'presence').length,
    groups: items.filter((item) => filterFor(item.kind) === 'groups').length,
    discipleship: items.filter((item) => filterFor(item.kind) === 'discipleship').length,
    pastoral: items.filter((item) => filterFor(item.kind) === 'pastoral').length,
  }), [items])

  const refreshScope = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const [nextPeople, nextGroups, nextCare, nextSessions, nextDiscipleships, nextPastoral] = await Promise.all([
      listJourneyPeopleForAccess(nextAccess, unitId),
      listJourneyGroupsForAccess(nextAccess, unitId),
      nextAccess.canManageCare || nextAccess.broadJourneyAccess ? listCareRequests(nextAccess.organizationId, unitId) : Promise.resolve([]),
      nextAccess.canManagePresence ? listPresenceSessions(nextAccess.organizationId, unitId) : Promise.resolve([]),
      nextAccess.broadJourneyAccess || nextAccess.canManageDiscipleship ? listJourneyDiscipleships(nextAccess, unitId) : Promise.resolve([]),
      nextAccess.canManagePastoral ? listPastoralHandoffs(nextAccess.organizationId, unitId) : Promise.resolve([]),
    ])
    setPeople(nextPeople); setGroups(nextGroups); setCare(nextCare); setSessions(nextSessions); setDiscipleships(nextDiscipleships); setPastoralHandoffs(nextPastoral)
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      const hasOperation = nextAccess.canManageCare || nextAccess.canManagePresence || nextAccess.canManageGroups || nextAccess.canManageDiscipleship || nextAccess.canManagePastoral || nextAccess.broadJourneyAccess
      if (!hasOperation) return
      const nextCongregations = await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId = nextCongregations[0]?.id ?? ''
      setCongregationId(unitId)
      if (unitId) await refreshScope(nextAccess, unitId)
    } catch (cause) { console.error('My Today bootstrap failed', cause); setError(t.error) }
    finally { setLoading(false) }
  }, [refreshScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  async function selectCongregation(unitId: string) {
    if (!access) return
    setCongregationId(unitId); setBusy(true); setError('')
    try { await refreshScope(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  if (loading) return <main className="today-page"><div className="today-loading">{t.loading}</div></main>
  if (!canOperate) return <main className="today-page"><section className="today-panel today-no-access"><ShieldCheck size={34} /><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="today-button" onClick={() => void bootstrap()}>{t.retry}</button></section></main>

  const meta = (kind: MyTodayKind) => {
    if (kind === 'care_debt') return { Icon: AlertTriangle, label: t.debt, tone: 'danger' }
    if (kind === 'care_due_soon') return { Icon: Clock3, label: t.dueSoon, tone: 'warning' }
    if (kind === 'care_unassigned') return { Icon: HeartHandshake, label: t.unassigned, tone: 'warning' }
    if (kind === 'presence_open') return { Icon: UserCheck, label: t.openPresence, tone: 'info' }
    if (kind === 'group_attention') return { Icon: House, label: t.groupAttention, tone: 'info' }
    if (kind === 'pastoral_handoff') return { Icon: ShieldAlert, label: t.pastoralHandoff, tone: 'warning' }
    return { Icon: Leaf, label: t.discipleshipNext, tone: 'neutral' }
  }

  return <main className="today-page"><div className="today-shell">
    <header className="today-topbar">
      <div className="today-brand"><img src="/icon.svg" alt="" /><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="today-actions"><a href="/"><ChevronLeft size={16} /> {t.back}</a><a href="/journey-profile"><UserRound size={16} /> {t.profile}</a><select value={locale} aria-label="Language" onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map((id) => <option value={id} key={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="today-hero"><div><span className="today-kicker">Journey / Lens</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error ? <div className="today-error" role="alert">{error}</div> : null}

    <section className="today-panel today-toolbar"><label><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label></section>

    <div className="today-filters">
      {([
        ['all', t.all, items.length],
        ['care', t.care, counts.care],
        ['presence', t.presence, counts.presence],
        ['groups', t.groups, counts.groups],
        ['discipleship', t.discipleship, counts.discipleship],
        ['pastoral', t.pastoral, counts.pastoral],
      ] as Array<[Filter,string,number]>).map(([id,label,count]) => <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)}>{label}<b>{count}</b></button>)}
    </div>

    <section className="today-list">
      {visible.map((item) => {
        const { Icon, label, tone } = meta(item.kind)
        const actionHref = item.kind.startsWith('care_')
          ? '/care-integrity'
          : item.kind === 'presence_open'
            ? '/presence-assist'
            : item.kind === 'group_attention'
              ? '/groups-runtime'
              : item.kind === 'pastoral_handoff'
                ? '/pastoral-handoff'
                : item.kind === 'discipleship_next'
                ? '/discipleship-runtime'
                : item.personId
                  ? `/journey-profile?person=${encodeURIComponent(item.personId)}`
                  : '/journey-profile'
        const detail = item.kind === 'care_debt' ? `${t.overdue}: ${item.dueAt ? new Date(item.dueAt).toLocaleString(locale) : '—'}`
          : item.kind === 'care_due_soon' || item.kind === 'care_unassigned' ? `${t.due}: ${item.dueAt ? new Date(item.dueAt).toLocaleString(locale) : '—'}`
          : item.kind === 'presence_open' ? t.goPresence
          : item.kind === 'group_attention' ? `${t.capacity}: ${Math.round((item.ratio ?? 0) * 100)}%`
          : item.kind === 'pastoral_handoff' ? t.pastoralMarker
          : `${t.meeting}: ${item.meeting ?? '—'} · ${item.titleRef}`
        return <article className="today-panel today-item" key={item.id}>
          <span className={`today-icon ${tone}`}><Icon size={18} /></span>
          <div className="today-item-body"><span className="today-item-kind">{label}</span><h2>{item.personName || item.titleRef}</h2><p>{detail}</p></div>
          <a className="today-button" href={actionHref}>{item.kind.startsWith('care_') ? t.goCare : item.kind === 'presence_open' ? t.goPresence : item.kind === 'group_attention' ? t.groups : item.kind === 'pastoral_handoff' ? t.goPastoral : item.kind === 'discipleship_next' ? t.discipleship : item.personId ? t.openPerson : t.profile}</a>
        </article>
      })}
      {!visible.length ? <div className="today-panel today-empty">{t.empty}</div> : null}
    </section>

    <p className="today-rule"><ShieldCheck size={15} /> {t.sourceRule}</p>
  </div></main>
}
