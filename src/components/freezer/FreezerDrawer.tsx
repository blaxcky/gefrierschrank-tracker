import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useItemCount, useExpiredItemCount } from '../../hooks/useFreezerData'
import type { Drawer } from '../../db/database'

interface FreezerDrawerProps {
  drawer: Drawer
  onLongPress: (drawer: Drawer) => void
}

export default function FreezerDrawer({ drawer, onLongPress }: FreezerDrawerProps) {
  const navigate = useNavigate()
  const itemCount = useItemCount(drawer.id)
  const expiredCount = useExpiredItemCount(drawer.id)

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

  return (
    <motion.div
      className="drawer-slot"
      whileTap={{ scale: 0.97 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {(expiredCount ?? 0) > 0 && <div className="warning-dot" />}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="color-dot" style={{ backgroundColor: drawer.color }} />
        <div className="drawer-handle" />
        <span style={{ fontSize: 16, fontWeight: 500 }}>{drawer.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="item-count-badge">{itemCount ?? 0}</span>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ opacity: 0.3 }}>
          <path d="M1 1L7 7L1 13" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  )
}
