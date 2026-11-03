import { afterEach, describe, expect, it, vi } from 'vitest'
import { acquireModalScrollLock } from './useModalDialog'

afterEach(() => vi.unstubAllGlobals())

describe('iOS modal background scroll lock', () => {
  it('freezes the page and restores the exact scroll position and styles', () => {
    const bodyStyle = {
      position: 'relative', top: '', left: '', right: '', width: '',
      overflow: 'auto',
    }
    const htmlStyle = { overflow: 'visible', overscrollBehavior: 'auto' }
    const scrollTo = vi.fn()
    vi.stubGlobal('window', { scrollY: 316, scrollTo })
    vi.stubGlobal('document', {
      body: { style: bodyStyle },
      documentElement: { style: htmlStyle },
    })
    const unlock = acquireModalScrollLock()
    expect(bodyStyle.position).toBe('fixed')
    expect(bodyStyle.top).toBe('-316px')
    expect(bodyStyle.overflow).toBe('hidden')
    expect(htmlStyle.overflow).toBe('hidden')
    expect(htmlStyle.overscrollBehavior).toBe('none')

    unlock()
    expect(bodyStyle.position).toBe('relative')
    expect(bodyStyle.top).toBe('')
    expect(bodyStyle.overflow).toBe('auto')
    expect(htmlStyle.overflow).toBe('visible')
    expect(htmlStyle.overscrollBehavior).toBe('auto')
    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith(0, 316)
  })

  it('does not unlock the background while a second dialog still owns it', () => {
    const bodyStyle = { position: '', top: '', left: '', right: '', width: '', overflow: '' }
    const htmlStyle = { overflow: '', overscrollBehavior: '' }
    const scrollTo = vi.fn()
    vi.stubGlobal('window', { scrollY: 90, scrollTo })
    vi.stubGlobal('document', {
      body: { style: bodyStyle }, documentElement: { style: htmlStyle },
    })
    const releaseA = acquireModalScrollLock()
    const releaseB = acquireModalScrollLock()
    releaseA()
    expect(bodyStyle.position).toBe('fixed')
    expect(scrollTo).not.toHaveBeenCalled()
    releaseA()
    expect(bodyStyle.position).toBe('fixed')
    releaseB()
    expect(bodyStyle.position).toBe('')
    expect(scrollTo).toHaveBeenCalledOnce()
  })
})
