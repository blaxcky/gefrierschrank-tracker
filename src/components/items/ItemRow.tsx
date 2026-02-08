import { useState, useRef, useMemo, useCallback, memo } from 'react'
import type { Item, Tag } from '../../db/database'
import ExpiryBadge from '../common/ExpiryBadge'
import { formatDate } from '../../utils/dates'
import { isExpired } from '../../utils/dates'

interface ItemRowProps {
  item: Item
  tags: Tag[]
  onDelete: (id: string) => void
  onEdit: (item: Item) => void
}

export default memo(function ItemRow({ item, tags, onDelete, onEdit }: ItemRowProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startOffset = useRef(0)

  const expired = useMemo(
    () => item.expiryDate ? isExpired(item.expiryDate) : false,
    [item.expiryDate]
  )

  const tagObjects = useMemo(
    () => tags.filter(t => item.tags.includes(t.name)),
    [tags, item.tags]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startOffset.current = offsetX
    setSwiping(true)
  }, [offsetX])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return
    const diff = e.touches[0].clientX - startX.current + startOffset.current
    setOffsetX(Math.max(-100, Math.min(100, diff)))
  }, [swiping])

  const handleTouchEnd = useCallback(() => {
    setSwiping(false)
    if (offsetX < -60) {
      setOffsetX(-100)
    } else if (offsetX > 60) {
      setOffsetX(100)
    } else {
      setOffsetX(0)
    }
  }, [offsetX])

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Edit button behind (left side) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 100,
          background: '#007AFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
        onClick={() => onEdit(item)}
      >
        Bearbeiten
      </div>

      {/* Delete button behind (right side) */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 100,
          background: '#FF3B30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
        onClick={() => onDelete(item.id)}
      >
        Löschen
      </div>

      {/* Item content */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease',
          background: expired ? '#FFF5F5' : 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #F2F2F7',
          position: 'relative',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {expired && <span style={{ fontSize: 14 }}>&#9888;&#65039;</span>}
              <span style={{ fontSize: 16, fontWeight: 500 }}>{item.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ color: '#8E8E93', fontSize: 13 }}>
                {formatDate(item.dateAdded)}
              </span>
              {item.expiryDate && <ExpiryBadge date={item.expiryDate} />}
            </div>
            {tagObjects.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {tagObjects.map(tag => (
                  <span
                    key={tag.id}
                    className="tag-chip"
                    style={{
                      backgroundColor: tag.color + '22',
                      color: tag.color,
                      fontSize: 11,
                      padding: '1px 8px',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {item.notes && (
              <p style={{ color: '#AEAEB2', fontSize: 12, fontStyle: 'italic', margin: '4px 0 0' }}>
                {item.notes}
              </p>
            )}
          </div>
          <span style={{ color: '#8E8E93', fontSize: 14, whiteSpace: 'nowrap', marginLeft: 8 }}>
            {item.quantity} {item.unit}
          </span>
        </div>
      </div>
    </div>
  )
})
