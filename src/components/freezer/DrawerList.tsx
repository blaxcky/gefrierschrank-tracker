import type { Drawer } from '../../db/database'
import FreezerDrawer from './FreezerDrawer'
import EmptyState from '../common/EmptyState'

interface DrawerListProps {
  drawers: Drawer[]
  onLongPressDrawer: (drawer: Drawer) => void
}

export default function DrawerList({ drawers, onLongPressDrawer }: DrawerListProps) {
  if (drawers.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Keine Fächer"
        subtitle="Tippe auf + um ein Fach hinzuzufügen"
      />
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
