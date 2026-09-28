import { describe, expect, it } from 'vitest'
import {
  canOpenJourneyArea,
  canViewJourneyReports,
  canViewJourneyVision,
  resolveJourneyResponsibility,
} from './journeyExperience'
import type { JourneyAccessContext } from './journeyRepository'

function access(input: Partial<JourneyAccessContext> & Pick<JourneyAccessContext,'role'>): JourneyAccessContext {
  return {
    organizationId:'org-sim',
    userId:'user-'+input.role,
    role:input.role,
    organizationRole:input.organizationRole ?? 'member',
    permissions:input.permissions ?? {},
    congregationIds:input.congregationIds ?? ['monte-castelo'],
    isSystemAdmin:false,
    isOwner:false,
    canManagePresence:false,
    canManageMesa:false,
    canManagePeople:false,
    canManageCare:false,
    canManageGroups:false,
    canManageDiscipleship:false,
    canManageImplementation:false,
    canViewGovernance:false,
    canManagePrivacy:false,
    canManagePastoral:false,
    broadJourneyAccess:false,
    ...input,
  }
}

describe('roadmap role and unit simulation', () => {
  const profiles = [
    access({role:'presence_host',canManagePresence:true,canManagePeople:true,congregationIds:['monte-castelo']}),
    access({role:'mesa',canManageMesa:true,congregationIds:['monte-castelo']}),
    access({role:'care',canManageCare:true,congregationIds:['monte-castelo']}),
    access({role:'group_leader',canManageGroups:true,congregationIds:['industrial']}),
    access({role:'discipler',canManageDiscipleship:true,congregationIds:['industrial']}),
    access({role:'coordinator',canManagePresence:true,canManageMesa:true,canManageCare:true,canManageGroups:true,canManageDiscipleship:true,canManageImplementation:true,broadJourneyAccess:true,congregationIds:['monte-castelo','industrial']}),
    access({role:'pastor',organizationRole:'pastor',canManagePresence:true,canManageMesa:true,canManagePeople:true,canManageCare:true,canManageGroups:true,canManageDiscipleship:true,canManageImplementation:true,canManagePastoral:true,broadJourneyAccess:true,congregationIds:['monte-castelo','industrial']}),
    access({role:'admin',organizationRole:'admin',canManagePresence:true,canManageMesa:true,canManagePeople:true,canManageCare:true,canManageGroups:true,canManageDiscipleship:true,canManageImplementation:true,broadJourneyAccess:true,congregationIds:['monte-castelo','industrial']}),
  ]

  it('simulates eight operational profiles without exposing unrelated areas to scoped workers', () => {
    expect(profiles).toHaveLength(8)
    expect(resolveJourneyResponsibility(profiles[0])).toBe('presence_host')
    expect(canOpenJourneyArea(profiles[0],'presence')).toBe(true)
    expect(canOpenJourneyArea(profiles[0],'care')).toBe(false)

    expect(resolveJourneyResponsibility(profiles[1])).toBe('mesa_team')
    expect(canOpenJourneyArea(profiles[1],'mesa')).toBe(true)
    expect(canOpenJourneyArea(profiles[1],'groups')).toBe(false)

    expect(resolveJourneyResponsibility(profiles[2])).toBe('caregiver')
    expect(canOpenJourneyArea(profiles[2],'care')).toBe(true)
    expect(canOpenJourneyArea(profiles[2],'discipleship')).toBe(false)

    expect(resolveJourneyResponsibility(profiles[3])).toBe('group_leader')
    expect(canOpenJourneyArea(profiles[3],'groups')).toBe(true)
    expect(canOpenJourneyArea(profiles[3],'presence')).toBe(false)

    expect(resolveJourneyResponsibility(profiles[4])).toBe('discipler')
    expect(canOpenJourneyArea(profiles[4],'discipleship')).toBe(true)
    expect(canOpenJourneyArea(profiles[4],'care')).toBe(false)
  })

  it('keeps the two pilot units explicit in simulated scope', () => {
    expect(profiles[0].congregationIds).toEqual(['monte-castelo'])
    expect(profiles[3].congregationIds).toEqual(['industrial'])
    expect(profiles[5].congregationIds).toEqual(['monte-castelo','industrial'])
  })

  it('gives coordination, pastor and admin the management views they need', () => {
    expect(resolveJourneyResponsibility(profiles[5])).toBe('coordinator')
    expect(canViewJourneyVision(profiles[5])).toBe(true)
    expect(canViewJourneyReports(profiles[5])).toBe(true)

    expect(resolveJourneyResponsibility(profiles[6])).toBe('pastor')
    expect(canViewJourneyVision(profiles[6])).toBe(true)
    expect(canViewJourneyReports(profiles[6])).toBe(true)

    expect(resolveJourneyResponsibility(profiles[7])).toBe('admin')
    expect(canViewJourneyVision(profiles[7])).toBe(true)
    expect(canViewJourneyReports(profiles[7])).toBe(true)
  })
})
