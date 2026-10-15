export type SupportSession = { uid: string; organizationId: string; getToken(): Promise<string> }
type Popup = { closed: boolean; opener: unknown; location: { href: string }; close(): void }

/** No domain reads or sends. Requested scope is authorized by the existing Core/Hub endpoint. */
export function createConnectSupportAction(options: {
  session(): SupportSession | null
  fetch: typeof fetch
  popup(): Popup | null
  navigate(url: string): void
  state(busy: boolean, failed: boolean): void
}) {
  let epoch = 0, busy = false, popup: Popup | null = null, abort: AbortController | null = null
  const cancel = () => { epoch++; busy = false; abort?.abort(); abort = null; popup?.close(); popup = null }
  return {
    cancel,
    async open(locale: 'pt-BR' | 'en-US' | 'es-ES') {
      const session = options.session()
      if (!session || busy) return
      const generation = ++epoch
      const current = () => {
        const latest = options.session()
        return generation === epoch && latest?.uid === session.uid && latest?.organizationId === session.organizationId
      }
      busy = true
      const controller = new AbortController(); abort = controller
      let target: Popup | null = null, failed = false
      const timeout = setTimeout(() => controller.abort(), 15000)
      const aborted = new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(new Error('SUPPORT_CANCELLED')), { once: true }))
      const bounded = <T,>(promise: Promise<T>) => Promise.race([promise, aborted])
      try {
        target = options.popup(); popup = target
        if (target) target.opener = null
        options.state(true, false)
        const token = await bounded(session.getToken())
        if (!current() || controller.signal.aborted) { target?.close(); return }
        const response = await bounded(options.fetch('/api/core/support/draft', {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, 'X-Connect-User-Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: 'nestjourney', organizationId: session.organizationId, locale }),
        }))
        if (!response.ok) throw new Error()
        const data = await bounded(response.json()), url = new URL(data.draftUrl)
        let parameterCount = 0
        url.searchParams.forEach(() => parameterCount++)
        if (data.product !== 'nestjourney' || data.automaticSend !== false || url.origin !== 'https://wa.me' || url.username || url.password || url.hash ||
            !/^\/[1-9][0-9]{7,14}$/.test(url.pathname) || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 630000 ||
            parameterCount !== 1 || !url.searchParams.get('text') || url.searchParams.get('text')!.length > 2048 || url.searchParams.get('text')!.includes(token)) throw new Error()
        if (!current() || controller.signal.aborted) { target?.close(); return }
        if (target) { if (!target.closed) target.location.href = url.toString() } else options.navigate(url.toString())
        popup = null
      } catch { target?.close(); failed = true }
      finally {
        clearTimeout(timeout)
        if (generation === epoch) { busy = false; abort = null; options.state(false, failed && current()) }
      }
    },
  }
}
