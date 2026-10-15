import { useState } from 'react'
import { BarChart3, ShieldCheck } from 'lucide-react'
import type { AppLocale } from './i18n'
import type { JourneyAccessContext, JourneyPersonRecord } from './journeyRepository'
import { listPresenceChecks, listPresenceSessions } from './journeyRepository'
import { calculateVerifiedFrequency, type VerifiedFrequency } from './verifiedFrequency'
import './VerifiedFrequencyPanel.css'

const typeNames: Record<AppLocale, Record<string, string>> = {
  'pt-BR': {general:'Encontros habituais',sunday:'Cultos de domingo',midweek:'Cultos da semana',youth:'Encontros de jovens',special:'Eventos especiais'},
  en: {general:'Regular gatherings',sunday:'Sunday services',midweek:'Midweek services',youth:'Youth gatherings',special:'Special events'},
  es: {general:'Encuentros habituales',sunday:'Cultos dominicales',midweek:'Cultos semanales',youth:'Encuentros juveniles',special:'Eventos especiales'},
}

export function VerifiedFrequencyPanel({access,person,locale}: {
  access: JourneyAccessContext
  person: JourneyPersonRecord
  locale: AppLocale
}) {
  const [opened,setOpened]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [summaries,setSummaries]=useState<VerifiedFrequency[]>([])
  const [truncated,setTruncated]=useState(false)
  const canRead=access.canManagePresence
  if (!canRead) return null

  const text=locale==='en'
    ? {title:'Verified attendance',desc:'Attendance by gathering type, not a spiritual score. Unknown is never an absence.',
      view:'Calculate recent attendance',loading:'Checking verified sessions…',present:'Present',absent:'Absent',
      unverified:'Not verified',low:'Insufficient session coverage',legacy:'Legacy sessions without eligible roster',
      denominator:'Verified eligible sessions',sample:'Most recent 20 closed sessions in this campus',
      noRate:'Not enough verified evidence',rate:'Attendance among verified checks',error:'Could not read attendance evidence.',
      truncated:'More sessions exist; this is a limited recent sample.'}
    :locale==='es'
      ? {title:'Asistencia verificada',desc:'Asistencia por tipo de encuentro, no una calificación espiritual. Lo no verificado nunca es ausencia.',
        view:'Calcular asistencia reciente',loading:'Revisando sesiones verificadas…',present:'Presente',absent:'Ausente',
        unverified:'No verificado',low:'Cobertura insuficiente',legacy:'Sesiones antiguas sin lista elegible',
        denominator:'Sesiones elegibles verificadas',sample:'Últimas 20 sesiones cerradas de esta sede',
        noRate:'Evidencia insuficiente',rate:'Asistencia entre verificaciones',error:'No se pudo consultar la evidencia.',
        truncated:'Hay más sesiones; este es un resumen reciente limitado.'}
      : {title:'Frequência verificada',desc:'Presença por tipo de culto, não uma nota espiritual. Não verificado nunca é ausência.',
        view:'Calcular frequência recente',loading:'Conferindo sessões verificadas…',present:'Presente',absent:'Ausente',
        unverified:'Não verificado',low:'Cobertura insuficiente',legacy:'Sessões legadas sem lista elegível',
        denominator:'Sessões elegíveis verificadas',sample:'Últimas 20 sessões encerradas desta unidade',
        noRate:'Evidência verificada insuficiente',rate:'Presença entre verificações',error:'Não foi possível consultar as evidências.',
        truncated:'Há mais sessões; este é um recorte recente limitado.'}

  const load=async()=>{
    setLoading(true);setError('');setOpened(true)
    try{
      const allSessions=await listPresenceSessions(access.organizationId, person.congregationId)
      const closed=allSessions.filter(session=>Boolean(session.closedAt)).slice(0,20)
      const checks=await Promise.all(closed.map(session=>
        listPresenceChecks(access.organizationId,person.congregationId,session.id)))
      const types=[...new Set(closed.map(session=>session.eventTypeId || 'general'))]
      const summaries=types.map(eventTypeId=>calculateVerifiedFrequency({
        organizationId:access.organizationId,personId:person.id,eventTypeId,
        sessions:closed,checks:checks.flat(),
      }))
      setSummaries(summaries)
      setTruncated(allSessions.filter(session=>Boolean(session.closedAt)).length>20)
    }catch(cause){
      console.error('Verified frequency unavailable',cause)
      setError(text.error)
    }finally{setLoading(false)}
  }

  return <section className="journey-frequency-panel" aria-label={text.title}>
    <div className="journey-frequency-intro"><BarChart3 size={21}/><div><h2>{text.title}</h2><p>{text.desc}</p></div></div>
    <button type="button" className="journey-frequency-button" disabled={loading} onClick={()=>void load()}>{loading?text.loading:text.view}</button>
    {error?<p role="alert" className="journey-frequency-error">{error}</p>:null}
    {opened&&!loading&&!error?<div className="journey-frequency-result">
      <small>{text.sample}</small>
      {summaries.length?summaries.map(item=><article key={item.eventTypeId}>
        <div><strong>{typeNames[locale][item.eventTypeId]||item.eventTypeId}</strong><b>{item.ratePercent===null?text.noRate:item.ratePercent.toLocaleString(locale)+'%'}</b></div>
        <p>{text.rate} · {text.denominator}: {item.verifiedSessions}</p>
        <dl><div><dt>{text.present}</dt><dd>{item.confirmedPresent}</dd></div><div><dt>{text.absent}</dt><dd>{item.confirmedAbsent}</dd></div><div><dt>{text.unverified}</dt><dd>{item.unverifiedSessions}</dd></div><div><dt>{text.low}</dt><dd>{item.lowCoverageSessions}</dd></div><div><dt>{text.legacy}</dt><dd>{item.legacyWithoutEligibility}</dd></div></dl>
      </article>):<p>{text.noRate}</p>}
      {truncated?<p>{text.truncated}</p>:null}
      <p className="journey-frequency-source"><ShieldCheck size={14}/>{text.desc}</p>
    </div>:null}
  </section>
}
