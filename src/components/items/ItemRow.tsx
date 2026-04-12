import { useState, useRef, useMemo, useCallback, memo } from 'react'
import type { Item, Tag } from '../../db/database'
import FrozenDurationBadge from '../common/FrozenDurationBadge'
import { formatDate } from '../../utils/dates'

interface ItemRowProps {
  item: Item
  tags: Tag[]
  onDelete: (id: string) => void
  onEdit: (item: Item) => void
  onRemove: (item: Item) => void
}

export default memo(function ItemRow({ item, tags, onDelete, onEdit, onRemove }: ItemRowProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const suppressClickRef = useRef(false)
  const direction = useRef<'none' | 'horizontal' | 'vertical'>('none')

  const tagObjects = useMemo(
    () => tags.filter(t => item.tags.includes(t.name)),
    [tags, item.tags]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    startOffset.current = offsetX
    suppressClickRef.current = false
    direction.current = 'none'
    setSwiping(true)
  }, [offsetX])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (direction.current === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      direction.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      suppressClickRef.current = true
    }

    if (direction.current === 'vertical') return

    e.preventDefault()
    const diff = dx + startOffset.current
    setOffsetX(Math.max(-100, Math.min(100, diff)))
  }, [swiping])

  const handleTouchEnd = useCallback(() => {
    setSwiping(false)
    if (direction.current === 'horizontal') {
      if (offsetX < -60) {
        setOffsetX(0)
        onDelete(item.id)
      } else if (offsetX > 60) {
        setOffsetX(0)
        onRemove(item)
      } else {
        setOffsetX(0)
      }
    } else {
      setOffsetX(0)
    }
    direction.current = 'none'
  }, [offsetX, item, onDelete, onRemove])

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    onEdit(item)
  }, [item, onEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEdit(item)
    }
  }, [item, onEdit])

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Swipe-right: green "Entnehmen" action */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 100,
          background: '#34C759',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
        onClick={() => onRemove(item)}
      >
        Entnehmen
      </div>

      {/* Swipe-left: red "Löschen" action */}
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

      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease',
          background: 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #F2F2F7',
          position: 'relative',
          zIndex: 1,
        }}
        role="button"
        tabIndex={0}
        aria-label={`${item.name} bearbeiten`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{item.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ color: '#8E8E93', fontSize: 13 }}>
                Eingefroren: {formatDate(item.dateAdded)}
              </span>
              <FrozenDurationBadge date={item.dateAdded} />
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
