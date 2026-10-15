import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

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
    expect(workflow).toContain('d.releaseSha!==process.env.GITHUB_SHA')
    expect(workflow).toContain('https://mn-nestjourney-555464791734.web.app https://nestjourney.millionsnest.com')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_SUPPORT_AUTHORITY_OK')
    expect(workflow).toContain('NESTJOURNEY_CONNECT_CORE_IAM_UNCHANGED')
  })

  it('preserves the current Vercel rollback path as manual-only', () => {
    const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
    expect(vercel.git?.deploymentEnabled).toBe(false)
  })
})
