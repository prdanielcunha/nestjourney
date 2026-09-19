import { describe, expect, it } from 'vitest'
import { buildConnectFollowupLaunchUrl, resolveRequestedFollowupId } from './connectBridge'

describe('NestJourney Connect bridge', () => {
  it('builds a narrow Hub handoff destination without PII', () => {
    const url = new URL(buildConnectFollowupLaunchUrl('first-contact-care1'))
    expect(url.origin).toBe('https://www.millionsnest.com')
    expect(url.pathname).toBe('/connect/launch')
    expect(url.searchParams.get('returnTo')).toBe('/journey-followup/first-contact-care1')
    expect(url.toString()).not.toContain('phone')
    expect(url.toString()).not.toContain('name')
  })

  it('rejects path-like or external identifiers', () => {
    expect(() => buildConnectFollowupLaunchUrl('../care1')).toThrow('invalid_followup_id')
    expect(resolveRequestedFollowupId('?followup=https://evil.example')).toBe('')
  })

  it('resolves the follow-up returned by Connect', () => {
    expect(resolveRequestedFollowupId('?followup=first-contact-care1')).toBe('first-contact-care1')
  })
})
