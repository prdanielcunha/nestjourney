import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ConnectSupportButton } from './ConnectSupportButton'

const context = vi.hoisted(() => ({ organizationId: 'synthetic-org', user: { uid: 'synthetic-user', getIdToken: async () => 'synthetic-user-token' } as unknown }))
vi.mock('./firebase', () => ({ auth: { get currentUser() { return context.user } } }))
vi.mock('./journeyRepository', () => ({ getActiveJourneyOrganizationId: () => context.organizationId }))

describe('Manual support Help entry', () => {
  it.each([
    ['pt-BR', 'Suporte no WhatsApp oficial', 'Você revisa e envia'],
    ['en', 'Support on official WhatsApp', 'You review and send'],
    ['es', 'Soporte por WhatsApp oficial', 'Revisas y envías'],
  ] as const)('renders an explicit localized action for %s without creating a public draft link', (locale, label, description) => {
    const html = renderToStaticMarkup(<ConnectSupportButton locale={locale}/>)
    expect(html).toContain(label)
    expect(html).toContain(description)
    expect(html).toContain('type="button"')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('synthetic-user-token')
    expect(html).not.toContain('synthetic-org')
  })
  it('disables the action when identity or requested tenant is absent', () => {
    const user = context.user
    context.user = null
    expect(renderToStaticMarkup(<ConnectSupportButton locale="en"/>)).toContain('disabled=""')
    context.user = user
    context.organizationId = ''
    expect(renderToStaticMarkup(<ConnectSupportButton locale="en"/>)).toContain('disabled=""')
    context.organizationId = 'synthetic-org'
  })
})
