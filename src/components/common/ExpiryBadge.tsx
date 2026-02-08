import { isExpired, isExpiringSoon, formatDateShort } from '../../utils/dates'

interface ExpiryBadgeProps {
  date: Date
}

export default function ExpiryBadge({ date }: ExpiryBadgeProps) {
  const expired = isExpired(date)
  const expiringSoon = isExpiringSoon(date)

  if (!expired && !expiringSoon) {
    return <span style={{ color: '#8E8E93', fontSize: 13 }}>MHD: {formatDateShort(date)}</span>
  }

  return (
    <span className={expired ? 'expiry-warning' : 'expiry-soon'} style={{ fontSize: 13 }}>
      {expired ? '⚠️' : '⏰'} MHD: {formatDateShort(date)}
    </span>
  )
}
