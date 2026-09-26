import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { getInitialLocale, type AppLocale } from './i18n'
import { NESTJOURNEY_IS_BETA, NESTJOURNEY_RELEASES, NESTJOURNEY_VERSION } from './releaseInfo'
import './JourneySectionPages.css'

const copy:Record<AppLocale,{title:string;subtitle:string;current:string;beta:string;release:string;hotfix:string;back:string}>={
  'pt-BR':{title:'Novidades',subtitle:'Veja o que mudou no NestJourney sem precisar descobrir sozinho.',current:'Versão atual',beta:'Beta',release:'Nova versão',hotfix:'Correção',back:'Voltar à Gestão'},
  en:{title:"What's new",subtitle:'See what changed in NestJourney without having to discover it on your own.',current:'Current version',beta:'Beta',release:'Release',hotfix:'Fix',back:'Back to Management'},
  es:{title:'Novedades',subtitle:'Mira qué cambió en NestJourney sin tener que descubrirlo por tu cuenta.',current:'Versión actual',beta:'Beta',release:'Nueva versión',hotfix:'Corrección',back:'Volver a Gestión'},
}

export default function WhatsNewPage(){
  const locale=getInitialLocale()
  const t=copy[locale]
  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header">
      <div><span className="journey-section-kicker">NestJourney / Release</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <a className="journey-primary-button" href="/more"><ArrowLeft size={16}/>{t.back}</a>
    </header>
    <section className="journey-section-note">
      <Sparkles size={18}/>
      <p><strong>{t.current}: {NESTJOURNEY_VERSION}</strong>{NESTJOURNEY_IS_BETA?<> · {t.beta}</>:null}</p>
    </section>
    <section className="journey-section-block">
      <div className="journey-management-list">
        {NESTJOURNEY_RELEASES.map(release=><article className="journey-card" key={release.version}>
          <span className="journey-card-icon"><CheckCircle2 size={19}/></span>
          <span className="journey-card-copy">
            <span className="journey-section-kicker">{release.kind==='hotfix'?t.hotfix:t.release} · {release.version} · {release.date}</span>
            <strong>{release.title[locale]}</strong>
            <p>{release.summary[locale]}</p>
            <ul>{release.items[locale].map(item=><li key={item}>{item}</li>)}</ul>
          </span>
        </article>)}
      </div>
    </section>
  </div></main>
}
