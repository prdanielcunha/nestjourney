import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('Firebase Hosting migration contract', () => {
  it('keeps NestJourney isolated on its dedicated Hosting target', () => {
    const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'))
    expect(firebase.hosting.target).toBe('nestjourney')
    expect(firebase.hosting.public).toBe('dist')
    expect(firebase.hosting.rewrites).toEqual([{ source: '**', destination: '/index.html' }])

    const rc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'))
    expect(rc.targets.millionsnest.hosting.nestjourney).toEqual(['mn-nestjourney-555464791734'])
  })

  it('preserves the current Vercel rollback path as manual-only', () => {
    const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
    expect(vercel.git?.deploymentEnabled).toBe(false)
  })
})
