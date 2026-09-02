import { useMemo, useState } from 'react'
import {
  Bell, BookOpen, Check, ChevronDown, ChevronRight, ClipboardCheck, Clock3,
  HeartHandshake, House, LayoutDashboard, Leaf, Menu, MoreHorizontal, Pencil,
  Plus, Search, Settings, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import './App.css'
import {
  discipleshipMeetings, implementationWeeks, seedCongregations, seedDiscipleships,
  seedGroups, seedLabels, seedOrganization, seedPeople,
} from './seed'
import type { AppLabels, Congregation, Organization, Person, PersonStage } from './types'
import { usePersistentState } from './usePersistentState'

type View = 'home' | 'implementation' | 'people' | 'care' | 'groups' | 'discipleship' | 'pastoral' | 'settings'

const stageLabels: Record<PersonStage, string> = {
  new: 'Novo', contact_authorized: 'Contato autorizado', care_done: 'Cuidado realizado',
  group_connected: 'Conectado ao grupo', discipleship_active: 'Discipulado ativo', integrated: 'Integrado',
}

function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('') }
function Progress({ value }: { value: number }) { return <div className="progress" aria-label={`${Math.round(value)}%`}><span style={{ width: `${value}%` }} /></div> }
function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'blue' | 'purple' }) { return <span className={`pill pill-${tone}`}>{children}</span> }

function App() {
  const [view, setView] = useState<View>('home')
  const [mobileNav, setMobileNav] = useState(false)
  const [congregationId, setCongregationId] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [organization, setOrganization] = usePersistentState<Organization>('rem:organization', seedOrganization)
  const [congregations, setCongregations] = usePersistentState<Congregation[]>('rem:congregations', seedCongregations)
  const [labels, setLabels] = usePersistentState<AppLabels>('rem:labels', seedLabels)
  const [people, setPeople] = usePersistentState<Person[]>('rem:people', seedPeople)

  const scopedPeople = useMemo(() => people.filter((person) => congregationId === 'all' || person.congregationId === congregationId), [people, congregationId])
  const scopedGroups = seedGroups.filter((group) => congregationId === 'all' || group.congregationId === congregationId)
  const scopedDiscipleships = seedDiscipleships.filter((item) => congregationId === 'all' || item.congregationId === congregationId)
  const pending = scopedPeople.filter((person) => ['contact_authorized', 'care_done'].includes(person.stage))

  const congregationName = (id: string) => {
    const congregation = congregations.find((item) => item.id === id)
    return congregation ? `${congregation.name} · ${congregation.city}` : 'Unidade não encontrada'
  }

  const nav = [
    ['home', 'Início', LayoutDashboard], ['implementation', 'Implantação', ClipboardCheck],
    ['people', 'Pessoas', Users], ['care', labels.care, HeartHandshake],
    ['groups', labels.group, House], ['discipleship', labels.discipleship, Leaf],
    ['pastoral', 'Visão pastoral', Sparkles], ['settings', 'Configurações', Settings],
  ] as const

  function go(next: View) { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function completeCare(id: string) {
    setPeople((current) => current.map((person) => person.id === id ? {
      ...person, stage: 'care_done', nextAction: `Convidar para ${labels.group}`, dueLabel: 'Em até 7 dias',
    } : person))
  }

  return <div className="app-shell" style={{ '--tenant-primary': organization.primaryColor, '--tenant-accent': organization.accentColor } as React.CSSProperties}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">R<i /></div><div><strong>{organization.ministryName.split(' ')[0]}</strong><span>{organization.ministryName.split(' ').slice(1).join(' ') || 'CUIDADO'}</span></div></div>
      <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Fechar menu"><X /></button>
      <nav aria-label="Navegação principal">
        {nav.map(([id, label, Icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => go(id)}><Icon /><span>{label}</span>{id === 'care' && pending.length ? <b>{pending.length}</b> : null}</button>)}
      </nav>
      <div className="sidebar-footer"><div className="avatar">PR</div><div><strong>Pastor responsável</strong><span>Pastor · Administrador</span></div><MoreHorizontal /></div>
    </aside>
    {mobileNav ? <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Fechar menu" /> : null}

    <main>
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="tenant-switcher"><span className="tenant-logo">{organization.logoText}</span><div><strong>{organization.name}</strong><small>{organization.plan === 'pilot' ? 'Organização piloto' : `Plano ${organization.plan}`}</small></div></div>
        <label className="congregation-select"><span>{congregationId === 'all' ? 'Todas as unidades' : congregationName(congregationId)}</span><ChevronDown /><select value={congregationId} onChange={(event) => setCongregationId(event.target.value)}><option value="all">Todas as unidades</option>{congregations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label>
        <div className="top-actions"><button aria-label="Pesquisar"><Search /></button><button className="notification" aria-label="Notificações"><Bell /><i /></button><button className="primary compact" onClick={() => setShowAdd(true)}><Plus /> Nova pessoa</button></div>
      </header>

      <div className="content">
        {view === 'home' && <Dashboard people={scopedPeople} pending={pending} groups={scopedGroups.length} activeDiscipleships={scopedDiscipleships.filter((item) => item.status === 'active').length} labels={labels} go={go} completeCare={completeCare} open={setSelected} />}
        {view === 'implementation' && <Implementation />}
        {view === 'people' && <People people={scopedPeople} labels={labels} congregationName={congregationName} open={setSelected} add={() => setShowAdd(true)} />}
        {view === 'care' && <Care people={scopedPeople} labels={labels} congregationName={congregationName} open={setSelected} complete={completeCare} />}
        {view === 'groups' && <Groups labels={labels} groups={scopedGroups} />}
        {view === 'discipleship' && <Discipleship labels={labels} items={scopedDiscipleships} />}
        {view === 'pastoral' && <Pastoral people={scopedPeople} labels={labels} />}
        {view === 'settings' && <SettingsPage organization={organization} setOrganization={setOrganization} labels={labels} setLabels={setLabels} congregations={congregations} setCongregations={setCongregations} />}
      </div>
    </main>

    {showAdd ? <AddPerson organization={organization} congregations={congregations} close={() => setShowAdd(false)} save={(person) => { setPeople((current) => [person, ...current]); setShowAdd(false) }} /> : null}
    {selected ? <PersonSheet person={selected} labels={labels} congregationName={congregationName} close={() => setSelected(null)} /> : null}
  </div>
}

function Intro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Dashboard({ people, pending, groups, activeDiscipleships, labels, go, completeCare, open }: { people: Person[]; pending: Person[]; groups: number; activeDiscipleships: number; labels: AppLabels; go: (view: View) => void; completeCare: (id: string) => void; open: (person: Person) => void }) {
  const stages = [
    ['Novo', people.filter((p) => p.stage === 'new').length, '#91a09d'],
    ['Cuidado', people.filter((p) => ['contact_authorized', 'care_done'].includes(p.stage)).length, '#e99a4a'],
    [labels.group, people.filter((p) => p.stage === 'group_connected').length, '#7b82df'],
    [labels.discipleship, people.filter((p) => p.stage === 'discipleship_active').length, '#45a678'],
    ['Integrado', people.filter((p) => p.stage === 'integrated').length, '#246b50'],
  ] as const
  return <>
    <Intro eyebrow="QUARTA-FEIRA, 2 DE SETEMBRO" title="Quem precisa de cuidado hoje?" description="Uma visão simples para que nenhuma pessoa seja esquecida." />
    <section className="metric-grid">
      <Metric icon={Clock3} label="Contatos em 24–48h" value={pending.length} detail="2 vencem hoje" tone="amber" onClick={() => go('care')} />
      <Metric icon={Users} label="Novas pessoas" value={people.filter((p) => p.visits <= 2).length} detail="nos últimos 30 dias" tone="blue" onClick={() => go('people')} />
      <Metric icon={House} label={labels.group} value={groups} detail="1 próximo do limite" tone="purple" onClick={() => go('groups')} />
      <Metric icon={Leaf} label={`${labels.discipleship} ativos`} value={activeDiscipleships} detail="encontros nesta semana" tone="green" onClick={() => go('discipleship')} />
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad"><div className="panel-title"><div><span className="eyebrow">PRIORIDADE</span><h2>Cuidado para hoje</h2></div><button className="text-button" onClick={() => go('care')}>Ver todos <ChevronRight /></button></div>
        <div className="task-list">{pending.slice(0, 4).map((person) => <article className="care-task" key={person.id}><button className="person-avatar" onClick={() => open(person)}>{initials(person.name)}</button><button className="care-main" onClick={() => open(person)}><strong>{person.name}</strong><span>{person.nextAction}</span></button><div className="task-meta"><Pill tone={person.dueLabel.includes('Hoje') ? 'amber' : 'neutral'}>{person.dueLabel}</Pill><small>{person.owner}</small></div><button className="complete-button" onClick={() => completeCare(person.id)}><Check /> Concluir</button></article>)}</div>
      </div>
      <div className="panel panel-pad"><div className="panel-title"><div><span className="eyebrow">VISÃO GERAL</span><h2>Caminho das pessoas</h2></div></div><div className="journey-list">{stages.map(([label, count, color]) => <div className="journey-row" key={label}><span className="journey-dot" style={{ background: color }} /><span>{label}</span><div><i style={{ width: `${Math.max(count * 20, 6)}%`, background: color }} /></div><strong>{count}</strong></div>)}</div><p className="privacy-note"><ShieldCheck /> Números apoiam o cuidado; não medem valor espiritual.</p></div>
    </section>
    <section className="culture-card"><div className="culture-mark"><Leaf /></div><div><span className="eyebrow">NOSSA CULTURA</span><blockquote>“Pessoas ao lado de pessoas, até que criem raízes em Cristo e aprendam a fazer o mesmo por outras.”</blockquote></div></section>
  </>
}

function Metric({ icon: Icon, label, value, detail, tone, onClick }: { icon: typeof Users; label: string; value: number; detail: string; tone: string; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick}><div className={`metric-icon ${tone}`}><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><ChevronRight /></button>
}

function Implementation() {
  const [selected, setSelected] = useState(2)
  const week = implementationWeeks[selected - 1]
  return <><Intro eyebrow="IMPLANTAÇÃO GUIADA" title="Sete semanas para formar uma cultura" description="Treinamento, prática real e acompanhamento, com conteúdo-base que cada organização pode adaptar." action={<button className="primary"><BookOpen /> Manual da semana</button>} />
    <div className="panel implementation-summary"><div><span>Progresso geral</span><strong>24%</strong></div><Progress value={24} /><p>Semana 2 de 7</p></div>
    <section className="implementation-layout"><div className="panel week-list">{implementationWeeks.map((item) => <button className={item.week === selected ? 'selected' : ''} key={item.week} onClick={() => setSelected(item.week)}><span className={`week-number ${item.status === 'done' ? 'done' : ''}`}>{item.status === 'done' ? <Check /> : item.week}</span><div><small>SEMANA {item.week}</small><strong>{item.title}</strong><span>{item.done}/{item.tasks} tarefas concluídas</span></div><ChevronRight /></button>)}</div><div className="panel week-detail"><span className="eyebrow">SEMANA {week.week}</span><h2>{week.title}</h2><p>Encontro de 40–45 minutos com oração, fundamento bíblico, treinamento, simulação e prática real.</p><div className="agenda"><h3>Roteiro do encontro</h3>{[['0–5 min', 'Oração e revisão'], ['5–13 min', 'Fundamento bíblico'], ['13–28 min', 'Treinamento principal'], ['28–38 min', 'Simulação ou caso real'], ['38–45 min', 'Tarefa, dúvidas e oração']].map(([time, title]) => <div key={time}><span>{time}</span><p>{title}</p></div>)}</div><div className="week-callout"><Sparkles /><div><strong>Prática da semana</strong><p>Aplicar o módulo em uma situação real, observar o que funcionou e registrar somente os ajustes necessários.</p></div></div><button className="secondary full">Tarefas e responsáveis <ChevronRight /></button></div></section>
  </>
}

function People({ people, labels, congregationName, open, add }: { people: Person[]; labels: AppLabels; congregationName: (id: string) => string; open: (person: Person) => void; add: () => void }) {
  const [query, setQuery] = useState('')
  const visible = people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()))
  return <><Intro title="Pessoas" description="Vínculos e próximos passos com o mínimo de informação necessária." action={<button className="primary" onClick={add}><Plus /> Nova pessoa</button>} /><div className="panel toolbar"><label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" /></label><button className="filter-button">Etapa <ChevronDown /></button><button className="filter-button">Responsável <ChevronDown /></button></div><div className="panel people-table"><div className="table-head"><span>Pessoa</span><span>Etapa</span><span>Unidade</span><span>Responsável</span><span>Próxima ação</span></div>{visible.map((person) => <button className="table-row" key={person.id} onClick={() => open(person)}><span className="person-cell"><i className="person-avatar">{initials(person.name)}</i><span><strong>{person.name}</strong><small>{person.phone || 'Contato não autorizado'}</small></span></span><span><Pill tone={person.stage === 'discipleship_active' ? 'green' : person.stage === 'group_connected' ? 'purple' : person.stage === 'contact_authorized' ? 'amber' : 'neutral'}>{stageLabels[person.stage]}</Pill></span><span>{congregationName(person.congregationId)}</span><span>{person.owner}</span><span>{person.nextAction}<ChevronRight /></span></button>)}</div><p className="privacy-footer"><ShieldCheck /> Contatos aparecem somente para funções autorizadas. O nome “{labels.care}” pode ser alterado pela igreja.</p></>
}

function Care({ people, labels, congregationName, open, complete }: { people: Person[]; labels: AppLabels; congregationName: (id: string) => string; open: (person: Person) => void; complete: (id: string) => void }) {
  const pending = people.filter((person) => ['contact_authorized', 'care_done'].includes(person.stage))
  const columns = [['Contato inicial', pending.filter((p) => p.stage === 'contact_authorized')], ['Em acompanhamento', pending.filter((p) => p.stage === 'care_done')], ['Próximo passo', pending.slice(0, 2)]] as const
  return <><Intro title={labels.care} description="Contatos humanos em 24–48 horas, com consentimento, discrição e próximos passos claros." /><div className="care-board">{columns.map(([title, items], columnIndex) => <section className="board-column" key={title}><div className="board-title"><h2>{title}</h2><span>{items.length}</span></div>{items.map((person) => <article className="board-card" key={`${title}-${person.id}`}><button className="board-person" onClick={() => open(person)}><i className="person-avatar">{initials(person.name)}</i><span><strong>{person.name}</strong><small>{congregationName(person.congregationId)}</small></span></button><p>{person.nextAction}</p><div><Pill tone="amber">{person.dueLabel}</Pill><span>{person.owner}</span></div>{columnIndex === 0 ? <button className="secondary full" onClick={() => complete(person.id)}><Check /> Marcar como realizado</button> : null}</article>)}</section>)}</div><div className="safe-callout"><ShieldCheck /><div><strong>Quando a conversa ficar sensível</strong><p>Pare o fluxo operacional, encaminhe ao pastor e não registre confissões, traumas ou detalhes íntimos.</p></div></div></>
}

function Groups({ labels, groups }: { labels: AppLabels; groups: typeof seedGroups }) {
  return <><Intro title={labels.group} description="Comunidade nos lares, conversa bíblica, oração e vínculo — sem transformar a casa em palco." action={<button className="primary"><Plus /> Novo grupo</button>} /><div className="house-grid">{groups.map((group) => { const capacity = Math.round(group.participants / group.capacity * 100); return <article className="panel house-card" key={group.id}><div className="house-top"><div className="house-icon"><House /></div><Pill tone={group.health === 'attention' ? 'amber' : 'green'}>{group.health === 'attention' ? 'atenção' : 'saudável'}</Pill></div><h2>{group.name}</h2><p>{group.neighborhood} · {group.weekday}, {group.time}</p><div className="capacity"><span><strong>{group.participants}</strong> de {group.capacity} pessoas</span><span>{capacity}%</span></div><Progress value={capacity} /><dl><div><dt>Líder</dt><dd>{group.leader}</dd></div><div><dt>Anfitrião</dt><dd>{group.host}</dd></div><div><dt>Aprendiz</dt><dd>{group.apprentice}</dd></div></dl><button className="secondary full">Ver grupo <ChevronRight /></button></article> })}</div></>
}

function Discipleship({ labels, items }: { labels: AppLabels; items: typeof seedDiscipleships }) {
  return <><Intro title={`${labels.discipleship} · Discipulado inicial`} description="Sete encontros relacionais para apresentar Cristo, aprofundar a fé e discernir próximos passos." action={<button className="primary"><Plus /> Iniciar acompanhamento</button>} /><section className="root-layout"><div className="panel root-list"><div className="panel-title"><h2>Acompanhamentos</h2><Pill tone="green">{items.filter((item) => item.status === 'active').length} ativos</Pill></div>{items.map((item) => <article className="root-card" key={item.id}><div className="root-person"><i className="person-avatar">{initials(item.person)}</i><div><strong>{item.person}</strong><span>com {item.mentor}</span></div></div><div className="root-progress"><span>Encontro {item.meeting} de 7</span><Progress value={item.meeting / 7 * 100} /></div><div><Pill tone={item.status === 'completed' ? 'green' : 'blue'}>{item.status === 'completed' ? 'concluído' : 'ativo'}</Pill><small>{item.nextMeeting}</small></div><ChevronRight /></article>)}</div><div className="panel root-map"><span className="eyebrow">MAPA DOS ENCONTROS</span><h2>Uma base, não uma linha de chegada</h2>{discipleshipMeetings.map((meeting, index) => <div className="meeting-row" key={meeting}><span>{index + 1}</span><p>{meeting}</p></div>)}<p className="privacy-note"><HeartHandshake /> O discipulador acompanha; não controla decisões pessoais.</p></div></section></>
}

function Pastoral({ people, labels }: { people: Person[]; labels: AppLabels }) {
  return <><Intro title="Visão pastoral" description="Saúde, sobrecarga e pontos de atenção — sem ranking de líderes ou valor espiritual." /><section className="pastoral-metrics"><div className="panel"><span>Pessoas acompanhadas</span><strong>{people.length}</strong><small>no escopo selecionado</small></div><div className="panel"><span>Contatos no prazo</span><strong>86%</strong><small>meta saudável: acima de 80%</small></div><div className="panel"><span>Relações por discipulador</span><strong>2,0</strong><small>dentro do limite recomendado</small></div><div className="panel"><span>Encaminhamentos pastorais</span><strong>{people.filter((p) => p.pastoralFlag).length}</strong><small>restritos a pastores</small></div></section><section className="dashboard-grid"><div className="panel panel-pad"><div className="panel-title"><h2>Saúde por área</h2><Pill tone="green">Estável</Pill></div>{[[labels.reception, 82], [labels.table, 75], [labels.care, 86], [labels.group, 78], [labels.discipleship, 71]].map(([name, value]) => <div className="health-row" key={String(name)}><span>{name}</span><Progress value={Number(value)} /><strong>{value}%</strong></div>)}</div><div className="panel panel-pad"><div className="panel-title"><h2>Atenções da semana</h2></div><ul className="attention-list"><li><i className="amber-dot" /><div><strong>Um grupo próximo do limite</strong><p>Avaliar capacidade e aprendiz sem multiplicar cedo.</p></div></li><li><i className="blue-dot" /><div><strong>Dois contatos vencem hoje</strong><p>Redistribuir se houver sobrecarga.</p></div></li><li><i className="green-dot" /><div><strong>Implantação dentro do ritmo</strong><p>Semana 2 com 4 de 6 tarefas realizadas.</p></div></li></ul></div></section></>
}

function SettingsPage({ organization, setOrganization, labels, setLabels, congregations, setCongregations }: { organization: Organization; setOrganization: React.Dispatch<React.SetStateAction<Organization>>; labels: AppLabels; setLabels: React.Dispatch<React.SetStateAction<AppLabels>>; congregations: Congregation[]; setCongregations: React.Dispatch<React.SetStateAction<Congregation[]>> }) {
  return <><Intro title="Configurações da organização" description="Identidade própria, várias unidades e nomes adaptáveis sem perder os princípios de cuidado e proteção." /><section className="settings-layout"><div className="panel settings-nav"><button className="active"><Pencil /> Identidade e nomes</button><button><Users /> Equipe e permissões</button><button><House /> Unidades</button><button><ShieldCheck /> Privacidade e retenção</button><button><ClipboardCheck /> Auditoria</button></div><div className="panel settings-form"><span className="eyebrow">MARCA DA IGREJA</span><h2>Identidade da organização</h2><div className="two-fields"><Field label="Nome da igreja ou ministério" value={organization.name} onChange={(value) => setOrganization((current) => ({ ...current, name: value }))} /><Field label="Nome do programa" value={organization.ministryName} onChange={(value) => setOrganization((current) => ({ ...current, ministryName: value }))} /></div><div className="color-fields"><label><span>Cor principal</span><input type="color" value={organization.primaryColor} onChange={(event) => setOrganization((current) => ({ ...current, primaryColor: event.target.value }))} /></label><label><span>Cor de destaque</span><input type="color" value={organization.accentColor} onChange={(event) => setOrganization((current) => ({ ...current, accentColor: event.target.value }))} /></label></div><hr /><span className="eyebrow">NOMES DAS ÁREAS</span>{([['reception','Recepção e acolhimento'],['table','Encontro após o culto'],['care','Contato e acompanhamento'],['group','Pequenos grupos nos lares'],['discipleship','Discipulado inicial']] as Array<[keyof AppLabels,string]>).map(([key, title]) => <Field key={key} label={title} value={labels[key]} onChange={(value) => setLabels((current) => ({ ...current, [key]: value }))} />)}<hr /><div className="section-heading"><div><span className="eyebrow">UNIDADES</span><h2>Congregações da organização</h2></div><button className="secondary" onClick={() => setCongregations((current) => [...current, { id: crypto.randomUUID(), organizationId: organization.id, name: 'Nova unidade', city: 'Cidade · UF', active: true }])}><Plus /> Adicionar</button></div>{congregations.map((item) => <div className="congregation-edit" key={item.id}><input value={item.name} onChange={(event) => setCongregations((current) => current.map((existing) => existing.id === item.id ? { ...existing, name: event.target.value } : existing))} /><input value={item.city} onChange={(event) => setCongregations((current) => current.map((existing) => existing.id === item.id ? { ...existing, city: event.target.value } : existing))} /><Pill tone="green">ativa</Pill></div>)}<div className="save-row"><span><Check /> Alterações salvas automaticamente na demonstração</span><button className="primary">Salvar alterações</button></div></div></section></>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><div><input value={value} onChange={(event) => onChange(event.target.value)} /><Pencil /></div></label> }

function AddPerson({ organization, congregations, close, save }: { organization: Organization; congregations: Congregation[]; close: () => void; save: (person: Person) => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [unit, setUnit] = useState(congregations[0]?.id ?? ''); const [consent, setConsent] = useState(true)
  function submit(event: React.FormEvent) { event.preventDefault(); if (!name.trim()) return; save({ id: crypto.randomUUID(), organizationId: organization.id, congregationId: unit, name: name.trim(), phone: consent ? phone : '', firstVisit: new Date().toISOString().slice(0,10), consent, stage: consent ? 'contact_authorized' : 'new', owner: 'Sem responsável', nextAction: consent ? 'Enviar primeira mensagem em até 48h' : 'Acolher na próxima visita', dueLabel: consent ? 'Em até 48h' : 'Próximo encontro', visits: 1 }) }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">NOVO CADASTRO</span><h2>Adicionar pessoa</h2></div><button type="button" onClick={close}><X /></button></div><p className="modal-intro">Registre somente o necessário. Informações íntimas não pertencem a este cadastro.</p><Field label="Nome" value={name} onChange={setName} /><label className="field"><span>Unidade</span><select value={unit} onChange={(event) => setUnit(event.target.value)}>{congregations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label><Field label="WhatsApp" value={phone} onChange={setPhone} /><label className="consent-box"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>Autorizou contato durante a semana</strong><small>Opcional e revogável.</small></span></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary"><Plus /> Adicionar</button></div></form></div>
}

function PersonSheet({ person, labels, congregationName, close }: { person: Person; labels: AppLabels; congregationName: (id: string) => string; close: () => void }) {
  return <div className="modal-backdrop sheet-backdrop" onMouseDown={close}><aside className="person-sheet" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><span className="eyebrow">VISÃO DA PESSOA</span><button onClick={close}><X /></button></div><div className="person-profile"><i className="large-avatar">{initials(person.name)}</i><h2>{person.name}</h2><Pill tone={person.stage === 'discipleship_active' ? 'green' : 'amber'}>{stageLabels[person.stage]}</Pill><p>{congregationName(person.congregationId)}</p></div><div className="sheet-section"><h3>Próximo cuidado</h3><div className="next-care"><Clock3 /><div><strong>{person.nextAction}</strong><span>{person.dueLabel} · {person.owner}</span></div></div></div><div className="sheet-section"><h3>Informações operacionais</h3><dl><div><dt>Primeira visita</dt><dd>{new Date(`${person.firstVisit}T12:00`).toLocaleDateString('pt-BR')}</dd></div><div><dt>Visitas</dt><dd>{person.visits}</dd></div><div><dt>Contato</dt><dd>{person.consent ? person.phone : 'Não autorizado'}</dd></div></dl></div><div className="sheet-section"><h3>Próximos passos</h3>{[[HeartHandshake,'Registrar cuidado','Contato, retorno ou encaminhamento'],[House,`Convidar para ${labels.group}`,'Encontrar um grupo adequado'],[Leaf,`Iniciar ${labels.discipleship}`,'Definir discipulador e encontro']].map(([Icon,title,sub]) => { const I = Icon as typeof Leaf; return <button className="sheet-action" key={String(title)}><I /><span><strong>{String(title)}</strong><small>{String(sub)}</small></span><ChevronRight /></button> })}</div><p className="privacy-note"><ShieldCheck /> Acesso e alterações ficam registrados na auditoria.</p></aside></div>
}

export default App
