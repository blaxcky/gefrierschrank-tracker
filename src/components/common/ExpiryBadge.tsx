import { isExpired, isExpiringSoon, formatDateShort } from '../../utils/dates'

interface ExpiryBadgeProps {
  date: Date
}

export default function ExpiryBadge({ date }: ExpiryBadgeProps) {
  const expired = isExpired(date)
  const expiringSoon = isExpiringSoon(date)

  if (!expired && !expiringSoon) {
    return (
      <span className="ft-expiry-pill ft-expiry-pill--quiet">
        MHD: {formatDateShort(date)}
      </span>
    )
  }

  return (
    <span
      className={
        expired
          ? 'ft-expiry-pill ft-expiry-pill--expired'
          : 'ft-expiry-pill ft-expiry-pill--soon'
      }
      aria-label={expired ? 'MHD abgelaufen' : 'MHD bald fällig'}
    >
      MHD: {formatDateShort(date)}
    </span>
  )
}
