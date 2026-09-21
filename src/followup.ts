export type FollowupOutcomeCode =
  | 'responded'
  | 'prayer_requested'
  | 'group_interest'
  | 'declined_contact'
  | 'consent_revoked'
  | 'invalid_contact'
  | 'no_response'

export type FollowupNextActionCode =
  | 'none'
  | 'care_prayer'
  | 'group_entry'
  | 'data_correction'
  | 'manual_review'

export type FollowupCareResolutionCode =
  | 'contact_completed'
  | 'declined_contact'
  | 'consent_revoked'
  | 'invalid_contact'
  | 'closed_no_response'

export interface FollowupOutcomePlan {
  outcomeCode: FollowupOutcomeCode
  nextActionCode: FollowupNextActionCode
  careResolutionCode: FollowupCareResolutionCode
}

export function planFollowupOutcome(outcomeCode: FollowupOutcomeCode): FollowupOutcomePlan {
  switch (outcomeCode) {
    case 'prayer_requested':
      return { outcomeCode, nextActionCode: 'care_prayer', careResolutionCode: 'contact_completed' }
    case 'group_interest':
      return { outcomeCode, nextActionCode: 'group_entry', careResolutionCode: 'contact_completed' }
    case 'declined_contact':
      return { outcomeCode, nextActionCode: 'none', careResolutionCode: 'declined_contact' }
    case 'consent_revoked':
      return { outcomeCode, nextActionCode: 'none', careResolutionCode: 'consent_revoked' }
    case 'invalid_contact':
      return { outcomeCode, nextActionCode: 'data_correction', careResolutionCode: 'invalid_contact' }
    case 'no_response':
      return { outcomeCode, nextActionCode: 'manual_review', careResolutionCode: 'closed_no_response' }
    case 'responded':
    default:
      return { outcomeCode: 'responded', nextActionCode: 'none', careResolutionCode: 'contact_completed' }
  }
}
