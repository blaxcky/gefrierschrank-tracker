const LOCAL_MODE_KEY = 'gefrierschrank:local-only-mode'

export function isLocalOnlyPreferred() {
  return localStorage.getItem(LOCAL_MODE_KEY) === 'true'
}

export function setLocalOnlyPreferred(enabled: boolean) {
  if (enabled) {
    localStorage.setItem(LOCAL_MODE_KEY, 'true')
    return
  }

  localStorage.removeItem(LOCAL_MODE_KEY)
}
