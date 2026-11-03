import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCw, WifiOff } from 'lucide-react'
import type { AppLocale } from './i18n'
import './JourneyLoadState.css'

type Copy = { loading:string; slow:string; error:string; offline:string; retry:string; back:string; hint:string }
const copy:Record<AppLocale,Copy>={
  'pt-BR':{
    loading:'Buscando as informações da sua congregação…',
    slow:'A consulta está demorando mais que o normal. Você pode tentar novamente.',
    error:'Não foi possível abrir esta área agora.',
    offline:'Seu aparelho está sem conexão. Reconecte-se para consultar os dados.',
    retry:'Tentar novamente',back:'Voltar ao início',
    hint:'Nenhum cadastro foi alterado. Se continuar acontecendo, confira a conexão e o acesso à congregação.',
  },
  en:{
    loading:'Loading information for your congregation…',
    slow:'This is taking longer than expected. You can retry.',
    error:'This area could not be opened right now.',
    offline:'Your device is offline. Reconnect to access the data.',
    retry:'Try again',back:'Back to home',
    hint:'No records were changed. If this continues, check your connection and campus access.',
  },
  es:{
    loading:'Cargando los datos de tu congregación…',
    slow:'La consulta está tardando más de lo normal. Puedes volver a intentarlo.',
    error:'No se pudo abrir esta área ahora.',
    offline:'Tu dispositivo no tiene conexión. Conéctate para consultar los datos.',
    retry:'Intentar de nuevo',back:'Volver al inicio',
    hint:'No se modificó ningún registro. Si continúa, revisa la conexión y tu acceso a la sede.',
  },
}

export function JourneyLoadState({locale,title,phase,slow=false,onRetry}:{
  locale:AppLocale
  title:string
  phase:'loading'|'error'
  slow?:boolean
  onRetry:()=>void
}){
  const t=copy[locale]
  const offline=typeof navigator!=='undefined'&&navigator.onLine===false
  const failed=phase==='error'
  const Icon=offline?WifiOff:failed?AlertTriangle:LoaderCircle
  return <main className="journey-load-page">
    <section className="journey-load-card" role={failed?'alert':'status'} aria-live="polite">
      <span className="journey-load-icon"><Icon size={25} className={!failed&&!offline?'journey-load-spinner':undefined}/></span>
      <div className="journey-load-content">
        <span className="journey-load-eyebrow">NestJourney</span>
        <h1>{title}</h1>
        <p>{offline?t.offline:failed?t.error:slow?t.slow:t.loading}</p>
        {(failed||slow)&&<small>{t.hint}</small>}
      </div>
      {(failed||slow||offline)&&<div className="journey-load-actions">
        <button type="button" onClick={onRetry}><RefreshCw size={16}/>{t.retry}</button>
        <a href="/my-today"><ArrowLeft size={16}/>{t.back}</a>
      </div>}
    </section>
  </main>
}
