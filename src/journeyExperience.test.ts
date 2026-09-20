import { describe, expect, it } from 'vitest'
import { canViewJourneyPeople, canViewJourneyVision, resolveJourneyResponsibility } from './journeyExperience'
import type { JourneyAccessContext } from './journeyRepository'

function access(patch: Partial<JourneyAccessContext> = {}): JourneyAccessContext {
  return {
    organizationId: 'org',
    userId: 'user',
    role: 'member',
    organizationRole: 'member',
    permissions: {},
    congregationIds: ['unit'],
    isSystemAdmin: false,
    isOwner: false,
    canManagePresence: false,
    canManageMesa: false,
    canManagePeople: false,
    canManageCare: false,
    canManageGroups: false,
    canManageDiscipleship: false,
    canManageImplementation: false,
    canViewGovernance: false,
    canManagePrivacy: false,
    canManagePastoral: false,
    broadJourneyAccess: false,
    ...patch,
  }
}

describe('journey experience lenses', () => {
  it('allows operational roles to use People when their work depends on a person lens', () => {
    expect(canViewJourneyPeople(access({ role: 'mesa_team', canManageMesa: true }))).toBe(true)
    expect(canViewJourneyPeople(access({ role: 'caregiver', canManageCare: true }))).toBe(true)
    expect(canViewJourneyPeople(access({ role: 'group_leader', canManageGroups: true }))).toBe(true)
    expect(canViewJourneyPeople(access({ role: 'discipler', canManageDiscipleship: true }))).toBe(true)
  })

  it('does not expose People or Vision to an unassigned member', () => {
    const member = access()
    expect(canViewJourneyPeople(member)).toBe(false)
    expect(canViewJourneyVision(member)).toBe(false)
    expect(resolveJourneyResponsibility(member)).toBe('member')
  })

  it('keeps leadership vision available', () => {
    expect(canViewJourneyVision(access({ role: 'coordinator' }))).toBe(true)
    expect(canViewJourneyVision(access({ organizationRole: 'pastor' }))).toBe(true)
    expect(canViewJourneyVision(access({ isSystemAdmin: true }))).toBe(true)
  })
})
