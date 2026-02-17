let lockCount = 0
let previousBodyOverflow = ''
let previousBodyTouchAction = ''
let previousHtmlOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    previousBodyTouchAction = document.body.style.touchAction
    previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) return

  lockCount -= 1

  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
    document.body.style.touchAction = previousBodyTouchAction
    document.documentElement.style.overflow = previousHtmlOverflow
  }
}
