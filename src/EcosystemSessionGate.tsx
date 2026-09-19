import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from 'firebase/auth'
import { auth, db, firebaseConfigured } from './firebase'
import { resolveJourneyDirectEntry, type JourneyEntryOrganization } from './directEntry'

const HUB_LAUNCH_URL = 'https://www.millionsnest.com/apps/nestjourney/launch'
const RECOVERY_KEY = 'mn_sso_recovery_nestjourney'
const ACTIVE_ORG_KEY = 'mn_ecosystem_org_id'

type GateState = 'checking' | 'ready' | 'login' | 'choose' | 'no_access' | 'error'
type Lang = 'pt' | 'en' | 'es'

const COPY: Record<Lang, Record<string, string>> = {
  pt: {
    checking: 'Confirmando sua conta e seu acesso…',
    title: 'Entre para continuar',
    subtitle: 'Use sua conta MillionsNest. Seu acesso e suas organizações serão confirmados com segurança.',
    google: 'Continuar com Google',
    hub: 'Entrar pelo MillionsNest',
    choose: 'Onde você quer trabalhar?',
    chooseHelp: 'Esta conta tem acesso a mais de uma organização.',
    another: 'Usar outra conta Google',
    noAccess: 'Esta conta ainda não tem acesso ao NestJourney.',
    noAccessHelp: 'Use outra conta ou abra o MillionsNest para conferir seu acesso.',
    error: 'Não foi possível concluir o acesso agora.',
    retry: 'Tentar novamente',
    security: 'Google identifica você. O MillionsNest e as regras do ecossistema confirmam o que você pode acessar.',
  },
  en: {
    checking: 'Confirming your account and access…',
    title: 'Sign in to continue',
    subtitle: 'Use your MillionsNest account. Your access and organizations will be securely confirmed.',
    google: 'Continue with Google',
    hub: 'Sign in through MillionsNest',
    choose: 'Where do you want to work?',
    chooseHelp: 'This account can access more than one organization.',
    another: 'Use another Google account',
    noAccess: 'This account does not have NestJourney access yet.',
    noAccessHelp: 'Use another account or open MillionsNest to review your access.',
    error: 'We could not complete sign-in right now.',
    retry: 'Try again',
    security: 'Google identifies you. MillionsNest and ecosystem rules confirm what you can access.',
  },
  es: {
    checking: 'Confirmando tu cuenta y acceso…',
    title: 'Inicia sesión para continuar',
    subtitle: 'Usa tu cuenta MillionsNest. Tu acceso y organizaciones se confirmarán de forma segura.',
    google: 'Continuar con Google',
    hub: 'Entrar por MillionsNest',
    choose: '¿Dónde quieres trabajar?',
    chooseHelp: 'Esta cuenta tiene acceso a más de una organización.',
    another: 'Usar otra cuenta de Google',
    noAccess: 'Esta cuenta todavía no tiene acceso a NestJourney.',
    noAccessHelp: 'Usa otra cuenta o abre MillionsNest para revisar tu acceso.',
    error: 'No pudimos completar el acceso ahora.',
    retry: 'Intentar de nuevo',
    security: 'Google te identifica. MillionsNest y las reglas del ecosistema confirman a qué puedes acceder.',
  },
}

function language(): Lang {
  const value = navigator.language.toLowerCase()
  if (value.startsWith('en')) return 'en'
  if (value.startsWith('es')) return 'es'
  return 'pt'
}

function safeReturnPath(): string {
  const candidate = `${window.location.pathname || '/'}${window.location.search || ''}`
  return candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('://') && !candidate.includes('\\')
    ? candidate
    : '/'
}

function openHub(returnTo = safeReturnPath()) {
  const url = new URL(HUB_LAUNCH_URL)
  url.searchParams.set('returnTo', returnTo)
  window.location.assign(url.toString())
}

function decodeHandoff(encoded: string) {
  if (encoded.length > 32768) throw new Error('invalid_handoff')
  const payload = JSON.parse(atob(encoded))
  const expiresAtMs = typeof payload?.expiresAt === 'number'
    ? (payload.expiresAt > 1e11 ? payload.expiresAt : payload.expiresAt * 1000)
    : 0

  if (
    payload?.appId !== 'nestjourney' ||
    typeof payload?.protocolVersion !== 'string' ||
    !payload.protocolVersion.startsWith('1.') ||
    typeof payload?.userId !== 'string' ||
    !payload.userId ||
    typeof payload?.orgId !== 'string' ||
    !payload.orgId ||
    typeof payload?.customToken !== 'string' ||
    !payload.customToken ||
    payload.customToken.length > 16384 ||
    expiresAtMs < Date.now() - 60000
  ) {
    throw new Error('invalid_handoff')
  }

  return payload as {
    appId: 'nestjourney'
    protocolVersion: string
    userId: string
    orgId: string
    customToken: string
    expiresAt: number
    supportMode?: boolean
  }
}

function saveOrganization(organizationId: string) {
  sessionStorage.setItem(ACTIVE_ORG_KEY, organizationId)
  localStorage.setItem('mn_nestjourney_last_org_id', organizationId)
  sessionStorage.removeItem(RECOVERY_KEY)
}

export function EcosystemSessionGate({ children }: { children: ReactNode }) {
  const lang = useMemo(language, [])
  const c = COPY[lang]
  const [state, setState] = useState<GateState>('checking')
  const [message, setMessage] = useState(c.checking)
  const [organizations, setOrganizations] = useState<JourneyEntryOrganization[]>([])
  const [identity, setIdentity] = useState<User | null>(null)

  const resolveUser = async (user: User) => {
    if (!db) throw new Error('firebase_unavailable')
    setState('checking')
    setMessage(c.checking)

    const eligible = await resolveJourneyDirectEntry(db, user)
    if (eligible.length === 0) {
      setOrganizations([])
      setState('no_access')
      return
    }

    const remembered = localStorage.getItem('mn_nestjourney_last_org_id') || sessionStorage.getItem(ACTIVE_ORG_KEY)
    const rememberedEligible = remembered ? eligible.find((organization) => organization.id === remembered) : undefined

    if (eligible.length === 1 || rememberedEligible) {
      saveOrganization((rememberedEligible || eligible[0]).id)
      setState('ready')
      return
    }

    setOrganizations(eligible)
    setState('choose')
  }

  const signInGoogle = async () => {
    if (!auth) return
    setState('checking')
    setMessage(c.checking)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      await setPersistence(auth, browserLocalPersistence)
      const credential = await signInWithPopup(auth, provider)
      setIdentity(credential.user)
      await resolveUser(credential.user)
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/operation-not-supported-in-this-environment' ||
        error?.code === 'auth/web-storage-unsupported'
      ) {
        await signInWithRedirect(auth, provider)
        return
      }
      setMessage(c.error)
      setState('error')
    }
  }

  const switchAccount = async () => {
    if (auth) await auth.signOut().catch(() => undefined)
    try {
      sessionStorage.removeItem(ACTIVE_ORG_KEY)
      localStorage.removeItem('mn_nestjourney_last_org_id')
    } catch {}
    setIdentity(null)
    await signInGoogle()
  }

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setMessage('A configuração Firebase do NestJourney não está disponível.')
      setState('error')
      return
    }

    let cancelled = false
    let unsubscribe = () => {}
    const params = new URLSearchParams(window.location.search)
    const encodedContext = params.get('ecosystem_ctx')

    if (encodedContext) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('ecosystem_ctx')
      window.history.replaceState({}, '', cleanUrl.toString())

      void (async () => {
        try {
          const payload = decodeHandoff(encodedContext)
          const credential = await signInWithCustomToken(auth, payload.customToken)
          if (credential.user.uid !== payload.userId) {
            await auth.signOut()
            throw new Error('identity_mismatch')
          }

          saveOrganization(payload.orgId)
          if (!cancelled) {
            setIdentity(credential.user)
            setState('ready')
          }
        } catch {
          if (!cancelled) {
            setMessage(c.error)
            setState('error')
          }
        }
      })()

      return () => { cancelled = true }
    }

    void getRedirectResult(auth).catch(() => {
      if (!cancelled) {
        setMessage(c.error)
        setState('error')
      }
    })

    unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (cancelled) return
      setIdentity(user)

      if (!user) {
        setOrganizations([])
        setState('login')
        return
      }

      void resolveUser(user).catch(() => {
        if (!cancelled) {
          setMessage(c.error)
          setState('error')
        }
      })
    }, () => {
      if (!cancelled) {
        setMessage(c.error)
        setState('error')
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (state === 'ready') return <>{children}</>

  const cardStyle = {
    width: 'min(440px, 100%)',
    padding: 28,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,.075)',
    background: 'rgba(17,18,16,.92)',
    boxShadow: '0 24px 70px rgba(0,0,0,.34)',
    backdropFilter: 'blur(20px)',
  } as const
  const primary = {
    width: '100%',
    minHeight: 50,
    border: 0,
    borderRadius: 13,
    background: '#f4f1eb',
    color: '#151512',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0 18px',
  } as const
  const secondary = {
    ...primary,
    background: 'rgba(255,255,255,.035)',
    color: '#f4f1eb',
    border: '1px solid rgba(255,255,255,.09)',
  } as const

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 14%, rgba(156,134,255,.13), transparent 32%), radial-gradient(circle at 90% 90%, rgba(199,154,87,.08), transparent 28%), #090a09', color: '#f4f1eb', padding: 24 }}>
      <section style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/icon.svg" alt="" style={{ width: 44, height: 44, margin: '0 auto 14px' }} />
          <div style={{ fontSize: 13, color: '#c79a57', fontWeight: 700, letterSpacing: '.08em' }}>NESTJOURNEY</div>
        </div>

        {state === 'checking' ? (
          <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
            <div aria-hidden="true" style={{ width: 34, height: 34, margin: '0 auto 18px', borderRadius: 999, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#c79a57', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: '#9a9b94', lineHeight: 1.6, fontSize: 14 }}>{message}</p>
          </div>
        ) : state === 'choose' ? (
          <>
            <h1 style={{ margin: 0, fontSize: 23, letterSpacing: '-.03em' }}>{c.choose}</h1>
            <p style={{ margin: '8px 0 20px', color: '#969790', lineHeight: 1.55, fontSize: 14 }}>{c.chooseHelp}</p>
            <div style={{ display: 'grid', gap: 9 }}>
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  onClick={() => { saveOrganization(organization.id); setState('ready') }}
                  style={{ ...secondary, textAlign: 'left', minHeight: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>
                    <strong style={{ display: 'block', fontSize: 14 }}>{organization.name}</strong>
                    {organization.slug ? <span style={{ display: 'block', marginTop: 3, color: '#777972', fontSize: 12 }}>{organization.slug}</span> : null}
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={switchAccount} style={{ background: 'transparent', color: '#a9aaa3', border: 0, width: '100%', padding: 15, cursor: 'pointer', marginTop: 5 }}>{c.another}</button>
          </>
        ) : state === 'no_access' ? (
          <>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-.03em' }}>{c.noAccess}</h1>
            <p style={{ margin: '10px 0 22px', color: '#969790', lineHeight: 1.55, fontSize: 14 }}>{c.noAccessHelp}</p>
            <div style={{ display: 'grid', gap: 9 }}>
              <button type="button" onClick={switchAccount} style={primary}>{c.another}</button>
              <button type="button" onClick={() => openHub()} style={secondary}>{c.hub}</button>
            </div>
          </>
        ) : state === 'error' ? (
          <>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-.03em' }}>{c.error}</h1>
            <p style={{ margin: '10px 0 22px', color: '#969790', lineHeight: 1.55, fontSize: 14 }}>{message}</p>
            <div style={{ display: 'grid', gap: 9 }}>
              <button type="button" onClick={() => identity ? resolveUser(identity) : signInGoogle()} style={primary}>{c.retry}</button>
              <button type="button" onClick={() => openHub()} style={secondary}>{c.hub}</button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, textAlign: 'center', fontSize: 24, letterSpacing: '-.035em' }}>{c.title}</h1>
            <p style={{ margin: '9px auto 24px', maxWidth: 350, textAlign: 'center', color: '#969790', lineHeight: 1.6, fontSize: 14 }}>{c.subtitle}</p>
            <div style={{ display: 'grid', gap: 9 }}>
              <button type="button" onClick={signInGoogle} style={primary}>{c.google}</button>
              <button type="button" onClick={() => openHub()} style={secondary}>{c.hub}</button>
            </div>
            <p style={{ margin: '18px 0 0', color: '#6f716a', lineHeight: 1.55, fontSize: 11, textAlign: 'center' }}>{c.security}</p>
          </>
        )}
      </section>
    </main>
  )
}
