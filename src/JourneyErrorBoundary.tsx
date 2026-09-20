import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import './JourneyErrorBoundary.css'

type Lang = 'pt' | 'en' | 'es'

const copy: Record<Lang, {title:string;body:string;retry:string;home:string}> = {
  pt: {
    title: 'Algo não carregou como deveria',
    body: 'Seus dados não foram apagados. Recarregue esta tela; se o problema continuar, volte ao Hoje e siga por outro caminho.',
    retry: 'Recarregar',
    home: 'Voltar ao Hoje',
  },
  en: {
    title: 'Something did not load as expected',
    body: 'Your data was not deleted. Reload this screen; if the issue continues, return to Today and continue from there.',
    retry: 'Reload',
    home: 'Back to Today',
  },
  es: {
    title: 'Algo no cargó como debería',
    body: 'Tus datos no fueron eliminados. Recarga esta pantalla; si el problema continúa, vuelve a Hoy y sigue desde allí.',
    retry: 'Recargar',
    home: 'Volver a Hoy',
  },
}

function language(): Lang {
  const value = navigator.language.toLowerCase()
  if (value.startsWith('en')) return 'en'
  if (value.startsWith('es')) return 'es'
  return 'pt'
}

export class JourneyErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NestJourney render failure', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = copy[language()]

    return <main className="journey-crash-page">
      <section className="journey-crash-card" role="alert">
        <span className="journey-crash-icon"><AlertTriangle size={22}/></span>
        <div>
          <span className="journey-crash-kicker">NestJourney</span>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
        </div>
        <div className="journey-crash-actions">
          <button type="button" onClick={()=>window.location.reload()}><RefreshCw size={15}/>{t.retry}</button>
          <a href="/my-today">{t.home}</a>
        </div>
      </section>
    </main>
  }
}
