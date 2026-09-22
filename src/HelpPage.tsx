import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, HeartHandshake, House, Leaf, ShieldCheck, UserCheck, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { canViewJourneyPeople, canViewJourneyVision, resolveJourneyResponsibility, type JourneyResponsibility } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import './JourneySectionPages.css'

const roleCopy:Record<AppLocale,Record<JourneyResponsibility,{title:string;focus:string}>>={
  'pt-BR':{
    presence_host:{title:'Anfitrião de Presença',focus:'Receba pessoas, abra/acompanhe a sessão do culto, confirme presença e registre visitantes e vínculos reais.'},
    mesa_team:{title:'Equipe da Mesa',focus:'Prepare a Mesa, acompanhe convidados e registre quem foi convidado e quem realmente participou.'},
    caregiver:{title:'Cuidador',focus:'Comece pelos contatos atribuídos, respeite o prazo de 24–48h e registre somente resultado e próximo passo.'},
    group_leader:{title:'Líder de Casa',focus:'Cuide da sua Casa, participantes, pedidos de entrada, capacidade e próximos encontros.'},
    discipler:{title:'Discipulador',focus:'Veja quem você acompanha, o encontro atual de 1 a 7 e o próximo passo combinado.'},
    coordinator:{title:'Coordenador',focus:'Olhe pendências, distribuição de carga, itens sem responsável e a qualidade operacional da sua área.'},
    pastor:{title:'Pastor',focus:'Priorize Care Debt, encaminhamentos pastorais e jornadas que precisam de decisão ou cuidado pastoral.'},
    admin:{title:'Dono / Administrador',focus:'Você pode acompanhar a operação inteira, equipes, implantação, relatórios e configurações da organização.'},
    ceo:{title:'CEO MillionsNest',focus:'Comece por Hoje para ler o pulso do ecossistema. Use Visão para aprofundar organizações e o seletor de acesso para visualizar cada responsabilidade com segurança.'},
    member:{title:'Usuário',focus:'Seu acesso ainda não tem uma responsabilidade operacional atribuída. Fale com um administrador da organização.'},
  },
  en:{
    presence_host:{title:'Presence Host',focus:'Welcome people, open/follow the service session, confirm attendance, and record real visitors and relationships.'},
    mesa_team:{title:'Table Team',focus:'Prepare the Table, follow guests, and record who was invited and who actually joined.'},
    caregiver:{title:'Caregiver',focus:'Start with assigned contacts, respect the 24–48h promise, and record only the outcome and next step.'},
    group_leader:{title:'House Leader',focus:'Care for your group, participants, entry requests, capacity, and next meetings.'},
    discipler:{title:'Discipler',focus:'See the people you accompany, the current meeting from 1 to 7, and the agreed next step.'},
    coordinator:{title:'Coordinator',focus:'Watch pending work, workload distribution, unassigned items, and operational quality.'},
    pastor:{title:'Pastor',focus:'Prioritize Care Debt, pastoral handoffs, and journeys that need a pastoral decision or care.'},
    admin:{title:'Owner / Administrator',focus:'You can follow the whole organization operation, teams, implementation, reports, and settings.'},
    ceo:{title:'MillionsNest CEO',focus:'Start in Today to read the ecosystem pulse. Use Vision to go deeper across organizations and the access switcher to safely view each responsibility experience.'},
    member:{title:'User',focus:'Your access does not have an operational responsibility yet. Ask an organization administrator.'},
  },
  es:{
    presence_host:{title:'Anfitrión de Presencia',focus:'Recibe personas, abre/acompaña la sesión del culto, confirma presencia y registra visitantes y vínculos reales.'},
    mesa_team:{title:'Equipo de la Mesa',focus:'Prepara la Mesa, acompaña invitados y registra quién fue invitado y quién realmente participó.'},
    caregiver:{title:'Cuidador',focus:'Empieza por los contactos asignados, respeta el plazo de 24–48h y registra solo resultado y próximo paso.'},
    group_leader:{title:'Líder de Casa',focus:'Cuida tu Casa, participantes, solicitudes de entrada, capacidad y próximos encuentros.'},
    discipler:{title:'Discipulador',focus:'Ve a quién acompañas, el encuentro actual del 1 al 7 y el próximo paso acordado.'},
    coordinator:{title:'Coordinador',focus:'Observa pendientes, distribución de carga, elementos sin responsable y calidad operativa.'},
    pastor:{title:'Pastor',focus:'Prioriza Care Debt, derivaciones pastorales y jornadas que necesitan decisión o cuidado pastoral.'},
    admin:{title:'Dueño / Administrador',focus:'Puedes acompañar toda la operación, equipos, implementación, informes y configuración de la organización.'},
    ceo:{title:'CEO MillionsNest',focus:'Empieza en Hoy para leer el pulso del ecosistema. Usa Visión para profundizar por organización y el selector de acceso para visualizar cada responsabilidad con seguridad.'},
    member:{title:'Usuario',focus:'Tu acceso todavía no tiene una responsabilidad operativa asignada. Habla con un administrador.'},
  }
}

const copy={
  'pt-BR':{title:'Ajuda',subtitle:'Você não precisa aprender o NestJourney inteiro. Comece pelo seu papel e pela próxima ação.',yourRole:'Seu papel agora',flow:'Como se orientar',today:'1. Hoje',todayDesc:'Abra primeiro. É o seu centro de ações e mostra somente o que realmente precisa de você agora.',people:'2. Pessoas',peopleDesc:'Use quando precisar encontrar alguém ou entender seu histórico permitido.',areas:'3. Jornada',areasDesc:'Veja o caminho do cuidado e entre somente na etapa onde você serve: Presença, Mesa, Cuidado, Casas ou Raiz.',vision:'4. Visão',visionDesc:'Para coordenação e liderança: aprofunde pontos de atenção e saúde operacional.',more:'5. Gestão',moreDesc:'Equipe, implantação, relatórios, privacidade, histórico administrativo e configurações.',principle:'O NestJourney acompanha pessoas sem transformá-las em pontuação. Registre fatos, próximos passos e cuidado real.'},
  en:{title:'Help',subtitle:'You do not need to learn all of NestJourney. Start with your responsibility and the next action.',yourRole:'Your current role',flow:'How to navigate',today:'1. Today',todayDesc:'Open this first. It is your action center and shows only what truly needs you now.',people:'2. People',peopleDesc:'Use it to find someone or understand their permitted journey history.',areas:'3. Journey',areasDesc:'See the care path and open only the step where you serve: Presence, Table, Care, Houses, or Root.',vision:'4. Vision',visionDesc:'For coordinators and leaders: go deeper on attention points and operational health.',more:'5. Management',moreDesc:'Team, implementation, reports, privacy, administrative history, and settings.',principle:'NestJourney follows people without turning them into scores. Record facts, next steps, and real care.'},
  es:{title:'Ayuda',subtitle:'No necesitas aprender todo NestJourney. Empieza por tu responsabilidad y la próxima acción.',yourRole:'Tu papel actual',flow:'Cómo orientarte',today:'1. Hoy',todayDesc:'Ábrelo primero. Es tu centro de acciones y muestra solo lo que realmente necesita de ti ahora.',people:'2. Personas',peopleDesc:'Úsalo para encontrar a alguien o entender su historial permitido.',areas:'3. Jornada',areasDesc:'Mira el camino de cuidado y entra solo en la etapa donde sirves: Presencia, Mesa, Cuidado, Casas o Raíz.',vision:'4. Visión',visionDesc:'Para coordinación y liderazgo: profundiza en puntos de atención y salud operativa.',more:'5. Gestión',moreDesc:'Equipo, implementación, informes, privacidad, historial administrativo y configuración.',principle:'NestJourney acompaña personas sin convertirlas en puntuaciones. Registra hechos, próximos pasos y cuidado real.'},
} as const

export default function HelpPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const {labels}=useJourneyLabels()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [loading,setLoading]=useState(true)
  const bootstrap=useCallback(async()=>{
    setLoading(true)
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      setAccess(await loadJourneyAccess(user.uid,organizationId))
    }finally{setLoading(false)}
  },[])
  useEffect(()=>{void bootstrap()},[bootstrap])
  const responsibility=useMemo(()=>access?resolveJourneyResponsibility(access):'member',[access])
  const role=roleCopy[locale][responsibility]
  if(loading)return <main className="journey-section-page"><div className="journey-loading">NestJourney…</div></main>
  const areaNames=[labels.presence||'Presença',labels.table||'Mesa Aberta',labels.care||'Cuidado & Conexão',labels.groups||'Casas de Paz',labels.discipleship||'Raiz'].join(' · ')
  const cards=[
    {title:t.today,desc:t.todayDesc,href:'/my-today',Icon:UserCheck},
    access&&canViewJourneyPeople(access)?{title:t.people,desc:t.peopleDesc,href:'/journey-profile',Icon:UsersRound}:null,
    {title:t.areas,desc:`${t.areasDesc} ${areaNames}`,href:'/areas',Icon:HeartHandshake},
    access&&canViewJourneyVision(access)?{title:t.vision,desc:t.visionDesc,href:'/vision',Icon:House}:null,
    {title:t.more,desc:t.moreDesc,href:'/more',Icon:Leaf},
  ].filter(Boolean) as Array<{title:string;desc:string;href:string;Icon:typeof UserCheck}>
  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Help</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    <section className="journey-section-note"><BookOpen size={18}/><p><strong>{t.yourRole}: {role.title}.</strong> {role.focus}</p></section>
    <section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.flow}</span><h2>{t.flow}</h2></div></header><div className="journey-card-grid">{cards.map(item=>{const Icon=item.Icon;return <a className="journey-card" href={item.href} key={item.title}><span className="journey-card-icon"><Icon size={19}/></span><span className="journey-card-copy"><strong>{item.title}</strong><p>{item.desc}</p></span><ArrowRight size={16}/></a>})}</div></section>
    <div className="journey-section-note"><ShieldCheck size={18}/><p>{t.principle}</p></div>
  </div></main>
}
