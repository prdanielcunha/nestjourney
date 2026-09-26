import type { AppLocale } from './i18n'
import './JourneyPath.css'

const copy={
  'pt-BR':{
    title:'Jornada de cuidado',
    note:'Uma trilha, não uma esteira. O próximo passo nasce de vínculo, abertura e cuidado real.',
    steps:['Culto','Mesa Aberta','Cuidado','Casa de Paz','Raiz','Vida & Serviço','Multiplicação'],
  },
  en:{
    title:'Care journey',
    note:'A path, not a conveyor belt. The next step grows from relationship, openness, and real care.',
    steps:['Service','Open Table','Care','Peace House','Root','Life & Service','Multiplication'],
  },
  es:{
    title:'Jornada de cuidado',
    note:'Un camino, no una cinta transportadora. El próximo paso nace de vínculo, apertura y cuidado real.',
    steps:['Culto','Mesa Abierta','Cuidado','Casa de Paz','Raíz','Vida y Servicio','Multiplicación'],
  },
} as const

export function inferJourneyStep(input:{
  stage?:string
  hasGroup?:boolean
  hasDiscipleship?:boolean
}){
  if(input.hasDiscipleship||input.stage==='discipleship_active')return 4
  if(input.hasGroup||input.stage==='group_connected')return 3
  if(input.stage==='care_done'||input.stage==='contact_authorized')return 2
  if(input.stage==='integrated')return 5
  return 0
}

export function JourneyPath({locale,currentStep,compact=false,steps}:{locale:AppLocale;currentStep?:number;compact?:boolean;steps?:string[]}){
  const t=copy[locale]
  const visibleSteps=steps?.filter(Boolean).slice(0,20)??[]
  const pathSteps=visibleSteps.length?visibleSteps:t.steps
  return <section className={'journey-path '+(compact?'compact':'')} aria-label={t.title}>
    <div className="journey-path-head"><strong>{t.title}</strong><span>{t.note}</span></div>
    <div className="journey-path-track">
      {pathSteps.map((step,index)=>{
        const known=typeof currentStep==='number'
        const state=!known?'neutral':index===currentStep?'current':index<currentStep?'before':'after'
        return <div className={'journey-path-step '+state} key={step}>
          <span className="journey-path-dot" aria-hidden="true"/>
          <b>{step}</b>
        </div>
      })}
    </div>
  </section>
}
