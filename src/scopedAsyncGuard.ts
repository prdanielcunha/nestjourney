/**
 * A monotonic scoped intent guard prevents an async file extraction or data load
 * from publishing a stale result after a unit switch, a new request or unmount.
 */
export function createScopedAsyncGuard() {
  let version = 0
  let scope = ''
  let active = true
  return {
    start(nextScope: string) {
      scope = nextScope
      version += 1
      return version
    },
    isCurrent(token: number, expectedScope: string) {
      return active && token === version && scope === expectedScope
    },
    invalidate() {
      version += 1
      scope = ''
    },
    dispose() {
      active = false
      version += 1
      scope = ''
    },
  }
}
