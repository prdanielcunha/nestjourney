import { useState } from 'react'
import { ArrowRight, Cloud, Globe, LoaderCircle, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react'
import { firebaseConfigured } from './firebase'
import { useEcosystem } from './useEcosystem'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const ecosystem = useEcosystem()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  if (ecosystem.status === 'demo' || ecosystem.status === 'authenticated') return children
  if (ecosystem.status === 'loading') return <div className="auth-screen auth-loading"><img src="/brand/raiz-e-mesa-mark.webp" alt="" /><LoaderCircle /><p>Conectando ao ecossistema MillionsNest…</p></div>

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try { await ecosystem.signInWithEmail(email, password) }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Não foi possível entrar.') }
    finally { setSubmitting(false) }
  }
  const google = async () => {
    setSubmitting(true)
    setFormError('')
    try { await ecosystem.signInWithGoogle() }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Não foi possível entrar com o Google.') }
    finally { setSubmitting(false) }
  }

  return <main className="auth-screen">
    <section className="auth-story"><div className="auth-brand"><img src="/brand/raiz-e-mesa-mark.webp" alt="" /><span><strong>Raiz e Mesa</strong><small>um produto MillionsNest</small></span></div><div className="auth-copy"><span className="eyebrow">CUIDADO QUE CONTINUA</span><h1>Pessoas ao lado de pessoas.</h1><p>Organize acolhimento, cuidado, pequenos grupos e discipulado sem transformar histórias em números.</p></div><div className="auth-trust"><ShieldCheck /><span><strong>Uma conta para todo o ecossistema</strong><small>Mesma igreja, equipe e permissões dos seus outros aplicativos MillionsNest.</small></span></div></section>
    <section className="auth-panel"><div className="auth-card">
      {ecosystem.status === 'denied' || ecosystem.status === 'error' ? <><span className="auth-symbol"><LockKeyhole /></span><h2>Acesso ainda não liberado</h2><p>{ecosystem.error}</p><a className="primary full" href="https://www.millionsnest.com/dashboard"><ArrowRight /> Abrir o MillionsNest</a><button className="secondary full" onClick={ecosystem.startDemo}>Explorar demonstração</button>{ecosystem.user ? <button className="text-button" onClick={ecosystem.logout}>Sair desta conta</button> : null}</> : <><span className="eyebrow">ACESSO CENTRAL</span><h2>Entre na sua conta</h2><p>Use os mesmos dados do MillionsNest, MusicScale ou NestFinance.</p>{!firebaseConfigured ? <p className="message-warning">A conexão com o Firebase ainda não foi configurada.</p> : null}<button className="google-button" onClick={google} disabled={submitting}><Globe /> Continuar com Google</button><div className="auth-divider"><span>ou use seu e-mail</span></div><form onSubmit={submit}><label className="field"><span>E-mail</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{formError ? <p className="form-error">{formError}</p> : null}<button className="primary full" disabled={submitting}>{submitting ? <LoaderCircle className="spin" /> : <LogIn />} Entrar</button></form><a className="text-button" href="https://www.millionsnest.com/login">Criar conta ou recuperar senha</a><button className="demo-link" onClick={ecosystem.startDemo}><Cloud /> Explorar com dados de demonstração</button></>}
    </div></section>
  </main>
}
