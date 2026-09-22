import { ArrowRight } from 'lucide-react'
import type { AppLocale } from './i18n'
import './JourneyAreaFocus.css'

export type JourneyAreaFocusMetric = {
  label:string
  value:string | number
  tone?:'attention'|'good'|'muted'
}

export type JourneyAreaFocusAction = {
  label:string
  href?:string
  onClick?:()=>void
  disabled?:boolean
  primary?:boolean
}

const nowLabel:Record<AppLocale,string>={
  'pt-BR':'Agora',
  en:'Now',
  es:'Ahora',
}

export function JourneyAreaFocus({
  locale,
  title,
  body,
  context,
  metrics=[],
  actions=[],
}:{
  locale:AppLocale
  title:string
  body:string
  context?:string
  metrics?:JourneyAreaFocusMetric[]
  actions?:JourneyAreaFocusAction[]
}){
  return <section className="journey-area-focus">
    <div className="journey-area-focus-copy">
      <span className="journey-area-focus-kicker">{context||nowLabel[locale]}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>

    {metrics.length?<div className="journey-area-focus-metrics">
      {metrics.map(metric=><div className={metric.tone?'journey-area-focus-metric '+metric.tone:'journey-area-focus-metric'} key={metric.label}>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
      </div>)}
    </div>:null}

    {actions.length?<div className="journey-area-focus-actions">
      {actions.map((action,index)=>{
        const className=action.primary?'journey-area-focus-action primary':'journey-area-focus-action'
        if(action.href)return <a className={className} href={action.href} key={action.label+'-'+index}>{action.label}<ArrowRight size={13}/></a>
        return <button className={className} disabled={action.disabled} onClick={action.onClick} key={action.label+'-'+index}>{action.label}{action.primary?<ArrowRight size={13}/>:null}</button>
      })}
    </div>:null}
  </section>
}
