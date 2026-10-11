import { useEffect, useState } from 'react'
import { ArrowRight, HandHeart, ShieldCheck } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { getInitialLocale, type AppLocale } from './i18n'
import { SERVICE_WORK_FRONTS, SERVICE_FRONT_LABELS, type WorkFront } from './journeyServiceTeams'
import './SupportPage.css'

const descriptions:Record<AppLocale,Record<WorkFront,string>>={
  'pt-BR':{
    presence:'Ajudar na recepção, organização e acolhimento.',
    table:'Apoiar a preparação do ambiente e a hospitalidade.',
    care:'Colaborar em tarefas autorizadas, sem consultar dados privados.',
    house:'Auxiliar na logística e na organização dos encontros.',
    discipleship:'Apoiar materiais, preparação e organização, sem assumir discipulado.',
  },
  en:{
    presence:'Help with welcome, organization and hospitality.',
    table:'Help prepare the space and welcome guests.',
    care:'Help with assigned tasks without reading confidential records.',
    house:'Support meeting logistics and organization.',
    discipleship:'Help with supplies and preparation without becoming a discipler.',
  },
  es:{
    presence:'Apoyar la recepción, organización y bienvenida.',
    table:'Ayudar con el ambiente y la hospitalidad.',
    care:'Colaborar en tareas autorizadas sin consultar datos privados.',
    house:'Ayudar con la logística de los encuentros.',
    discipleship:'Apoyar materiales y preparación sin asumir el discipulado.',
  },
}

export default function SupportPage(){
  const locale=getInitialLocale()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [busy,setBusy]=useState(true)
  useEffect(()=>{
    let disposed=false
    const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
    if(!user||!organizationId){setBusy(false);return}
    void loadJourneyAccess(user.uid,organizationId).then(value=>{if(!disposed)setAccess(value)})
      .catch(()=>{if(!disposed)setAccess(null)})
      .finally(()=>{if(!disposed)setBusy(false)})
    return()=>{disposed=true}
  },[])
  const t=locale==='en'
    ?{title:'General Support',subtitle:'Serve wherever help is needed, without assuming leadership.',waiting:'Preparing your team…',restricted:'Your account does not have a support assignment.',available:'Available to help',noLeadership:'Availability never gives leadership or access to private records.',next:'Next step',nextBody:'Arrange the specific task with the responsible team leader. This page shows availability; assignments must be authorized separately.',today:'Back to Today',team:'Manage team'}
    :locale==='es'
      ?{title:'Apoyo General',subtitle:'Ayuda donde se necesita sin asumir liderazgo.',waiting:'Preparando tu equipo…',restricted:'Tu cuenta no tiene una asignación de apoyo.',available:'Disponible para ayudar',noLeadership:'La disponibilidad no concede liderazgo ni acceso a datos privados.',next:'Siguiente paso',nextBody:'Acuerda la tarea con el responsable del equipo. Esta página muestra disponibilidad; las tareas se autorizan por separado.',today:'Volver a Hoy',team:'Gestionar equipo'}
      :{title:'Apoio Geral',subtitle:'Servir onde for preciso, sem assumir liderança.',waiting:'Preparando sua equipe…',restricted:'Esta conta ainda não tem uma designação de apoio.',available:'Disponível para apoiar',noLeadership:'A disponibilidade não concede liderança nem acesso a dados privados.',next:'Próximo passo',nextBody:'Combine a tarefa específica com o responsável pela frente. Aqui mostramos disponibilidade; cada atividade precisa de uma atribuição autorizada.',today:'Voltar para Hoje',team:'Gerenciar equipe'}
  const team=access?.nestJourneyTeam
  const isManager=Boolean(access&&(access.isOwner||access.isSystemAdmin||['owner','admin'].includes(access.organizationRole)))
  const hasSupport=Boolean(team&&(team.primaryArea==='support'||team.supportAreas.length>0))
  const supportAreas=team?.supportAreas.length?team.supportAreas:team?.primaryArea==='support'?SERVICE_WORK_FRONTS:[]
  return <main className="journey-support-page">
    <div className="journey-support-shell">
      <header><span className="journey-support-kicker">NestJourney / {t.title}</span><h1><HandHeart size={26}/>{t.title}</h1><p>{t.subtitle}</p></header>
      {busy?<p>{t.waiting}</p>:!hasSupport&&!isManager?<section className="journey-support-empty"><ShieldCheck size={22}/><strong>{t.restricted}</strong><a href="/my-today">{t.today}<ArrowRight size={14}/></a></section>:<>
        <section className="journey-support-info"><ShieldCheck size={21}/><p>{t.noLeadership}</p></section>
        <h2>{t.available}</h2>
        <div className="journey-support-grid">
          {(isManager&&!hasSupport?SERVICE_WORK_FRONTS:supportAreas).map(front=><article key={front}>
            <strong>{SERVICE_FRONT_LABELS[locale][front]}</strong><p>{descriptions[locale][front]}</p>
          </article>)}
        </div>
        <section className="journey-support-next"><strong>{t.next}</strong><p>{t.nextBody}</p>
          <a href={isManager?'/team-runtime':'/my-today'}>{isManager?t.team:t.today}<ArrowRight size={14}/></a>
        </section>
      </>}
    </div>
  </main>
}
