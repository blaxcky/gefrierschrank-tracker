import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useItemCount, useExpiredItemCount, useItems } from '../../hooks/useFreezerData'
import type { Drawer } from '../../db/database'

interface FreezerDrawerProps {
  drawer: Drawer
  onLongPress: (drawer: Drawer) => void
}

export default function FreezerDrawer({ drawer, onLongPress }: FreezerDrawerProps) {
  const navigate = useNavigate()
  const itemCount = useItemCount(drawer.id)
  const expiredCount = useExpiredItemCount(drawer.id)
  const items = useItems(drawer.id)

  let longPressTimer: ReturnType<typeof setTimeout> | null = null

  const handlePointerDown = () => {
    longPressTimer = setTimeout(() => {
      onLongPress(drawer)
      longPressTimer = null
    }, 500)
  }

  const handlePointerUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
      navigate(`/drawer/${drawer.id}`)
    }
  }

  const handlePointerLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  // Preview: show first few item names
  const previewText = (items ?? [])
    .slice(0, 3)
    .map(i => i.name)
    .join(', ')
  const hasMore = (items ?? []).length > 3

  return (
    <motion.div
      className="drawer-slot"
      whileTap={{ scale: 0.98, y: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="drawer-rail">
        <div className="drawer-body">
          {/* Handle bar */}
          <div className="drawer-handle-bar" />

          {/* Warning dot for expired items */}
          {(expiredCount ?? 0) > 0 && <div className="warning-dot" />}

          {/* Left side: color strip + label */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
            <div className="drawer-color-strip" style={{ backgroundColor: drawer.color }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="drawer-label">
                {drawer.name}
              </div>
              {previewText && (
                <div className="drawer-preview">
                  {previewText}{hasMore ? ', ...' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Right side: count + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="item-count-badge">
              {itemCount ?? 0}
            </span>
            <svg className="drawer-chevron" width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1L6 6L1 11" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
