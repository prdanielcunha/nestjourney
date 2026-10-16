import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { verifyPublishedHubRulesSource } from './verify-shared-hub-rules.mjs'

describe('canonical shared Hub policy boundary', () => {
  it('accepts only the reviewed exact bytes and one canonical file', () => {
    const source = 'SYNTHETIC POLICY FOR UNIT TEST ONLY'
    const hash = createHash('sha256').update(source).digest('hex')
    const fixture = { source: { files: [{ name: 'firestore.rules', content: source }] } }
    expect(verifyPublishedHubRulesSource(fixture, hash)).toBe(hash)
    expect(() => verifyPublishedHubRulesSource(fixture)).toThrow('POLICY_DRIFT')
    for (const value of [{}, { source: { files: [] } }, { source: { files: [{ name: 'local.rules', content: source }] } },
      { source: { files: [{ name: 'firestore.rules', content: source }, { name: 'extra', content: source }] } }]) {
      expect(() => verifyPublishedHubRulesSource(value, hash)).toThrow('SOURCE_INVALID')
    }
  })
  it('keeps all production writes limited to Hosting and preserves recovery/proof', () => {
    const workflow = readFileSync('.github/workflows/firebase-hosting-deploy.yml', 'utf8')
    expect(workflow).not.toMatch(/deploy\s+--only\s+firestore|--request\s+(POST|PATCH)|--data-binary/)
    expect(workflow).toContain('node ops/verify-shared-hub-rules.mjs')
    expect(workflow).toContain('--only hosting:nestjourney')
    expect(workflow).toContain('Restore captured Hosting version on failure')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_CORE_IAM_UNCHANGED')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_EXACT_RELEASE_SHA')
  })
})
