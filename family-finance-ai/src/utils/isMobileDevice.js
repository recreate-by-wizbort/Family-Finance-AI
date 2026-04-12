/** Телефон / планшет с тачем — для свайпа вместо стрелок навигации по периодам. */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const ua = navigator.userAgent || ''
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry/i.test(ua)
  const ipadDesktopUA = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1

  return mobileUA || ipadDesktopUA
}
