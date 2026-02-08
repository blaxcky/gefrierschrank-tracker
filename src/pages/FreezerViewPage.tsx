import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Navbar, Fab, Icon } from 'konsta/react'
import { useFirstFreezer, useDrawers } from '../hooks/useFreezerData'
import FreezerBody from '../components/freezer/FreezerBody'
import DrawerList from '../components/freezer/DrawerList'
import AddDrawerSheet from '../components/freezer/AddDrawerSheet'
import ReloadPrompt from '../components/common/ReloadPrompt'
import type { Drawer } from '../db/database'

export default function FreezerViewPage() {
  const freezer = useFirstFreezer()
  const drawers = useDrawers(freezer?.id)
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDrawer, setEditDrawer] = useState<Drawer | null>(null)

  const handleLongPress = (drawer: Drawer) => {
    setEditDrawer(drawer)
    setSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    setEditDrawer(null)
  }

  return (
    <Page>
      <Navbar
        title={freezer?.name ?? 'Gefrierschrank'}
        right={
          <button
            onClick={() => navigate('/settings')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            <Icon>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Icon>
          </button>
        }
      />

      <FreezerBody>
        <DrawerList
          drawers={drawers ?? []}
          onLongPressDrawer={handleLongPress}
        />
      </FreezerBody>

      <Fab
        className="fixed right-4 bottom-6 z-20"
        onClick={() => {
          setEditDrawer(null)
          setSheetOpen(true)
        }}
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        }
      />

      {freezer && (
        <AddDrawerSheet
          opened={sheetOpen}
          onClose={handleCloseSheet}
          freezerId={freezer.id}
          editDrawer={editDrawer}
        />
      )}

      <ReloadPrompt />
    </Page>
  )
}
