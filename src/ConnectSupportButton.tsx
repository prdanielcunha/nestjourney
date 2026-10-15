import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { MessageCircle } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId } from './journeyRepository'
import { createConnectSupportAction } from './connectSupportAction'
import type { AppLocale } from './i18n'

const COPY = {
  'pt-BR': ['Suporte no WhatsApp oficial', 'Você revisa e envia a mensagem no WhatsApp. Não inclua dados de pessoas ou registros pastorais.', 'Não foi possível abrir o suporte. Tente novamente em instantes.'],
  en: ['Support on official WhatsApp', 'You review and send the message in WhatsApp. Do not include personal or pastoral records.', 'Support could not be opened. Please try again shortly.'],
  es: ['Soporte por WhatsApp oficial', 'Revisas y envías el mensaje en WhatsApp. No incluyas datos personales ni registros pastorales.', 'No se pudo abrir el soporte. Inténtalo de nuevo en unos instantes.'],
}

export function ConnectSupportButton({ locale }: { locale: AppLocale }) {
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const [, refresh] = useState(0)
  const action = useRef<ReturnType<typeof createConnectSupportAction> | null>(null)
  if (!action.current) action.current = createConnectSupportAction({
    session: () => {
      const user = auth?.currentUser, organizationId = getActiveJourneyOrganizationId()
      return user && organizationId ? { uid: user.uid, organizationId, getToken: () => user.getIdToken() } : null
    },
    fetch: (input, init) => fetch(input, init), popup: () => window.open('about:blank', '_blank'),
    navigate: url => window.location.assign(url), state: (pending, error) => { setBusy(pending); setFailed(error) },
  })
  useEffect(() => {
    let uid = auth?.currentUser?.uid
    const reset = () => { action.current?.cancel(); setBusy(false); setFailed(false); refresh(n => n + 1) }
    const unsubscribe = auth ? onAuthStateChanged(auth, user => {
      if (uid !== user?.uid) { uid = user?.uid; reset() }
    }) : undefined
    window.addEventListener('nestjourney:organization', reset)
    return () => { unsubscribe?.(); window.removeEventListener('nestjourney:organization', reset); action.current?.cancel() }
  }, [])
  const copy = COPY[locale]
  return <section className="journey-section-block" aria-label={copy[0]}>
    <button type="button" className="journey-primary-button" disabled={busy || !auth?.currentUser || !getActiveJourneyOrganizationId()} aria-busy={busy}
      onClick={() => void action.current?.open(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR')}>
      <MessageCircle size={18} aria-hidden="true" />{copy[0]}
    </button>
    <p className="journey-section-copy">{copy[1]}</p>
    {failed && <p role="status">{copy[2]}</p>}
  </section>
}
