import { describe, expect, it } from 'vitest'
import {
  getJourneyInvitationOrganizationId,
  isJourneyInvitationPath,
  validateJourneyInvitationUrl,
} from './journeyInvitation'

describe('journey invitation links',()=>{
  it('recognizes a safe dynamic join route',()=>{
    expect(getJourneyInvitationOrganizationId('/join/org-123')).toBe('org-123')
    expect(isJourneyInvitationPath('/join/org_ABC')).toBe(true)
    expect(getJourneyInvitationOrganizationId('/join/a/b')).toBeNull()
  })

  it('accepts only canonical NestJourney invitation URLs',()=>{
    expect(validateJourneyInvitationUrl('https://nestjourney.millionsnest.com/join/org-1?token=abc','org-1')).toBe(true)
    expect(validateJourneyInvitationUrl('https://evil.example/join/org-1?token=abc','org-1')).toBe(false)
    expect(validateJourneyInvitationUrl('https://nestjourney.millionsnest.com/join/org-2?token=abc','org-1')).toBe(false)
    expect(validateJourneyInvitationUrl('https://nestjourney.millionsnest.com/join/org-1?token=abc&x=1','org-1')).toBe(false)
  })
})
