export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function toStartOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export function getFrozenDays(date: Date, now = new Date()): number {
  const start = toStartOfDay(date)
  const today = toStartOfDay(now)
  const diff = today.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

export function formatFrozenDuration(date: Date, now = new Date()): string {
  const days = getFrozenDays(date, now)
  if (days === 0) return 'heute eingefroren'
  if (days === 1) return 'seit 1 Tag eingefroren'
  return `seit ${days} Tagen eingefroren`
}
