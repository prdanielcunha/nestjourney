import { afterEach, describe, expect, it, vi } from 'vitest'
import { OperationTimeoutError, withTimeout } from './asyncGuard'

afterEach(() => vi.useRealTimers())

describe('withTimeout', () => {
  it('returns the original result before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100, 'access')).resolves.toBe('ok')
  })

  it('fails predictably instead of leaving the UI waiting forever', async () => {
    vi.useFakeTimers()
    const pending = new Promise<string>(() => undefined)
    const guarded = withTimeout(pending, 100, 'access')
    const assertion = expect(guarded).rejects.toEqual(new OperationTimeoutError('access'))

    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })
})
