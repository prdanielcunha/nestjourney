import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
// Canonical Hub birthday/RBAC candidate from production release PR #411; publish and verify exact live SHA before NestJourney deploy. This app must never publish local Rules/indexes.
export const APPROVED_HUB_RULES_SHA256 = 'ab56bc078be365862668038b4562cf01f4dc12befeb1fc0c8d40d30fb2a2ebc1'
export function verifyPublishedHubRulesSource(value, expected = APPROVED_HUB_RULES_SHA256) {
  const files = value?.source?.files
  if (!Array.isArray(files) || files.length !== 1 || files[0]?.name !== 'firestore.rules' ||
      typeof files[0].content !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw Error('JOURNEY_HUB_RULES_SOURCE_INVALID')
  const actual = createHash('sha256').update(files[0].content).digest('hex')
  if (actual !== expected) throw Error('JOURNEY_HUB_CANONICAL_POLICY_DRIFT')
  return actual
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sha = verifyPublishedHubRulesSource(JSON.parse(readFileSync(process.argv[2], 'utf8')))
    console.log('NESTJOURNEY_HUB_RULES_READONLY_OK=' + sha)
  } catch {
    console.error('NESTJOURNEY_HUB_RULES_PROOF_FAILED')
    process.exitCode = 1
  }
}
