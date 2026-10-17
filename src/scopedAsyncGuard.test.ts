import { describe, expect, it } from 'vitest'
import { createScopedAsyncGuard } from './scopedAsyncGuard'

describe('scoped async operations: two-unit simulated pilot', () => {
  it('discards a late Industrial OCR response after switching to Monte Castelo', () => {
    const guard = createScopedAsyncGuard()
    const industrial = guard.start('org-a/industrial')
    guard.invalidate()
    const monte = guard.start('org-a/monte-castelo')
    expect(guard.isCurrent(industrial, 'org-a/industrial')).toBe(false)
    expect(guard.isCurrent(industrial, 'org-a/monte-castelo')).toBe(false)
    expect(guard.isCurrent(monte, 'org-a/monte-castelo')).toBe(true)
  })
  it('drops a superseded image and ignores completion after unmount', () => {
    const guard = createScopedAsyncGuard()
    const first = guard.start('org-a/industrial')
    const second = guard.start('org-a/industrial')
    expect(guard.isCurrent(first, 'org-a/industrial')).toBe(false)
    expect(guard.isCurrent(second, 'org-a/industrial')).toBe(true)
    guard.dispose()
    expect(guard.isCurrent(second, 'org-a/industrial')).toBe(false)
  })
  it('never accepts a different organization with the same unit ID', () => {
    const guard = createScopedAsyncGuard()
    const t = guard.start('church-one/industrial')
    expect(guard.isCurrent(t, 'church-two/industrial')).toBe(false)
  })
})
