import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
// Reviewed production candidate from Hub PR #402, SHA256 checked against exact main and production source difference. This app must never publish local Rules/indexes.
export const APPROVED_HUB_RULES_SHA256 = '1730f4714c72a835f4db8d2a084ece2c917d81ac69d5ed32d6d45649c9268c58'
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
