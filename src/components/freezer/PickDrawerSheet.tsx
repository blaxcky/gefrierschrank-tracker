import { Sheet, List, ListItem } from 'konsta/react'
import type { Drawer } from '../../db/database'
import { useDrawerStats } from '../../hooks/useFreezerData'

interface PickDrawerSheetProps {
  opened: boolean
  onClose: () => void
  drawers: Drawer[]
  onPickDrawer: (drawerId: string) => void
}

function PickDrawerRow({ drawer, onPick }: { drawer: Drawer; onPick: () => void }) {
  const stats = useDrawerStats(drawer.id)
  const itemCount = stats?.itemCount ?? 0

  return (
    <ListItem
      title={drawer.name}
      media={
        <span
          className="ft-dot"
          style={{ width: 12, height: 12, backgroundColor: drawer.color, marginLeft: 2 }}
          aria-hidden
        />
      }
      after={<span className="ft-count-pill">{itemCount}</span>}
      link
      linkComponent="button"
      linkProps={{
        type: 'button',
        onClick: onPick,
        'aria-label': drawer.name,
      }}
    />
  )
}

export default function PickDrawerSheet({ opened, onClose, drawers, onPickDrawer }: PickDrawerSheetProps) {
  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      style={{ height: 'auto', maxHeight: '75vh', overflow: 'auto', overscrollBehavior: 'contain' }}
    >
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'var(--ft-tertiary-fill)', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            type="button"
            style={{ color: 'var(--ft-blue)', background: 'none', border: 'none', fontSize: 17, padding: '8px 0', minWidth: 80, textAlign: 'left' }}
          >
            Abbrechen
          </button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Produkt hinzufügen</span>
          <span style={{ minWidth: 80 }} />
        </div>
      </div>

      <div style={{ padding: '8px 16px 16px' }}>
        <List strongIos insetIos>
          {drawers.map((drawer) => (
            <PickDrawerRow
              key={drawer.id}
              drawer={drawer}
              onPick={() => onPickDrawer(drawer.id)}
            />
          ))}
        </List>
      </div>
    </Sheet>
  )
}
