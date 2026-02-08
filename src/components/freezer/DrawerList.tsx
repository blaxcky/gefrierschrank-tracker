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
        color: 'rgba(255, 255, 255, 0.35)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>&#10052;</div>
        <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Keine Fächer</p>
        <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.25)' }}>
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
