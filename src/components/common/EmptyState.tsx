interface EmptyStateProps {
  icon: string
  title: string
  subtitle?: string
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p style={{ fontSize: 17, fontWeight: 600, margin: '0 0 4px' }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 14, margin: 0 }}>{subtitle}</p>
      )}
    </div>
  )
}
