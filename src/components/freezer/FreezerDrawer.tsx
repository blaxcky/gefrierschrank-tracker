import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrawerStats } from '../../hooks/useFreezerData'
import type { Drawer } from '../../db/database'

interface FreezerDrawerProps {
  drawer: Drawer
  onLongPress: (drawer: Drawer) => void
}

export default function FreezerDrawer({ drawer, onLongPress }: FreezerDrawerProps) {
  const navigate = useNavigate()
  const stats = useDrawerStats(drawer.id)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const items = stats?.items ?? []
  const itemCount = stats?.itemCount ?? 0
  const expiredCount = stats?.expiredCount ?? 0

  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      onLongPress(drawer)
      longPressTimer.current = null
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      setIsOpening(true)
      openTimer.current = setTimeout(() => {
        navigate(`/drawer/${drawer.id}`)
      }, 220)
    }
  }

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      if (openTimer.current) clearTimeout(openTimer.current)
    }
  }, [])

  // Preview: show first few item names
  const previewText = items
    .slice(0, 3)
    .map(i => i.name)
    .join(', ')
  const hasMore = items.length > 3
  const previewDisplay = previewText ? `${previewText}${hasMore ? ', ...' : ''}` : ''
  const isEmpty = itemCount === 0

  return (
    <div
      className={`drawer-slot ${isEmpty ? 'drawer-slot-empty' : ''} ${isOpening ? 'opening' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="drawer-rail">
        <div className="drawer-body drawer-body-overview">
          {/* Handle bar */}
          <div className="drawer-handle-bar" />

          {/* Warning dot for expired items */}
          {expiredCount > 0 && <div className="warning-dot" />}

          {/* Left side: color strip + label */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
            <div className="drawer-color-strip" style={{ backgroundColor: drawer.color }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="drawer-label">
                {drawer.name}
              </div>
              <div className="drawer-preview">
                {previewDisplay || '\u00A0'}
              </div>
            </div>
          </div>

          {/* Right side: count + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="item-count-badge">
              {itemCount}
            </span>
            <svg className="drawer-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1L6 6L1 11" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
