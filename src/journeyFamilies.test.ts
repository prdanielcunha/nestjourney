import { describe, expect, it } from 'vitest'
import { projectActiveFamilyLinks, type JourneyFamilyEvent } from './journeyFamilies'

const base = {
  organizationId: 'org-a', congregationId: 'unit-a', familyId: 'family-a', personId: 'person-a',
  relationshipType: 'child' as const, guardianFlag: false, recordedBy: 'admin',
}
const fact = (id: string, action: 'link' | 'unlink', recordedAt: string): JourneyFamilyEvent =>
  ({ ...base, id, action, recordedAt, reason: action === 'unlink' ? 'Vínculo corrigido' : undefined })

describe('Family relationship factual projection', () => {
  it('retains history but hides a logically unlinked family member', () => {
    const first = fact('one', 'link', '2026-10-11T10:00:00.000Z')
    const removed = fact('two', 'unlink', '2026-10-11T11:00:00.000Z')
    expect(projectActiveFamilyLinks([removed, first])).toEqual([])
    expect(first).toEqual(expect.objectContaining({action: 'link', personId: 'person-a'}))
  })
  it('supports explicit re-linking without deleting earlier decisions', () => {
    const first = fact('one', 'link', '2026-10-11T10:00:00.000Z')
    const removed = fact('two', 'unlink', '2026-10-11T11:00:00.000Z')
    const latest = fact('three', 'link', '2026-10-11T12:00:00.000Z')
    expect(projectActiveFamilyLinks([latest, removed, first])).toEqual([latest])
  })
  it('keeps different people and families separate without inferring relations', () => {
    const a = fact('one', 'link', '2026-10-11T10:00:00.000Z')
    const b = { ...a, id: 'two', personId: 'person-b', relationshipType: 'other' as const }
    expect(projectActiveFamilyLinks([a,b])).toHaveLength(2)
  })
})
