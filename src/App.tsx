import { useState } from 'react'
import {
  AlertTriangle, Bell, Check, CheckCircle2, ChevronDown, ChevronRight, Copy,
  ClipboardCheck, Clock3, FileClock, HeartHandshake, House, LayoutDashboard,
  Leaf, LockKeyhole, Menu, MessageCircle, Pencil, Phone, Plus,
  RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Trash2, UserCheck,
  UserCog, Users, X,
} from 'lucide-react'
import './App.css'
import {
  discipleshipMeetings, implementationWeeks, seedAudit, seedCongregations,
  seedDiscipleships, seedGroupMeetings, seedGroups, seedJoinRequests, seedLabels,
  seedOrganization, seedPeople, seedPresence, seedRetention, seedTeam,
} from './seed'
import type {
  AppLabels, AuditEvent, Congregation, Discipleship as DiscipleshipType,
  GroupMeeting, JoinRequest, Organization, Person, PersonStage, PresenceRecord,
  RetentionRequest, Role, SmallGroup, TeamMember,
} from './types'
import { usePersistentState } from './usePersistentState'

type View = 'home' | 'implementation' | 'presence' | 'people' | 'care' | 'groups' | 'discipleship' | 'pastoral' | 'settings'
type SettingsTab = 'identity' | 'team' | 'privacy' | 'audit'
type Tone = 'neutral' | 'gold' | 'green' | 'amber' | 'blue' | 'purple' | 'red'
type MessageIntent = 'current' | 'group' | 'discipleship' | 'absence'

const stageLabels: Record<PersonStage, string> = {
  new: 'Novo', contact_authorized: 'Contato autorizado', care_done: 'Cuidado realizado',
  group_connected: 'Conectado à Casa', discipleship_active: 'Raiz ativo', integrated: 'Integrado',
}
const roleLabels: Record<Role, string> = {
  owner: 'Proprietário', pastor: 'Pastor', coordinator: 'Coord. Presença',
  care: 'Cuidado', group_leader: 'Líder de Casa', discipler: 'Discipulador',
  data_admin: 'Admin. de dados',
}
const scripts = [
  ['Primeira visita', 'Foi uma alegria conhecer você. Esperamos que tenha se sentido bem entre nós. Se houver algo pelo qual possamos orar, estamos disponíveis.'],
  ['Segunda visita', 'Foi muito bom ver você novamente. Se quiser conhecer uma Casa de Paz ou conversar mais sobre a igreja, estou por aqui.'],
  ['Ausência', 'Sentimos sua falta e lembrei de você hoje. Não é cobrança; só queria saber se está tudo bem.'],
  ['Sem resposta', 'Só passando para desejar uma boa semana e deixar nosso carinho. Não precisa responder se estiver corrido.'],
]

function firstName(name: string) { return name.trim().split(' ')[0] }
function messageSuggestions(person: Person, intent: MessageIntent, groupLabel: string) {
  const name = firstName(person.name)
  if (intent === 'group') return [
    `Oi, ${name}! Foi muito bom conversar com você. Temos um ${groupLabel} com pessoas da sua região, em um ambiente simples de amizade, Bíblia e oração. Posso te explicar como funciona?`,
    `Olá, ${name}! Lembrei de você porque existe um ${groupLabel} que pode ser um bom próximo passo para criar vínculos. O convite é sem compromisso. Quer conhecer?`,
    `Oi, ${name}! Gostaríamos de convidar você para conhecer um ${groupLabel}. É um encontro acolhedor em casa, com conversa e oração. Se quiser, envio os detalhes.`,
  ]
  if (intent === 'discipleship') return [
    `Oi, ${name}! Queremos caminhar mais perto de você. O Raiz são sete conversas individuais sobre fé, Bíblia, oração e vida com Jesus. Gostaria de conhecer a proposta?`,
    `Olá, ${name}! Pensamos em convidar você para o Raiz: um caminho de sete encontros, no seu ritmo, com alguém ao seu lado. Posso te contar melhor?`,
    `Oi, ${name}! O próximo passo que queremos oferecer é o Raiz, um acompanhamento pessoal e simples para fortalecer sua caminhada com Cristo. Você gostaria de conversar sobre isso?`,
  ]
  if (intent === 'absence') return [
    `Oi, ${name}! Sentimos sua falta e lembramos de você com carinho. Não é cobrança; só queríamos saber se está tudo bem.`,
    `Olá, ${name}! Passando apenas para dizer que lembramos de você e esperamos que esteja bem. Conte conosco se precisar.`,
    `Oi, ${name}! Você veio ao nosso coração hoje. Como você está? Não precisa responder com pressa; estamos por aqui.`,
  ]
  if (person.visits > 1 || person.stage === 'care_done') return [
    `Oi, ${name}! Foi muito bom ver você novamente. Se quiser conhecer melhor a igreja ou conversar sobre um próximo passo, estou por aqui.`,
    `Olá, ${name}! Ficamos felizes com sua presença mais uma vez. Como foi sua experiência? Se precisar de algo, conte conosco.`,
    `Oi, ${name}! Que alegria receber você novamente. Existe algo pelo qual podemos orar ou alguma dúvida em que possamos ajudar?`,
  ]
  return [
    `Oi, ${name}! Foi uma alegria conhecer você. Esperamos que tenha se sentido bem entre nós. Se houver algo pelo qual possamos orar, estamos disponíveis.`,
    `Olá, ${name}! Ficamos muito felizes com sua visita. Passando para agradecer sua presença e dizer que você é muito bem-vindo entre nós.`,
    `Oi, ${name}! Que bom ter recebido você. Espero que tenha se sentido acolhido. Como foi sua experiência conosco?`,
  ]
}

function whatsappUrl(phone: string, message: string) {
  const number = phone.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function initials(name: string) { return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('') }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') }
function Progress({ value }: { value: number }) {
  return <div className="progress" aria-label={`${Math.round(value)}%`}><span style={{ width: `${Math.min(value, 100)}%` }} /></div>
}
function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><Leaf /><strong>{title}</strong><p>{text}</p></div>
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [mobileNav, setMobileNav] = useState(false)
  const [congregationId, setCongregationId] = useState('all')
  const [role, setRole] = usePersistentState<Role>('rem:demo-role', 'pastor')
  const [organization, setOrganization] = usePersistentState<Organization>('rem:organization', seedOrganization)
  const [congregations, setCongregations] = usePersistentState<Congregation[]>('rem:congregations', seedCongregations)
  const [labels, setLabels] = usePersistentState<AppLabels>('rem:labels', seedLabels)
  const [people, setPeople] = usePersistentState<Person[]>('rem:people', seedPeople)
  const [groups, setGroups] = usePersistentState<SmallGroup[]>('rem:groups', seedGroups)
  const [discipleships, setDiscipleships] = usePersistentState<DiscipleshipType[]>('rem:discipleships', seedDiscipleships)
  const [presence, setPresence] = usePersistentState<PresenceRecord[]>('rem:presence', seedPresence)
  const [groupMeetings, setGroupMeetings] = usePersistentState<GroupMeeting[]>('rem:group-meetings', seedGroupMeetings)
  const [joinRequests, setJoinRequests] = usePersistentState<JoinRequest[]>('rem:join-requests', seedJoinRequests)
  const [team, setTeam] = usePersistentState<TeamMember[]>('rem:team', seedTeam)
  const [audit, setAudit] = usePersistentState<AuditEvent[]>('rem:audit', seedAudit)
  const [retention, setRetention] = usePersistentState<RetentionRequest[]>('rem:retention', seedRetention)
  const [weekDone, setWeekDone] = usePersistentState<Record<number, number[]>>('rem:week-done', { 1: [0,1,2,3], 2: [0,1,2,3] })
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [messageDraft, setMessageDraft] = useState<{ person: Person; intent: MessageIntent } | null>(null)

  const isElevated = ['owner', 'pastor', 'data_admin'].includes(role)
  const roleCongregations = isElevated ? congregations.map((item) => item.id) : [congregationId === 'all' ? congregations[0]?.id : congregationId]
  const inScope = <T extends { congregationId: string }>(items: T[]) => items.filter((item) =>
    (congregationId === 'all' || item.congregationId === congregationId) &&
    (isElevated || roleCongregations.includes(item.congregationId))
  )
  const scopedPeople = inScope(people)
  const scopedGroups = inScope(groups)
  const scopedDiscipleships = inScope(discipleships)
  const scopedPresence = inScope(presence)
  const pendingCare = scopedPeople.filter((person) => person.consent && ['contact_authorized', 'care_done'].includes(person.stage))
  const notifications = [
    ...pendingCare.slice(0, 3).map((person) => ({ id: person.id, title: person.nextAction, detail: person.dueLabel, view: 'care' as View })),
    ...scopedGroups.filter((group) => group.participants / group.capacity >= .85).map((group) => ({ id: group.id, title: `${group.name} perto do limite`, detail: `${group.participants} de ${group.capacity} pessoas`, view: 'groups' as View })),
  ]

  const congregationName = (id: string) => congregations.find((item) => item.id === id)?.name ?? 'Unidade'
  const log = (action: string, target: string, sensitivity: AuditEvent['sensitivity'] = 'standard') =>
    setAudit((current) => [{ id: crypto.randomUUID(), actor: roleLabels[role], action, target, createdAt: new Date().toISOString(), sensitivity }, ...current])
  function go(next: View) { setView(next); setMobileNav(false); setShowNotifications(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function updatePerson(id: string, patch: Partial<Person>, action: string) {
    setPeople((current) => current.map((person) => person.id === id ? { ...person, ...patch } : person))
    setSelectedPerson((current) => current?.id === id ? { ...current, ...patch } : current)
    log(action, people.find((person) => person.id === id)?.name ?? 'Pessoa')
  }

  const nav = [
    ['home', 'Início', LayoutDashboard, true],
    ['implementation', 'Implantação', ClipboardCheck, ['owner','pastor','coordinator'].includes(role)],
    ['presence', `${labels.reception} e ${labels.table}`, UserCheck, ['owner','pastor','coordinator'].includes(role)],
    ['people', 'Pessoas', Users, true],
    ['care', labels.care, HeartHandshake, ['owner','pastor','care'].includes(role)],
    ['groups', labels.group, House, ['owner','pastor','group_leader'].includes(role)],
    ['discipleship', labels.discipleship, Leaf, ['owner','pastor','discipler'].includes(role)],
    ['pastoral', 'Visão pastoral', Sparkles, ['owner','pastor'].includes(role)],
    ['settings', 'Governança', Settings, ['owner','pastor','data_admin'].includes(role)],
  ] as const
  const navSections = [
    { label: 'Visão geral', ids: ['home', 'implementation'] },
    { label: 'Jornada', ids: ['presence', 'people', 'care'] },
    { label: 'Comunidade', ids: ['groups', 'discipleship'] },
    { label: 'Gestão', ids: ['pastoral', 'settings'] },
  ]
  const currentTitle = nav.find(([id]) => id === view)?.[1] ?? 'Início'

  return <div className="app-shell" style={{ '--tenant-primary': organization.primaryColor, '--tenant-accent': organization.accentColor } as React.CSSProperties}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <button className="brand" onClick={() => go('home')}><img src="/brand/raiz-e-mesa-mark.webp" alt="" /><span><strong>Raiz e Mesa</strong><small>{organization.name}</small></span></button>
      <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Fechar menu"><X /></button>
      <nav aria-label="Navegação principal">
        {navSections.map((section) => { const items = nav.filter(([id, , , allowed]) => allowed && section.ids.includes(id)); return items.length ? <section className="nav-section" key={section.label}><span className="nav-section-label">{section.label}</span>{items.map(([id, label, Icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => go(id as View)}><Icon /><span>{label}</span>{id === 'care' && pendingCare.length ? <b>{pendingCare.length}</b> : null}</button>)}</section> : null })}
      </nav>
      <div className="sidebar-footer role-switcher">
        {showRoleMenu ? <div className="role-menu"><span>Visualizar como</span>{Object.entries(roleLabels).map(([id, name]) => <button key={id} className={role === id ? 'active' : ''} onClick={() => { setRole(id as Role); setShowRoleMenu(false); go('home') }}><i>{initials(name)}</i>{name}{role === id ? <Check /> : null}</button>)}</div> : null}
        <button className="role-trigger" onClick={() => setShowRoleMenu((current) => !current)}><div className="avatar">{initials(roleLabels[role])}</div><span><small>Perfil atual</small><strong>{roleLabels[role]}</strong></span><ChevronDown /></button>
      </div>
    </aside>
    {mobileNav ? <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Fechar menu" /> : null}

    <main>
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="mobile-brand"><img src="/brand/raiz-e-mesa-mark.webp" alt="" /><strong>Raiz e Mesa</strong></div>
        <div className="page-context"><span>Raiz e Mesa</span><i /><strong>{currentTitle}</strong></div>
        <label className="congregation-select"><span>{congregationId === 'all' ? 'Todas as unidades' : congregationName(congregationId)}</span><ChevronDown /><select value={congregationId} onChange={(event) => setCongregationId(event.target.value)}><option value="all">Todas as unidades</option>{congregations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label>
        <div className="top-actions">
          <button onClick={() => setShowSearch(true)} aria-label="Pesquisar"><Search /></button>
          <button className="notification" onClick={() => setShowNotifications((current) => !current)} aria-label="Notificações"><Bell />{notifications.length ? <i /> : null}</button>
          <button className="primary compact" onClick={() => setShowAddPerson(true)}><Plus /> Nova pessoa</button>
        </div>
        {showNotifications ? <div className="popover"><strong>Pendências discretas</strong>{notifications.length ? notifications.map((item) => <button key={item.id} onClick={() => go(item.view)}><span>{item.title}</span><small>{item.detail}</small></button>) : <small>Nenhuma pendência.</small>}</div> : null}
      </header>

      <div className="content">
        {view === 'home' && <Dashboard people={scopedPeople} groups={scopedGroups} discipleships={scopedDiscipleships} pending={pendingCare} labels={labels} go={go} open={setSelectedPerson} />}
        {view === 'implementation' && <Implementation done={weekDone} setDone={setWeekDone} />}
        {view === 'presence' && <Presence records={scopedPresence} people={scopedPeople} labels={labels} congregationName={congregationName} add={(record) => { setPresence((current) => [record, ...current]); log('Presença registrada', record.personName) }} />}
        {view === 'people' && <People people={scopedPeople} congregationName={congregationName} open={setSelectedPerson} add={() => setShowAddPerson(true)} />}
        {view === 'care' && <Care people={scopedPeople} congregationName={congregationName} contact={(person) => setMessageDraft({ person, intent: 'current' })} />}
        {view === 'groups' && <Groups groups={scopedGroups} meetings={inScope(groupMeetings)} requests={inScope(joinRequests)} labels={labels} addGroup={() => { const unit = congregationId === 'all' ? congregations[0]?.id : congregationId; setGroups((current) => [...current, { id: crypto.randomUUID(), organizationId: organization.id, congregationId: unit, name: 'Nova Casa de Paz', leader: 'Definir líder', host: 'Definir anfitrião', apprentice: 'Em formação', neighborhood: 'Definir bairro', weekday: 'Quinzenal', time: '20h', capacity: 12, participants: 0, health: 'healthy' }]); log('Casa criada', 'Nova Casa de Paz') }} addMeeting={(group) => { const meeting = { id: crypto.randomUUID(), organizationId: organization.id, congregationId: group.congregationId, groupId: group.id, date: new Date().toISOString().slice(0,10), attendance: group.participants, newcomers: 0, followUpAuthorized: 0, pastoralFlag: false, operationalNote: 'Relatório mínimo registrado.' }; setGroupMeetings((current) => [meeting, ...current]); log('Relatório de Casa registrado', group.name) }} accept={(request) => { setJoinRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: 'accepted', groupId: scopedGroups[0]?.id } : item)); log('Pedido de entrada aceito', request.personName) }} />}
        {view === 'discipleship' && <Discipleship labels={labels} items={scopedDiscipleships} team={team} advance={(item) => { const next = Math.min(item.meeting + 1, 7); setDiscipleships((current) => current.map((existing) => existing.id === item.id ? { ...existing, meeting: next, completedMeetings: [...new Set([...(existing.completedMeetings ?? []), existing.meeting])], status: next === 7 ? 'completed' : 'active', nextMeeting: next === 7 ? 'Ciclo concluído' : 'Agendar próximo encontro' } : existing)); log('Encontro do Raiz concluído', item.person) }} />}
        {view === 'pastoral' && <Pastoral people={scopedPeople} groups={scopedGroups} team={team} labels={labels} />}
        {view === 'settings' && <Governance organization={organization} setOrganization={setOrganization} labels={labels} setLabels={setLabels} congregations={congregations} setCongregations={setCongregations} team={team} setTeam={setTeam} retention={retention} setRetention={setRetention} audit={audit} log={log} />}
      </div>
    </main>

    {showAddPerson ? <AddPerson organization={organization} congregations={congregations} close={() => setShowAddPerson(false)} save={(person) => { setPeople((current) => [person, ...current]); log('Pessoa adicionada', person.name); setShowAddPerson(false) }} /> : null}
    {selectedPerson ? <PersonSheet person={selectedPerson} congregationName={congregationName} close={() => setSelectedPerson(null)} update={(patch, action) => updatePerson(selectedPerson.id, patch, action)} contact={(intent) => setMessageDraft({ person: selectedPerson, intent })} requestRetention={(type) => { setRetention((current) => [{ id: crypto.randomUUID(), personName: selectedPerson.name, type, status: 'open', requestedAt: new Date().toISOString().slice(0,10) }, ...current]); log('Solicitação de privacidade criada', selectedPerson.name, 'restricted') }} /> : null}
    {showSearch ? <GlobalSearch people={scopedPeople} groups={scopedGroups} close={() => setShowSearch(false)} openPerson={(person) => { setShowSearch(false); setSelectedPerson(person) }} go={go} /> : null}
    {messageDraft ? <MessageComposer person={messageDraft.person} intent={messageDraft.intent} groupLabel={labels.group} close={() => setMessageDraft(null)} sent={() => { updatePerson(messageDraft.person.id, { stage: messageDraft.intent === 'group' ? 'group_connected' : messageDraft.intent === 'discipleship' ? 'discipleship_active' : 'care_done', contactStatus: 'sent', lastContactAt: new Date().toISOString(), nextAction: messageDraft.intent === 'group' ? 'Confirmar participação na Casa' : messageDraft.intent === 'discipleship' ? 'Definir discipulador e primeiro encontro' : `Convidar para ${labels.group}`, dueLabel: 'Em até 7 dias' }, 'Mensagem preparada para contato'); setMessageDraft(null) }} /> : null}
  </div>
}

function Intro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Dashboard({ people, pending, groups, discipleships, labels, go, open }: { people: Person[]; pending: Person[]; groups: SmallGroup[]; discipleships: DiscipleshipType[]; labels: AppLabels; go: (view: View) => void; open: (person: Person) => void }) {
  const nearCapacity = groups.filter((group) => group.participants / group.capacity >= .85).length
  return <>
    <Intro eyebrow="CENTRO DE CUIDADO" title="Quem precisa de cuidado hoje?" description="Prioridades humanas, próximas ações claras e nenhuma pessoa transformada em número." />
    <section className="metric-grid">
      <Metric icon={Clock3} label="Contatos em 24–48h" value={pending.length} detail="prioridade do dia" tone="amber" onClick={() => go('care')} />
      <Metric icon={Users} label="Pessoas em jornada" value={people.length} detail="no escopo atual" tone="blue" onClick={() => go('people')} />
      <Metric icon={House} label={labels.group} value={groups.length} detail={`${nearCapacity} perto do limite`} tone="purple" onClick={() => go('groups')} />
      <Metric icon={Leaf} label="Relações do Raiz" value={discipleships.filter((item) => item.status === 'active').length} detail="máximo saudável: 3 por discipulador" tone="green" onClick={() => go('discipleship')} />
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad"><div className="panel-title"><div><span className="eyebrow">PRIORIDADE</span><h2>Cuidado para hoje</h2></div><button className="text-button" onClick={() => go('care')}>Ver fluxo <ChevronRight /></button></div>
        <div className="task-list">{pending.length ? pending.slice(0, 5).map((person) => <button className="care-task" key={person.id} onClick={() => open(person)}><i className="person-avatar">{initials(person.name)}</i><span><strong>{person.name}</strong><small>{person.nextAction}</small></span><Pill tone="amber">{person.dueLabel}</Pill><ChevronRight /></button>) : <Empty title="Tudo cuidado por agora" text="Novas pendências aparecerão aqui." />}</div>
      </div>
      <div className="panel panel-pad"><div className="panel-title"><div><span className="eyebrow">JORNADA</span><h2>Caminho das pessoas</h2></div></div>
        {Object.entries(stageLabels).map(([stage, label]) => { const count = people.filter((person) => person.stage === stage).length; return <div className="journey-row" key={stage}><span>{label}</span><Progress value={people.length ? count / people.length * 100 : 0} /><strong>{count}</strong></div> })}
        <p className="privacy-note"><ShieldCheck /> Indicadores servem ao cuidado; não medem valor espiritual.</p>
      </div>
    </section>
    <section className="culture-card"><span className="culture-mark"><img src="/brand/raiz-e-mesa-mark.webp" alt="" /></span><div><span className="eyebrow">NOSSA CULTURA</span><blockquote>Pessoas ao lado de pessoas, até que criem raízes em Cristo e aprendam a fazer o mesmo por outras.</blockquote></div></section>
  </>
}

function Metric({ icon: Icon, label, value, detail, tone, onClick }: { icon: typeof Users; label: string; value: number; detail: string; tone: Tone; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick}><div className={`metric-icon ${tone}`}><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><ChevronRight /></button>
}

function Implementation({ done, setDone }: { done: Record<number, number[]>; setDone: React.Dispatch<React.SetStateAction<Record<number, number[]>>> }) {
  const [selected, setSelected] = useState(2)
  const week = implementationWeeks[selected - 1]
  const total = implementationWeeks.reduce((sum, item) => sum + item.tasks.length, 0)
  const completed = Object.values(done).reduce((sum, items) => sum + items.length, 0)
  const toggle = (index: number) => setDone((current) => ({ ...current, [selected]: current[selected]?.includes(index) ? current[selected].filter((item) => item !== index) : [...(current[selected] ?? []), index] }))
  return <><Intro eyebrow="IMPLANTAÇÃO GUIADA" title="Sete semanas para formar uma cultura" description="Treinamento bíblico, simulação, prática real e responsáveis claros." action={<Pill tone="gold">{completed} de {total} tarefas</Pill>} />
    <div className="panel implementation-summary"><div><span>Progresso geral</span><strong>{Math.round(completed / total * 100)}%</strong></div><Progress value={completed / total * 100} /><p>Ciclo de 7 semanas</p></div>
    <section className="implementation-layout"><div className="panel week-list">{implementationWeeks.map((item) => <button className={item.week === selected ? 'selected' : ''} key={item.week} onClick={() => setSelected(item.week)}><span className={`week-number ${done[item.week]?.length === item.tasks.length ? 'done' : ''}`}>{done[item.week]?.length === item.tasks.length ? <Check /> : item.week}</span><div><small>SEMANA {item.week}</small><strong>{item.title}</strong><span>{done[item.week]?.length ?? 0}/{item.tasks.length} tarefas concluídas</span></div><ChevronRight /></button>)}</div>
      <div className="panel week-detail"><span className="eyebrow">SEMANA {week.week}</span><h2>{week.title}</h2><p>Encontro de 40–45 minutos: oração, fundamento bíblico, treinamento, simulação e prática.</p><div className="agenda"><h3>Checklist da semana</h3>{week.tasks.map((task, index) => <button className={done[selected]?.includes(index) ? 'checked' : ''} key={task} onClick={() => toggle(index)}><span>{done[selected]?.includes(index) ? <Check /> : index + 1}</span><p>{task}</p></button>)}</div><div className="week-callout"><Sparkles /><div><strong>Prática real</strong><p>{week.practice}</p></div></div><div className="week-rhythm"><span>0–5 Oração</span><span>5–13 Bíblia</span><span>13–28 Treino</span><span>28–38 Simulação</span><span>38–45 Envio</span></div></div>
    </section>
  </>
}

function Presence({ records, people, labels, congregationName, add }: { records: PresenceRecord[]; people: Person[]; labels: AppLabels; congregationName: (id: string) => string; add: (record: PresenceRecord) => void }) {
  const [personId, setPersonId] = useState(people[0]?.id ?? '')
  const [filter, setFilter] = useState<'all' | 'first' | 'host' | 'table'>('all')
  const person = people.find((item) => item.id === personId)
  const visibleRecords = records.filter((item) => filter === 'all' || (filter === 'first' && item.kind === 'first_visit') || (filter === 'host' && Boolean(item.host)) || (filter === 'table' && item.tableJoined))
  return <><Intro title={`${labels.reception} e ${labels.table}`} description="Registre presença, retorno e vínculo sem avaliações subjetivas." />
    <section className="metric-grid compact-metrics"><Metric icon={UserCheck} label="Primeiras visitas" value={records.filter((item) => item.kind === 'first_visit').length} detail={filter === 'first' ? 'filtro ativo' : 'ver registros'} tone="blue" onClick={() => setFilter((current) => current === 'first' ? 'all' : 'first')} /><Metric icon={HeartHandshake} label="Com anfitrião de vínculo" value={records.filter((item) => item.host).length} detail={filter === 'host' ? 'filtro ativo' : 'ver registros'} tone="green" onClick={() => setFilter((current) => current === 'host' ? 'all' : 'host')} /><Metric icon={House} label="Participaram da Mesa" value={records.filter((item) => item.tableJoined).length} detail={filter === 'table' ? 'filtro ativo' : 'ver registros'} tone="gold" onClick={() => setFilter((current) => current === 'table' ? 'all' : 'table')} /></section>
    <section className="dashboard-grid"><div className="panel people-table"><div className="table-head presence-head"><span>Pessoa</span><span>Tipo</span><span>Unidade</span><span>Vínculo</span><span>Mesa Aberta</span></div>{visibleRecords.map((item) => <div className="table-row presence-head" key={item.id}><span className="person-cell"><i className="person-avatar">{initials(item.personName)}</i><span><strong>{item.personName}</strong><small>{formatDate(item.date)}</small></span></span><span><Pill tone={item.kind === 'first_visit' ? 'blue' : 'green'}>{item.kind === 'first_visit' ? 'Primeira visita' : item.kind === 'return' ? 'Retorno' : 'Reaproximação'}</Pill></span><span>{congregationName(item.congregationId)}</span><span>{item.host}</span><span>{item.tableJoined ? 'Participou' : item.tableInvited ? 'Convidado' : 'Não oferecido'}</span></div>)}</div>
      <div className="panel panel-pad quick-register"><span className="eyebrow">REGISTRO RÁPIDO</span><h2>Presença no domingo</h2><label className="field"><span>Pessoa</span><select value={personId} onChange={(event) => setPersonId(event.target.value)}>{people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary full" disabled={!person} onClick={() => person && add({ id: crypto.randomUUID(), organizationId: person.organizationId, congregationId: person.congregationId, personId: person.id, personName: person.name, date: new Date().toISOString().slice(0,10), kind: person.visits > 1 ? 'return' : 'first_visit', host: 'Anfitrião de vínculo', tableInvited: true, tableJoined: false, contactOffered: person.consent })}><Plus /> Registrar presença</button><p className="privacy-note"><ShieldCheck /> Sem notas sobre roupa, personalidade ou “nível espiritual”.</p></div>
    </section>
  </>
}

function People({ people, congregationName, open, add }: { people: Person[]; congregationName: (id: string) => string; open: (person: Person) => void; add: () => void }) {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<'all' | PersonStage>('all')
  const visible = people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()) && (stage === 'all' || person.stage === stage))
  return <><Intro title="Pessoas" description="Vínculos e próximos passos com o mínimo de informação necessária." action={<button className="primary" onClick={add}><Plus /> Nova pessoa</button>} />
    <div className="panel toolbar"><label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" /></label><label className="filter-button">Etapa <select value={stage} onChange={(event) => setStage(event.target.value as typeof stage)}><option value="all">Todas</option>{Object.entries(stageLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><ChevronDown /></label></div>
    <div className="panel people-table"><div className="table-head"><span>Pessoa</span><span>Etapa</span><span>Unidade</span><span>Responsável</span><span>Próxima ação</span></div>{visible.map((person) => <button className="table-row" key={person.id} onClick={() => open(person)}><span className="person-cell"><i className="person-avatar">{initials(person.name)}</i><span><strong>{person.name}</strong><small>{person.consent ? person.phone : 'Contato não autorizado'}</small></span></span><span><Pill tone={person.stage === 'integrated' ? 'green' : person.stage === 'contact_authorized' ? 'amber' : 'neutral'}>{stageLabels[person.stage]}</Pill></span><span>{congregationName(person.congregationId)}</span><span>{person.owner}</span><span>{person.nextAction}<ChevronRight /></span></button>)}{!visible.length ? <Empty title="Nenhuma pessoa encontrada" text="Ajuste os filtros ou adicione um novo cadastro." /> : null}</div>
  </>
}

function Care({ people, congregationName, contact }: { people: Person[]; congregationName: (id: string) => string; contact: (person: Person) => void }) {
  const [script, setScript] = useState(0)
  const pending = people.filter((person) => person.consent && ['contact_authorized', 'care_done'].includes(person.stage))
  return <><Intro title="Cuidado e Conexão" description="Contato em aproximadamente 24 horas, no máximo 48, com consentimento e limites." />
    <section className="care-layout"><div className="care-board">{[
      ['Contato inicial', pending.filter((item) => item.stage === 'contact_authorized')],
      ['Próximo passo', pending.filter((item) => item.stage === 'care_done')],
    ].map(([title, items]) => <section className="board-column" key={String(title)}><div className="board-title"><h2>{String(title)}</h2><span>{(items as Person[]).length}</span></div>{(items as Person[]).map((person) => <article className="board-card" key={person.id}><div className="board-person"><i className="person-avatar">{initials(person.name)}</i><span><strong>{person.name}</strong><small>{congregationName(person.congregationId)}</small></span></div><p>{person.nextAction}</p><div><Pill tone="amber">{person.dueLabel}</Pill><span>{person.owner}</span></div><button className="primary full" onClick={() => contact(person)}><MessageCircle /> Preparar mensagem</button></article>)}</section>)}</div>
      <aside className="panel script-panel"><span className="eyebrow">SCRIPTS DE APOIO</span><div className="script-tabs">{scripts.map(([title], index) => <button className={script === index ? 'active' : ''} onClick={() => setScript(index)} key={title}>{title}</button>)}</div><MessageCircle /><h2>{scripts[script][0]}</h2><blockquote>“{scripts[script][1]}”</blockquote><p>Adapte à relação. Nunca transforme cuidado em mensagem em massa.</p><div className="safe-callout"><AlertTriangle /><div><strong>Encaminhe imediatamente</strong><p>Risco de autoagressão, violência, abuso, emergência, crime ou abuso de poder.</p></div></div></aside>
    </section>
    <div className="panel weekly-review"><strong>Reunião semanal · 20 minutos</strong>{['Quem autorizou contato e ainda não recebeu?','Quem precisa de próximo passo?','Há ausentes ou membros precisando de cuidado?','O que precisa do pastor ou pode ser encerrado?'].map((item, index) => <span key={item}><b>{index * 5}–{index * 5 + 5}</b>{item}</span>)}</div>
  </>
}

function Groups({ groups, meetings, requests, labels, addGroup, addMeeting, accept }: { groups: SmallGroup[]; meetings: GroupMeeting[]; requests: JoinRequest[]; labels: AppLabels; addGroup: () => void; addMeeting: (group: SmallGroup) => void; accept: (request: JoinRequest) => void }) {
  const [tab, setTab] = useState<'groups' | 'requests' | 'reports'>('groups')
  return <><Intro title={labels.group} description="Bíblia, conversa, oração e vínculo — grupos saudáveis de 6–10 pessoas, máximo 12." action={<button className="primary" onClick={addGroup}><Plus /> Nova Casa</button>} />
    <div className="tabs"><button className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>Casas</button><button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Pedidos de entrada <b>{requests.filter((item) => item.status === 'pending').length}</b></button><button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Relatórios mínimos</button></div>
    {tab === 'groups' ? <div className="house-grid">{groups.map((group) => { const capacity = Math.round(group.participants / group.capacity * 100); return <article className="panel house-card" key={group.id}><div className="house-top"><div className="house-icon"><House /></div><Pill tone={capacity >= 85 ? 'amber' : 'green'}>{capacity >= 85 ? 'avaliar capacidade' : 'saudável'}</Pill></div><h2>{group.name}</h2><p>{group.neighborhood} · {group.weekday}, {group.time}</p><div className="capacity"><span><strong>{group.participants}</strong> de {group.capacity}</span><span>{capacity}%</span></div><Progress value={capacity} /><dl><div><dt>Líder</dt><dd>{group.leader}</dd></div><div><dt>Anfitrião</dt><dd>{group.host}</dd></div><div><dt>Aprendiz</dt><dd>{group.apprentice}</dd></div></dl><button className="secondary full" onClick={() => addMeeting(group)}><ClipboardCheck /> Registrar encontro</button></article> })}</div> : null}
    {tab === 'requests' ? <div className="panel request-list">{requests.map((request) => <article key={request.id}><div><i className="person-avatar">{initials(request.personName)}</i><span><strong>{request.personName}</strong><small>{request.neighborhood}</small></span></div><Pill tone={request.status === 'pending' ? 'amber' : 'green'}>{request.status === 'pending' ? 'aguardando' : 'conectado'}</Pill>{request.status === 'pending' ? <button className="secondary" onClick={() => accept(request)}>Conectar à Casa</button> : <span>Encaminhamento realizado</span>}</article>)}</div> : null}
    {tab === 'reports' ? <div className="panel report-list"><div className="table-head report-head"><span>Casa</span><span>Data</span><span>Presentes</span><span>Novos</span><span>Acompanhamento</span></div>{meetings.map((meeting) => <div className="table-row report-head" key={meeting.id}><span>{groups.find((group) => group.id === meeting.groupId)?.name ?? 'Casa'}</span><span>{formatDate(meeting.date)}</span><span>{meeting.attendance}</span><span>{meeting.newcomers}</span><span>{meeting.pastoralFlag ? <Pill tone="amber">contato pastoral</Pill> : meeting.operationalNote}</span></div>)}</div> : null}
  </>
}

function Discipleship({ labels, items, team, advance }: { labels: AppLabels; items: DiscipleshipType[]; team: TeamMember[]; advance: (item: DiscipleshipType) => void }) {
  const loads = team.filter((member) => member.role === 'discipler')
  return <><Intro title={`${labels.discipleship} · Discipulado inicial`} description="Sete encontros relacionais; base para uma vida de discipulado, não certificado de maturidade." />
    <section className="root-layout"><div className="panel root-list"><div className="panel-title"><h2>Acompanhamentos</h2><Pill tone="green">{items.filter((item) => item.status === 'active').length} ativos</Pill></div>{items.map((item) => <article className="root-card" key={item.id}><div className="root-person"><i className="person-avatar">{initials(item.person)}</i><div><strong>{item.person}</strong><span>com {item.mentor}</span></div></div><div className="root-progress"><span>Encontro {item.meeting} de 7</span><Progress value={item.meeting / 7 * 100} /></div><div><Pill tone={item.status === 'completed' ? 'green' : 'blue'}>{item.status === 'completed' ? 'concluído' : 'ativo'}</Pill><small>{item.nextMeeting}</small></div>{item.status === 'active' ? <button className="icon-action" onClick={() => advance(item)} aria-label="Concluir encontro"><Check /></button> : <CheckCircle2 />}</article>)}</div>
      <div className="panel root-map"><span className="eyebrow">MAPA DOS ENCONTROS</span><h2>Uma base, não uma linha de chegada</h2>{discipleshipMeetings.map((meeting, index) => <div className="meeting-row" key={meeting}><span>{index + 1}</span><p>{meeting}</p></div>)}</div>
    </section>
    <section className="panel load-panel"><div><span className="eyebrow">CARGA SAUDÁVEL</span><h2>Relações por discipulador</h2><p>Ideal 2; máximo inicial 3 relações ativas.</p></div>{loads.map((member) => <div key={member.id}><span>{member.name}</span><Progress value={member.weeklyLoad / 3 * 100} /><strong>{member.weeklyLoad}/3</strong></div>)}</section>
  </>
}

function Pastoral({ people, groups, team, labels }: { people: Person[]; groups: SmallGroup[]; team: TeamMember[]; labels: AppLabels }) {
  const careTeam = team.filter((member) => member.role === 'care')
  return <><Intro title="Visão pastoral" description="Saúde, riscos e sobrecarga — sem ranking de líderes ou rótulos espirituais." />
    <section className="pastoral-metrics"><div className="panel"><span>Pessoas acompanhadas</span><strong>{people.length}</strong><small>escopo selecionado</small></div><div className="panel"><span>Contatos no prazo</span><strong>{people.length ? Math.round(people.filter((item) => item.stage !== 'contact_authorized').length / people.length * 100) : 100}%</strong><small>referência saudável: ≥ 80%</small></div><div className="panel"><span>Casas em atenção</span><strong>{groups.filter((item) => item.participants / item.capacity >= .85).length}</strong><small>avaliar sem multiplicar cedo</small></div><div className="panel"><span>Encaminhamentos</span><strong>{people.filter((item) => item.pastoralFlag).length}</strong><small>acesso restrito</small></div></section>
    <section className="dashboard-grid"><div className="panel panel-pad"><div className="panel-title"><h2>Saúde por área</h2><Pill tone="green">Sem ranking</Pill></div>{[[labels.reception,82],[labels.table,75],[labels.care,86],[labels.group,78],[labels.discipleship,71]].map(([name,value]) => <div className="health-row" key={String(name)}><span>{name}</span><Progress value={Number(value)} /><strong>{value}%</strong></div>)}</div><div className="panel panel-pad"><div className="panel-title"><h2>Carga de cuidado</h2></div>{careTeam.map((member) => <div className="load-row" key={member.id}><span><strong>{member.name}</strong><small>limite recomendado: 8–10</small></span><Progress value={member.weeklyLoad / 10 * 100} /><Pill tone={member.weeklyLoad >= 10 ? 'amber' : 'green'}>{member.weeklyLoad}/10</Pill></div>)}</div></section>
  </>
}

function Governance({ organization, setOrganization, labels, setLabels, congregations, setCongregations, team, setTeam, retention, setRetention, audit, log }: { organization: Organization; setOrganization: React.Dispatch<React.SetStateAction<Organization>>; labels: AppLabels; setLabels: React.Dispatch<React.SetStateAction<AppLabels>>; congregations: Congregation[]; setCongregations: React.Dispatch<React.SetStateAction<Congregation[]>>; team: TeamMember[]; setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>; retention: RetentionRequest[]; setRetention: React.Dispatch<React.SetStateAction<RetentionRequest[]>>; audit: AuditEvent[]; log: (action: string, target: string, sensitivity?: AuditEvent['sensitivity']) => void }) {
  const [tab, setTab] = useState<SettingsTab>('identity')
  return <><Intro title="Governança e configuração" description="Marca, equipe, escopos, privacidade, retenção e histórico de alterações." /><section className="settings-layout"><div className="panel settings-nav">{([['identity','Identidade e unidades',Pencil],['team','Equipe e permissões',UserCog],['privacy','Privacidade e retenção',LockKeyhole],['audit','Auditoria',FileClock]] as const).map(([id,title,Icon]) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon />{title}</button>)}</div>
      <div className="panel settings-form">
        {tab === 'identity' ? <><span className="eyebrow">MARCA DA IGREJA</span><div className="brand-preview"><img src="/brand/raiz-e-mesa-poster.webp" alt="Identidade Raiz e Mesa" /><div><strong>{organization.name}</strong><span>Personalização por organização</span></div></div><div className="two-fields"><Field label="Nome da igreja" value={organization.name} onChange={(value) => setOrganization((current) => ({ ...current, name: value }))} /><Field label="Nome do programa" value={organization.ministryName} onChange={(value) => setOrganization((current) => ({ ...current, ministryName: value }))} /></div><div className="color-fields"><label><span>Cor principal</span><input type="color" value={organization.primaryColor} onChange={(event) => setOrganization((current) => ({ ...current, primaryColor: event.target.value }))} /></label><label><span>Cor de destaque</span><input type="color" value={organization.accentColor} onChange={(event) => setOrganization((current) => ({ ...current, accentColor: event.target.value }))} /></label></div><hr /><span className="eyebrow">NOMES ADAPTÁVEIS</span>{(Object.keys(labels) as Array<keyof AppLabels>).map((key) => <Field key={key} label={key} value={labels[key]} onChange={(value) => setLabels((current) => ({ ...current, [key]: value }))} />)}<hr /><div className="section-heading"><h2>Unidades</h2><button className="secondary" onClick={() => setCongregations((current) => [...current, { id: crypto.randomUUID(), organizationId: organization.id, name: 'Nova unidade', city: 'Cidade · UF', active: true }])}><Plus /> Adicionar</button></div>{congregations.map((item) => <div className="congregation-edit" key={item.id}><input value={item.name} onChange={(event) => setCongregations((current) => current.map((existing) => existing.id === item.id ? { ...existing, name: event.target.value } : existing))} /><input value={item.city} onChange={(event) => setCongregations((current) => current.map((existing) => existing.id === item.id ? { ...existing, city: event.target.value } : existing))} /><button className={`status-toggle ${item.active ? 'active' : ''}`} onClick={() => setCongregations((current) => current.map((existing) => existing.id === item.id ? { ...existing, active: !existing.active } : existing))}>{item.active ? 'Ativa' : 'Inativa'}</button></div>)}</> : null}
        {tab === 'team' ? <><div className="section-heading"><div><span className="eyebrow">MENOR PRIVILÉGIO</span><h2>Equipe e escopo</h2></div><button className="secondary" onClick={() => { setTeam((current) => [...current, { id: crypto.randomUUID(), name: 'Novo integrante', role: 'care', congregationIds: [congregations[0]?.id], active: true, weeklyLoad: 0 }]); log('Integrante adicionado', 'Novo integrante') }}><Plus /> Integrante</button></div><div className="team-list">{team.map((member) => <article key={member.id}><div className="person-cell"><i className="person-avatar">{initials(member.name)}</i><span><strong>{member.name}</strong><small>{member.congregationIds.map((id) => congregations.find((item) => item.id === id)?.name).join(', ')}</small></span></div><select value={member.role} onChange={(event) => { setTeam((current) => current.map((item) => item.id === member.id ? { ...item, role: event.target.value as Role } : item)); log('Papel alterado', member.name, 'restricted') }}>{Object.entries(roleLabels).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select><Pill tone={member.active ? 'green' : 'neutral'}>{member.active ? 'ativo' : 'inativo'}</Pill></article>)}</div></> : null}
        {tab === 'privacy' ? <><span className="eyebrow">LGPD POR DESIGN</span><h2>Solicitações e retenção</h2><div className="principle-grid">{['Coleta mínima','Consentimento revogável','Sem prontuário íntimo','Exportação administrada'].map((item) => <span key={item}><ShieldCheck />{item}</span>)}</div><div className="retention-list">{retention.map((request) => <article key={request.id}><div><strong>{request.personName}</strong><small>{request.type === 'deletion' ? 'Exclusão' : request.type === 'correction' ? 'Correção' : 'Revogação de consentimento'} · {formatDate(request.requestedAt)}</small></div><Pill tone={request.status === 'completed' ? 'green' : 'amber'}>{request.status}</Pill>{request.status !== 'completed' ? <button className="secondary" onClick={() => { setRetention((current) => current.map((item) => item.id === request.id ? { ...item, status: 'completed' } : item)); log('Solicitação LGPD concluída', request.personName, 'restricted') }}>Concluir</button> : null}</article>)}</div></> : null}
        {tab === 'audit' ? <><span className="eyebrow">TRILHA IMUTÁVEL</span><h2>Acessos e alterações</h2><div className="audit-list">{audit.map((event) => <article key={event.id}><i className={event.sensitivity === 'restricted' ? 'restricted' : ''}>{event.sensitivity === 'restricted' ? <LockKeyhole /> : <Check />}</i><div><strong>{event.action}</strong><span>{event.target}</span><small>{event.actor} · {new Date(event.createdAt).toLocaleString('pt-BR')}</small></div></article>)}</div></> : null}
      </div></section>
  </>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><div><input value={value} onChange={(event) => onChange(event.target.value)} /><Pencil /></div></label>
}

function AddPerson({ organization, congregations, close, save }: { organization: Organization; congregations: Congregation[]; close: () => void; save: (person: Person) => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [unit, setUnit] = useState(congregations[0]?.id ?? ''); const [consent, setConsent] = useState(false)
  function submit(event: React.FormEvent) { event.preventDefault(); if (!name.trim()) return; save({ id: crypto.randomUUID(), organizationId: organization.id, congregationId: unit, name: name.trim(), phone: consent ? phone : '', firstVisit: new Date().toISOString().slice(0,10), consent, consentGrantedAt: consent ? new Date().toISOString() : undefined, stage: consent ? 'contact_authorized' : 'new', contactStatus: consent ? 'pending' : 'closed', owner: 'Sem responsável', nextAction: consent ? 'Enviar primeira mensagem em até 48h' : 'Acolher na próxima visita', dueLabel: consent ? 'Em até 48h' : 'Próximo domingo', visits: 1, createdAt: new Date().toISOString() }) }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">CADASTRO MÍNIMO</span><h2>Adicionar pessoa</h2></div><button type="button" onClick={close}><X /></button></div><p className="modal-intro">Registre apenas o necessário. Informações íntimas não pertencem a este cadastro.</p><Field label="Nome" value={name} onChange={setName} /><label className="field"><span>Unidade</span><select value={unit} onChange={(event) => setUnit(event.target.value)}>{congregations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label><Field label="WhatsApp" value={phone} onChange={setPhone} /><label className="consent-box"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>Autorizou contato durante a semana</strong><small>Totalmente opcional e revogável.</small></span></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary"><Plus /> Adicionar</button></div></form></div>
}

function MessageComposer({ person, intent, groupLabel, close, sent }: { person: Person; intent: MessageIntent; groupLabel: string; close: () => void; sent: () => void }) {
  const suggestions = messageSuggestions(person, intent, groupLabel)
  const [variation, setVariation] = useState(0)
  const [message, setMessage] = useState(suggestions[0])
  const canSend = person.consent && Boolean(person.phone.replace(/\D/g, '')) && Boolean(message.trim())
  const another = () => {
    const next = (variation + 1) % suggestions.length
    setVariation(next)
    setMessage(suggestions[next])
  }
  const send = () => {
    if (!canSend) return
    window.open(whatsappUrl(person.phone, message.trim()), '_blank', 'noopener,noreferrer')
    sent()
  }
  return <div className="modal-backdrop" onMouseDown={close}>
    <section className="modal message-composer" onMouseDown={(event) => event.stopPropagation()} aria-labelledby="message-title">
      <div className="modal-head"><div><span className="eyebrow">MENSAGEM PARA A ETAPA ATUAL</span><h2 id="message-title">Falar com {firstName(person.name)}</h2></div><button onClick={close} aria-label="Fechar"><X /></button></div>
      <p className="modal-intro">A sugestão usa somente a etapa da jornada. Revise e personalize antes de abrir o WhatsApp.</p>
      <label className="message-editor"><span>Mensagem sugerida</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} /></label>
      <div className="message-tools">
        <button className="secondary" onClick={another}><RefreshCw /> Sugerir outra</button>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(message)} disabled={!message.trim()}><Copy /> Copiar</button>
        <button className="secondary danger-button" onClick={() => setMessage('')} disabled={!message}><Trash2 /> Apagar</button>
      </div>
      {!person.consent ? <p className="message-warning"><LockKeyhole /> O contato não foi autorizado. Registre o consentimento antes de enviar.</p> : null}
      <div className="modal-actions"><button className="secondary" onClick={close}>Cancelar</button><button className="primary" onClick={send} disabled={!canSend}><Send /> Abrir no WhatsApp</button></div>
    </section>
  </div>
}

function PersonSheet({ person, congregationName, close, update, contact, requestRetention }: { person: Person; congregationName: (id: string) => string; close: () => void; update: (patch: Partial<Person>, action: string) => void; contact: (intent: MessageIntent) => void; requestRetention: (type: RetentionRequest['type']) => void }) {
  const stages = Object.keys(stageLabels) as PersonStage[]
  const next = stages[Math.min(stages.indexOf(person.stage) + 1, stages.length - 1)]
  return <div className="modal-backdrop sheet-backdrop" onMouseDown={close}>
    <aside className="person-sheet" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head"><span className="eyebrow">JORNADA DA PESSOA</span><button onClick={close} aria-label="Fechar"><X /></button></div>
      <div className="person-profile"><i className="large-avatar">{initials(person.name)}</i><h2>{person.name}</h2><Pill tone={person.pastoralFlag ? 'amber' : 'gold'}>{stageLabels[person.stage]}</Pill><p>{congregationName(person.congregationId)}</p></div>
      <div className="sheet-section"><h3>Próximo cuidado</h3><button className="next-care" onClick={() => contact('current')} disabled={!person.consent}><Clock3 /><div><strong>{person.nextAction}</strong><span>{person.dueLabel} · {person.owner}</span></div><ChevronRight /></button></div>
      <div className="sheet-section"><h3>Dados operacionais</h3><dl><div><dt>Primeira visita</dt><dd>{formatDate(person.firstVisit)}</dd></div><div><dt>Visitas</dt><dd>{person.visits}</dd></div><div><dt>Contato</dt><dd>{person.consent ? <button className="contact-link" onClick={() => contact('current')}><Phone /> {person.phone}</button> : 'Não autorizado'}</dd></div></dl></div>
      <div className="sheet-section"><h3>Próximos passos</h3>
        {person.consent ? <button className="sheet-action featured" onClick={() => contact('current')}><MessageCircle /><span><strong>Preparar mensagem</strong><small>Sugestão editável para a etapa atual</small></span><ChevronRight /></button> : null}
        <button className="sheet-action" onClick={() => contact('group')} disabled={!person.consent}><House /><span><strong>Convidar para Casa de Paz</strong><small>Mensagem de convite sem pressão</small></span><ChevronRight /></button>
        <button className="sheet-action" onClick={() => contact('discipleship')} disabled={!person.consent}><Leaf /><span><strong>Iniciar Raiz</strong><small>Apresentar os sete encontros</small></span><ChevronRight /></button>
        <button className="sheet-action" onClick={() => contact('absence')} disabled={!person.consent}><Phone /><span><strong>Contato por ausência</strong><small>Cuidado sem cobrança</small></span><ChevronRight /></button>
        {person.stage !== 'integrated' ? <button className="sheet-action" onClick={() => update({ stage: next, nextAction: 'Definir próximo passo', dueLabel: 'Nesta semana' }, `Etapa alterada para ${stageLabels[next]}`)}><CheckCircle2 /><span><strong>Avançar para {stageLabels[next]}</strong><small>Registra a mudança na auditoria</small></span><ChevronRight /></button> : null}
        <button className="sheet-action" onClick={() => update({ pastoralFlag: !person.pastoralFlag }, person.pastoralFlag ? 'Encaminhamento pastoral encerrado' : 'Encaminhamento pastoral criado')}><HeartHandshake /><span><strong>{person.pastoralFlag ? 'Encerrar marcador pastoral' : 'Solicitar contato pastoral'}</strong><small>Sem registrar detalhes íntimos</small></span><ChevronRight /></button>
        {person.consent ? <button className="sheet-action" onClick={() => update({ consent: false, phone: '', consentRevokedAt: new Date().toISOString(), contactStatus: 'closed' }, 'Consentimento revogado')}><LockKeyhole /><span><strong>Revogar consentimento</strong><small>Remove o contato do fluxo operacional</small></span><ChevronRight /></button> : null}
        <button className="sheet-action danger" onClick={() => requestRetention('deletion')}><FileClock /><span><strong>Solicitar exclusão</strong><small>Processamento administrativo e auditável</small></span><ChevronRight /></button>
      </div>
      <p className="privacy-note"><ShieldCheck /> Acesso e alterações ficam registrados.</p>
    </aside>
  </div>
}

function GlobalSearch({ people, groups, close, openPerson, go }: { people: Person[]; groups: SmallGroup[]; close: () => void; openPerson: (person: Person) => void; go: (view: View) => void }) {
  const [query, setQuery] = useState('')
  const persons = query ? people.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0,5) : []
  const houses = query ? groups.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0,5) : []
  return <div className="modal-backdrop search-backdrop" onMouseDown={close}><div className="global-search" onMouseDown={(event) => event.stopPropagation()}><label><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoas ou Casas..." /><button onClick={close}><X /></button></label>{query ? <div className="search-results"><span className="eyebrow">RESULTADOS</span>{persons.map((person) => <button key={person.id} onClick={() => openPerson(person)}><Users /><span><strong>{person.name}</strong><small>{stageLabels[person.stage]}</small></span><ChevronRight /></button>)}{houses.map((group) => <button key={group.id} onClick={() => { close(); go('groups') }}><House /><span><strong>{group.name}</strong><small>{group.neighborhood}</small></span><ChevronRight /></button>)}{!persons.length && !houses.length ? <Empty title="Nenhum resultado" text="Tente outro nome." /> : null}</div> : <div className="search-hint"><Sparkles /><p>Pesquisa limitada ao seu papel, organização e unidades.</p></div>}</div></div>
}
