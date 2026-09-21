import { describe, expect, it } from 'vitest'
import { planFollowupOutcome } from './followup'

describe('first-contact follow-up outcomes', () => {
  it('keeps the next action deterministic and non-diagnostic', () => {
    expect(planFollowupOutcome('responded')).toEqual({
      outcomeCode: 'responded',
      nextActionCode: 'none',
      careResolutionCode: 'contact_completed',
    })
    expect(planFollowupOutcome('prayer_requested').nextActionCode).toBe('care_prayer')
    expect(planFollowupOutcome('group_interest').nextActionCode).toBe('group_entry')
    expect(planFollowupOutcome('invalid_contact').nextActionCode).toBe('data_correction')
    expect(planFollowupOutcome('no_response').nextActionCode).toBe('manual_review')
    expect(planFollowupOutcome('consent_revoked')).toEqual({
      outcomeCode: 'consent_revoked',
      nextActionCode: 'none',
      careResolutionCode: 'consent_revoked',
    })
  })

  it('never turns a response outcome into a spiritual or emotional label', () => {
    const plans = [
      planFollowupOutcome('responded'),
      planFollowupOutcome('prayer_requested'),
      planFollowupOutcome('group_interest'),
      planFollowupOutcome('declined_contact'),
      planFollowupOutcome('consent_revoked'),
      planFollowupOutcome('invalid_contact'),
      planFollowupOutcome('no_response'),
    ]
    expect(plans.map((item) => item.nextActionCode)).toEqual([
      'none',
      'care_prayer',
      'group_entry',
      'none',
      'none',
      'data_correction',
      'manual_review',
    ])
  })
})
