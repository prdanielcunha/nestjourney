import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithCustomToken, type User } from 'firebase/auth'
import { auth, firebaseConfigured } from './firebase'

const HUB_LAUNCH_URL = 'https://www.millionsnest.com/apps/nestjourney/launch'
const RECOVERY_KEY = 'mn_sso_recovery_nestjourney'

type GateState = 'checking' | 'ready' | 'error'

function safeReturnPath(): string {
  const candidate = String(window.location.pathname || '/').trim()
  return candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('://') && !candidate.includes('\\')
    ? candidate
    : '/'
}

function redirectToHub(returnTo = safeReturnPath()): boolean {
  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === '1') return false
    sessionStorage.setItem(RECOVERY_KEY, '1')
  } catch {}

  const url = new URL(HUB_LAUNCH_URL)
  url.searchParams.set('returnTo', returnTo)
  window.location.replace(url.toString())
  return true
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

export function EcosystemSessionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking')
  const [message, setMessage] = useState('Conectando sua sessão do MillionsNest...')

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setMessage('A configuração Firebase do NestJourney não está disponível.')
      setState('error')
      return
    }

    let cancelled = false
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

          try {
            sessionStorage.removeItem(RECOVERY_KEY)
            sessionStorage.setItem('mn_ecosystem_org_id', payload.orgId)
          } catch {}

          if (!cancelled) setState('ready')
        } catch {
          if (!redirectToHub() && !cancelled) {
            setMessage('Não foi possível validar o acesso pelo MillionsNest. Volte ao Hub e tente novamente.')
            setState('error')
          }
        }
      })()

      return () => { cancelled = true }
    }

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (cancelled) return
      if (user) {
        try { sessionStorage.removeItem(RECOVERY_KEY) } catch {}
        setState('ready')
        return
      }

      if (!redirectToHub()) {
        setMessage('Sua sessão não pôde ser restaurada. Volte ao Hub MillionsNest e abra o NestJourney novamente.')
        setState('error')
      }
    }, () => {
      if (!cancelled) {
        setMessage('Falha ao verificar sua sessão segura.')
        setState('error')
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (state === 'ready') return <>{children}</>

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#07110d', color: '#f7f7f2', padding: 24 }}>
      <section style={{ width: 'min(440px, 100%)', textAlign: 'center', padding: 28, borderRadius: 24, border: '1px solid rgba(255,255,255,.10)', background: 'rgba(255,255,255,.04)' }}>
        <div aria-hidden="true" style={{ width: 36, height: 36, margin: '0 auto 18px', borderRadius: 999, border: '3px solid rgba(255,255,255,.15)', borderTopColor: state === 'checking' ? '#f7f7f2' : '#b5c9bc' }} />
        <h1 style={{ margin: 0, fontSize: 20 }}>NestJourney</h1>
        <p style={{ margin: '12px 0 0', color: '#aebbb3', lineHeight: 1.6, fontSize: 14 }}>{message}</p>
      </section>
    </main>
  )
}
