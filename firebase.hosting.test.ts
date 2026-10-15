import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { verifyConnectReleaseText } from './ops/verify-connect-release.mjs'

describe('Firebase Hosting migration contract', () => {
  it('keeps NestJourney isolated on its dedicated Hosting target', () => {
    const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'))
    expect(firebase.hosting.target).toBe('nestjourney')
    expect(firebase.hosting.public).toBe('dist')
    expect(firebase.hosting.rewrites).toEqual([
      { source: '/api/core/support/draft', run: { serviceId: 'connect-api', region: 'us-central1' } },
      { source: '**', destination: '/index.html' },
    ])
    expect(firebase.hosting.headers).toContainEqual({ source: '/connect-release.json', headers: [{ key: 'Cache-Control', value: 'no-cache,no-store,must-revalidate' }] })

    const rc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'))
    expect(rc.projects.default).toBe('millionsnest')
    expect(rc.targets.millionsnest.hosting.nestjourney).toEqual(['mn-nestjourney-555464791734'])
  })

  it('requires exact public release and authority probes with captured-version recovery', () => {
    const workflow = fs.readFileSync('.github/workflows/firebase-hosting-deploy.yml', 'utf8')
    expect(workflow.indexOf('Capture Hosting recovery')).toBeLessThan(workflow.indexOf('name: Deploy Hosting'))
    expect(workflow).toContain('JOURNEY_HOSTING_RELEASE_STARTED=true')
    expect(workflow).toContain("(failure() || cancelled()) && env.JOURNEY_HOSTING_RELEASE_STARTED == 'true'")
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('hosting:clone "mn-nestjourney-555464791734@${PREVIOUS_JOURNEY_HOSTING_VERSION##*/}"')
    expect(workflow).toContain('node ops/verify-connect-release.mjs')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_ARTIFACT_READY_SHA=')
    expect(workflow).toContain('connect-release-$GITHUB_SHA.json')
    expect(workflow).toContain('for attempt in $(seq 1 20)')
    expect(workflow).toContain('test "$ready" = 1')
    expect(workflow).toContain('https://mn-nestjourney-555464791734.web.app https://nestjourney.millionsnest.com')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_SUPPORT_AUTHORITY_OK')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_CORE_IAM_UNCHANGED')
  })

  it('accepts only exact structured release proof, never stale HTML, another SHA or schema', () => {
    const sha = 'a'.repeat(40)
    const valid = { schemaVersion: 1, product: 'nestjourney', releaseSha: sha }
    expect(verifyConnectReleaseText(JSON.stringify(valid), sha)).toBe(true)
    for (const content of ['<!doctype html><html>old SPA</html>', '{}', 'null', '[]', 'invalid JSON',
      JSON.stringify({ ...valid, releaseSha: 'b'.repeat(40) }), JSON.stringify({ ...valid, schemaVersion: 2 }),
      JSON.stringify({ ...valid, product: 'another-app' })]) {
      expect(verifyConnectReleaseText(content, sha)).toBe(false)
    }
    expect(verifyConnectReleaseText(JSON.stringify(valid), '')).toBe(false)
  })

  it('preserves the current Vercel rollback path as manual-only', () => {
    const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
    expect(vercel.git?.deploymentEnabled).toBe(false)
  })
})
