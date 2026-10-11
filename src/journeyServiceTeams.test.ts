import { describe, expect, it } from 'vitest'
import { parseJourneyServiceTeam, legacyResponsibilityForTeam, teamFromLegacy, DEFAULT_SERVICE_TEAM } from './journeyServiceTeams'

describe('NestJourney service team and support access', () => {
  it('allows support without leadership or broader access', () => {
    const support = parseJourneyServiceTeam({ primaryArea:'support',teamRole:'auxiliary',supportAreas:['table','care'] })
    expect(support).not.toBeNull()
    expect(legacyResponsibilityForTeam(support!)).toBe('member')
    expect(parseJourneyServiceTeam({ primaryArea:'support',teamRole:'leader',supportAreas:[] })).toBeNull()
  })
  it('never grants leader permissions just for secondary availability', () => {
    const helper = parseJourneyServiceTeam({primaryArea:'table',teamRole:'integrant',supportAreas:['house']})
    expect(legacyResponsibilityForTeam(helper!)).toBe('member')
    const leader = parseJourneyServiceTeam({primaryArea:'table',teamRole:'leader',supportAreas:['house']})
    expect(legacyResponsibilityForTeam(leader!)).toBe('mesa_team')
  })
  it('validates other labels and rejects repeated or foreign areas', () => {
    expect(parseJourneyServiceTeam({primaryArea:'care',teamRole:'other',supportAreas:[]})).toBeNull()
    expect(parseJourneyServiceTeam({primaryArea:'care',teamRole:'other',otherLabel:'Transporte',supportAreas:[]})).not.toBeNull()
    expect(parseJourneyServiceTeam({primaryArea:'care',teamRole:'auxiliary',supportAreas:['table','table']})).toBeNull()
    expect(parseJourneyServiceTeam({primaryArea:'care',teamRole:'auxiliary',supportAreas:['finance']})).toBeNull()
  })
  it('retains a legacy operational responsibility until an explicit edit', () => {
    expect(teamFromLegacy('caregiver').primaryArea).toBe('care')
    expect(teamFromLegacy('caregiver').teamRole).toBe('leader')
    expect(teamFromLegacy('member')).toEqual(DEFAULT_SERVICE_TEAM)
  })
})
