import type { Drawer } from '../../db/database'
import FreezerDrawer from './FreezerDrawer'
import { List } from 'konsta/react'

interface DrawerListProps {
  drawers: Drawer[]
  onLongPressDrawer: (drawer: Drawer) => void
}

export default function DrawerList({ drawers, onLongPressDrawer }: DrawerListProps) {
  if (drawers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#10052;</div>
        <p style={{ fontSize: 17, fontWeight: 600, margin: '0 0 4px', color: 'var(--ft-label)' }}>
          Keine Fächer
        </p>
        <p style={{ fontSize: 14, margin: 0 }}>
          Tippe auf + um ein Fach hinzuzufügen
        </p>
      </div>
    )
  }

  return (
    <List strongIos insetIos>
      {drawers.map((drawer) => (
        <FreezerDrawer
          key={drawer.id}
          drawer={drawer}
          onLongPress={onLongPressDrawer}
        />
      ))}
    </List>
  )
}
