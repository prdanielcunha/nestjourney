import { useEffect, useRef, type RefObject } from 'react'

let lockCount = 0
let restoreDocument: (() => void) | null = null

/**
 * iOS Safari can scroll the page behind a fixed dialog when only the overlay
 * has overflow: hidden. Freeze the actual document, and restore its position.
 * Locks are reference-counted so a nested dialog cannot unlock another one.
 */
export function acquireModalScrollLock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  if (lockCount++ === 0) {
    const body = document.body
    const html = document.documentElement
    const y = window.scrollY
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    restoreDocument = () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      html.style.overflow = previous.htmlOverflow
      html.style.overscrollBehavior = previous.htmlOverscroll
      window.scrollTo(0, y)
    }
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--lockCount === 0) {
      restoreDocument?.()
      restoreDocument = null
    }
  }
}

/** Background scroll lock, Escape-to-close and keyboard focus containment. */
export function useModalDialog(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  busy: boolean,
) {
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  closeRef.current = onClose
  busyRef.current = busy

  useEffect(() => {
    const unlock = acquireModalScrollLock()
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const dialog = ref.current
    dialog?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.preventDefault()
          closeRef.current()
        }
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      if (!items.length) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlock()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [ref])
}
