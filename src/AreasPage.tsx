import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, HeartHandshake, House, Leaf, ShieldCheck, UserCheck, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { canOpenJourneyArea } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { JourneyPath } from './JourneyPath'
import { emptyGuidance } from './emptyGuidance'
import './JourneySectionPages.css'

const copy={
  'pt-BR':{
    title:'Jornada',subtitle:'O cuidado segue um caminho simples. Entre direto na etapa que faz parte da sua responsabilidade.',
    loading:'Preparando suas áreas…', noAccess:'Seu perfil ainda não possui uma área operacional atribuída.',
    available:'Disponível para você', restricted:'Sem acesso neste papel', open:'Abrir área',
    presence:'Presença',presenceDesc:'Próximo culto, sessão, visitantes, confirmação de presença e vínculo.',
    table:'Mesa Aberta',tableDesc:'Preparação, convidados e registro de quem participou da Mesa.',
    care:'Cuidado & Conexão',careDesc:'Contatos atribuídos, prazo de 24–48h, resultado e próximo passo.',
    groups:'Casas de Paz',groupsDesc:'Encontros, participantes, convidados, capacidade e operação da Casa.',
    root:'Raiz',rootDesc:'Pessoas acompanhadas, encontro 1–7 e próximo passo do discipulado.',
    principle:'Você não precisa conhecer o sistema inteiro. O NestJourney mostra somente o que o seu papel pode operar.',
  },
  en:{
    title:'Journey',subtitle:'Care follows a simple path. Go straight to the step that belongs to your responsibility.',
    loading:'Preparing your areas…', noAccess:'Your profile does not have an operational area assigned yet.',
    available:'Available to you', restricted:'Not available for this role', open:'Open area',
    presence:'Presence',presenceDesc:'Next service, session, visitors, attendance confirmation, and relationship.',
    table:'Open Table',tableDesc:'Preparation, guests, and recording who joined the Table.',
    care:'Care & Connection',careDesc:'Assigned contacts, 24–48h promise, outcome, and next step.',
    groups:'Peace Houses',groupsDesc:'Meetings, participants, guests, capacity, and house operations.',
    root:'Root',rootDesc:'People you disciple, meeting 1–7, and the next discipleship step.',
    principle:'You do not need to understand the whole system. NestJourney shows only what your role can operate.',
  },
  es:{
    title:'Jornada',subtitle:'El cuidado sigue un camino simple. Entra directamente en la etapa que pertenece a tu responsabilidad.',
    loading:'Preparando tus áreas…', noAccess:'Tu perfil todavía no tiene un área operativa asignada.',
    available:'Disponible para ti', restricted:'Sin acceso en este papel', open:'Abrir área',
    presence:'Presencia',presenceDesc:'Próximo culto, sesión, visitantes, confirmación de presencia y vínculo.',
    table:'Mesa Abierta',tableDesc:'Preparación, invitados y registro de quién participó de la Mesa.',
    care:'Cuidado & Conexión',careDesc:'Contactos asignados, plazo de 24–48h, resultado y próximo paso.',
    groups:'Casas de Paz',groupsDesc:'Encuentros, participantes, invitados, capacidad y operación de la Casa.',
    root:'Raíz',rootDesc:'Personas acompañadas, encuentro 1–7 y próximo paso del discipulado.',
    principle:'No necesitas conocer todo el sistema. NestJourney muestra solamente lo que tu papel puede operar.',
  }
} as const

export default function AreasPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const base=copy[locale]
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

  const names=useMemo(()=>({
    presence:labels.presence||base.presence,
    mesa:labels.table||base.table,
    care:labels.care||base.care,
    groups:labels.groups||base.groups,
    discipleship:labels.discipleship||base.root,
  }),[labels,base])

  if(loading)return <main className="journey-section-page"><div className="journey-loading">{base.loading}</div></main>
  if(!access)return <main className="journey-section-page"><div className="journey-no-access"><ShieldCheck size={32}/><p>{base.noAccess}</p></div></main>

  const modules=[
    {id:'presence' as const,title:names.presence,description:base.presenceDesc,href:'/presence-assist',Icon:UserCheck},
    {id:'mesa' as const,title:names.mesa,description:base.tableDesc,href:'/mesa-runtime',Icon:UsersRound},
    {id:'care' as const,title:names.care,description:base.careDesc,href:'/care-integrity',Icon:HeartHandshake},
    {id:'groups' as const,title:names.groups,description:base.groupsDesc,href:'/groups-runtime',Icon:House},
    {id:'discipleship' as const,title:names.discipleship,description:base.rootDesc,href:'/discipleship-runtime',Icon:Leaf},
  ]

  const visibleModules=modules.filter(item=>canOpenJourneyArea(access,item.id))
  const hasOperationalArea=visibleModules.length>0
  const empty=emptyGuidance(locale,'areas_none')

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Journey</span><h1>{base.title}</h1><p>{base.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>

    <JourneyPath locale={locale}/>

    {!hasOperationalArea?<section className="journey-section-block"><GuidedEmptyState icon={ShieldCheck} title={empty.title} body={empty.body} primary={{label:empty.primary,href:'/help'}} secondary={{label:empty.secondary||base.title,href:'/my-today'}}/></section>:null}

    {hasOperationalArea?<section className="journey-flow-list" aria-label={base.title}>
      {visibleModules.map((item,index)=>{
        const Icon=item.Icon
        return <a key={item.id} href={item.href}>
          <span className="journey-flow-step">{String(index+1).padStart(2,'0')}</span>
          <span className="journey-flow-icon"><Icon size={18}/></span>
          <span className="journey-flow-copy"><small>{base.available}</small><strong>{item.title}</strong><p>{item.description}</p></span>
          <ArrowRight size={16}/>
        </a>
      })}
    </section>:null}

    <div className="journey-section-note"><ShieldCheck size={18}/><p>{base.principle}</p></div>
  </div></main>
}
