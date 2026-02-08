import type { Drawer } from '../../db/database'
import FreezerDrawer from './FreezerDrawer'

interface DrawerListProps {
  drawers: Drawer[]
  onLongPressDrawer: (drawer: Drawer) => void
}

export default function DrawerList({ drawers, onLongPressDrawer }: DrawerListProps) {
  if (drawers.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: '#AEAEB2',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>&#10052;</div>
        <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px', color: '#8E8E93' }}>Keine Fächer</p>
        <p style={{ fontSize: 13, margin: 0 }}>
          Tippe auf + um ein Fach hinzuzufügen
        </p>
      </div>
    )
  }

  return (
    <>
      {drawers.map((drawer) => (
        <FreezerDrawer
          key={drawer.id}
          drawer={drawer}
          onLongPress={onLongPressDrawer}
        />
      ))}
    </>
  )
}
