import { describe, expect, it } from 'vitest'
import packageJson from '../package.json?raw'
import { NESTJOURNEY_IS_BETA, NESTJOURNEY_RELEASES, NESTJOURNEY_VERSION } from './releaseInfo'

describe('NestJourney release contract', () => {
  it('keeps the app and release history on the same semantic beta version', () => {
    expect(JSON.parse(packageJson).version).toBe(NESTJOURNEY_VERSION)
    expect(NESTJOURNEY_VERSION).toMatch(/^0\.9\.0-beta\.\d+$/)
    expect(NESTJOURNEY_IS_BETA).toBe(true)
    expect(NESTJOURNEY_RELEASES[0].version).toBe(NESTJOURNEY_VERSION)
  })

  it('keeps release notes available in all supported locales', () => {
    for (const release of NESTJOURNEY_RELEASES) {
      for (const locale of ['pt-BR','en','es'] as const) {
        expect(release.title[locale]).toBeTruthy()
        expect(release.summary[locale]).toBeTruthy()
        expect(release.items[locale].length).toBeGreaterThan(0)
      }
    }
  })
})
