import { ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react'
import type { AppLocale } from './i18n'
import './AccessDeniedState.css'

const copy: Record<AppLocale, {kicker:string;home:string;help:string}> = {
  'pt-BR': { kicker:'Acesso deste papel', home:'Voltar ao Hoje', help:'Entender meu acesso' },
  en: { kicker:'Role access', home:'Back to Today', help:'Understand my access' },
  es: { kicker:'Acceso de este papel', home:'Volver a Hoy', help:'Entender mi acceso' },
}

export function AccessDeniedState({
  locale,
  title,
  body,
  retryLabel,
  onRetry,
}: {
  locale: AppLocale
  title: string
  body: string
  retryLabel?: string
  onRetry?: () => void
}) {
  const t=copy[locale]
  return <section className="access-denied-state">
    <span className="access-denied-icon"><ShieldCheck size={23}/></span>
    <div className="access-denied-copy">
      <span>{t.kicker}</span>
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
    <div className="access-denied-actions">
      <a className="primary" href="/my-today">{t.home}<ArrowRight size={14}/></a>
      <a href="/help">{t.help}</a>
      {onRetry&&retryLabel?<button type="button" onClick={onRetry}><RefreshCw size={14}/>{retryLabel}</button>:null}
    </div>
  </section>
}
