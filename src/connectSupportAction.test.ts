import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConnectSupportAction, type SupportSession } from './connectSupportAction'

const draft = () => ({ product: 'nestjourney', automaticSend: false, expiresAt: Date.now() + 600000,
  draftUrl: 'https://wa.me/15555550123?text=NestJourney%20synthetic-origin' })
function harness(fetchImpl: typeof fetch = async () => new Response(JSON.stringify(draft()))) {
  let session: SupportSession | null = { uid: 'synthetic-user', organizationId: 'synthetic-org', getToken: async () => 'synthetic-user-token' }
  const popup = { closed: false, opener: {} as unknown, location: { href: 'about:blank' }, close() { this.closed = true } }
  const transport = vi.fn(fetchImpl), navigate = vi.fn(), state = vi.fn()
  const options = { session: () => session, popup: () => popup, fetch: transport as typeof fetch, navigate, state }
  return { action: createConnectSupportAction(options), popup, transport, navigate, state, options, setSession(value: SupportSession | null) { session = value } }
}
afterEach(() => vi.useRealTimers())
describe('NestJourney manual support entry', () => {
  it('requires a click and sends only identity and requested scope to the fixed same-origin Core route', async () => {
    const h = harness(async (url, init) => {
      expect(url).toBe('/api/core/support/draft')
      expect(init?.redirect).toBe('error')
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      expect(new Headers(init?.headers).get('X-Connect-User-Authorization')).toBe('Bearer synthetic-user-token')
      expect(JSON.parse(String(init?.body))).toEqual({ product: 'nestjourney', organizationId: 'synthetic-org', locale: 'es-ES' })
      return new Response(JSON.stringify(draft()))
    })
    expect(h.transport).not.toHaveBeenCalled()
    await h.action.open('es-ES')
    expect(h.popup.opener).toBeNull()
    expect(h.popup.location.href).toMatch(/^https:\/\/wa.me\//)
    h.action.cancel()
    expect(h.popup.closed).toBe(false)
  })
  it.each([401, 403, 404, 409, 429, 500])('Core denial %i never navigates or displays backend data', async status => {
    const h = harness(async () => new Response('{"private":"synthetic-private-record"}', { status }))
    await h.action.open('pt-BR')
    expect(h.popup.location.href).toBe('about:blank')
    expect(h.popup.closed).toBe(true)
    expect(h.state).toHaveBeenLastCalledWith(false, true)
    expect(h.navigate).not.toHaveBeenCalled()
  })
  it.each([
    { product: 'musicscale' }, { automaticSend: true }, { expiresAt: 0 }, { expiresAt: Number.MAX_SAFE_INTEGER },
    { draftUrl: 'https://evil.invalid/?text=hello' }, { draftUrl: 'javascript:alert(1)' },
    { draftUrl: 'https://wa.me/15555550123?text=hello#unsafe' }, { draftUrl: 'https://user@wa.me/15555550123?text=hello' },
    { draftUrl: 'https://wa.me/15555550123?text=one&text=two' }, { draftUrl: 'https://wa.me/15555550123?text=one&token=two' },
    { draftUrl: 'https://wa.me/15555550123?text=synthetic-user-token' }, { draftUrl: 'https://wa.me/0?text=hello' },
    { draftUrl: 'https://wa.me/15555550123?text=' }, { draftUrl: 'https://wa.me/15555550123?text=' + 'x'.repeat(2049) },
  ])('rejects unsafe, wrong-product or expired drafts: %j', async mutation => {
    const h = harness(async () => new Response(JSON.stringify({ ...draft(), ...mutation })))
    await h.action.open('en-US')
    expect(h.popup.location.href).toBe('about:blank')
    expect(h.popup.closed).toBe(true)
    expect(h.state).toHaveBeenLastCalledWith(false, true)
  })
  it('does not duplicate pending actions', async () => {
    const h = harness()
    await Promise.all([h.action.open('pt-BR'), h.action.open('pt-BR')])
    expect(h.transport).toHaveBeenCalledTimes(1)
  })
  it.each(['logout', 'account', 'organization', 'unmount'])('cancels stale navigation after %s', async kind => {
    let resolve!: (value: Response) => void
    const h = harness(async () => new Promise<Response>(r => { resolve = r }))
    const pending = h.action.open('pt-BR')
    await vi.waitFor(() => expect(h.transport).toHaveBeenCalledTimes(1))
    if (kind === 'unmount') h.action.cancel()
    else h.setSession(kind === 'logout' ? null : { uid: kind === 'account' ? 'other-user' : 'synthetic-user', organizationId: kind === 'organization' ? 'other-org' : 'synthetic-org', getToken: async () => 'other-token' })
    resolve(new Response(JSON.stringify(draft())))
    await pending
    expect(h.popup.closed).toBe(true)
    expect(h.popup.location.href).toBe('about:blank')
    expect(h.navigate).not.toHaveBeenCalled()
  })
  it('sends nothing if identity disappears while obtaining a token', async () => {
    let resolve!: (value: string) => void
    const h = harness()
    h.setSession({ uid: 'synthetic-user', organizationId: 'synthetic-org', getToken: () => new Promise(r => { resolve = r }) })
    const pending = h.action.open('pt-BR')
    h.setSession(null); resolve('synthetic-user-token'); await pending
    expect(h.transport).not.toHaveBeenCalled()
    expect(h.popup.closed).toBe(true)
  })
  it('closes the pending popup and clears busy even if token retrieval never finishes', async () => {
    vi.useFakeTimers()
    const h = harness()
    h.setSession({ uid: 'synthetic-user', organizationId: 'synthetic-org', getToken: () => new Promise(() => {}) })
    const pending = h.action.open('pt-BR')
    await vi.advanceTimersByTimeAsync(15000); await pending
    expect(h.popup.closed).toBe(true)
    expect(h.state).toHaveBeenLastCalledWith(false, true)
    expect(h.transport).not.toHaveBeenCalled()
  })
  it('ignores a closed popup; navigates the current tab when popups are blocked', async () => {
    const closed = harness(); closed.popup.closed = true; await closed.action.open('pt-BR')
    expect(closed.popup.location.href).toBe('about:blank'); expect(closed.navigate).not.toHaveBeenCalled()
    const blocked = harness(); const action = createConnectSupportAction({ ...blocked.options, popup: () => null })
    await action.open('pt-BR'); expect(blocked.navigate).toHaveBeenCalledOnce()
  })
  it('requires identity/context and handles transport failure safely', async () => {
    const empty = harness(); empty.setSession(null); await empty.action.open('pt-BR'); expect(empty.transport).not.toHaveBeenCalled()
    const failed = harness(async () => { throw new Error('synthetic-transport-failure') }); await failed.action.open('pt-BR')
    expect(failed.popup.closed).toBe(true); expect(failed.state).toHaveBeenLastCalledWith(false, true)
  })
})
