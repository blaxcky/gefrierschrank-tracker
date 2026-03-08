import { formatFrozenDuration } from '../../utils/dates'

interface FrozenDurationBadgeProps {
  date: Date
}

export default function FrozenDurationBadge({ date }: FrozenDurationBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        background: '#E8F3FF',
        color: '#0A66C2',
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 8px',
      }}
    >
      {formatFrozenDuration(date)}
    </span>
  )
}
