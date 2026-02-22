import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrawerStats } from '../../hooks/useFreezerData'
import type { Drawer } from '../../db/database'
import { ListItem } from 'konsta/react'

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
    <ListItem
      title={drawer.name}
      subtitle={previewDisplay || '\u00A0'}
      media={
        <span
          className="ft-dot"
          style={{ width: 12, height: 12, backgroundColor: drawer.color, marginLeft: 2 }}
          aria-hidden
        />
      }
      after={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="ft-count-pill">{itemCount}</span>
          {expiredCount > 0 && <span className="ft-dot ft-dot-danger" aria-hidden />}
        </span>
      }
      link
      linkComponent="button"
      linkProps={{
        type: 'button',
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerLeave: handlePointerLeave,
        onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!isOpening) navigate(`/drawer/${drawer.id}`)
          }
        },
        style: {
          opacity: isEmpty ? 0.82 : 1,
          transition: 'opacity 0.15s ease',
        },
        'aria-label': drawer.name,
      }}
    />
  )
}
