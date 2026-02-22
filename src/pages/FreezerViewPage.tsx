import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Actions,
  ActionsButton,
  ActionsGroup,
  List,
  ListItem,
  Page,
  Navbar,
} from 'konsta/react'
import { useFirstFreezer, useDrawers } from '../hooks/useFreezerData'
import FreezerBody from '../components/freezer/FreezerBody'
import DrawerList from '../components/freezer/DrawerList'
import AddDrawerSheet from '../components/freezer/AddDrawerSheet'
import ReloadPrompt from '../components/common/ReloadPrompt'
import type { Drawer } from '../db/database'
import { getExportReminderInfo } from '../utils/export'
import PickDrawerSheet from '../components/freezer/PickDrawerSheet'
import AddItemSheet from '../components/items/AddItemSheet'

export default function FreezerViewPage() {
  const freezer = useFirstFreezer()
  const drawers = useDrawers(freezer?.id)
  const navigate = useNavigate()
  const exportReminder = getExportReminderInfo()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDrawer, setEditDrawer] = useState<Drawer | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [pickDrawerOpen, setPickDrawerOpen] = useState(false)
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)

  const handleLongPress = (drawer: Drawer) => {
    setEditDrawer(drawer)
    setSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    setEditDrawer(null)
  }

  const handlePickDrawer = (drawerId: string) => {
    setPickDrawerOpen(false)
    setSelectedDrawerId(drawerId)
    setItemSheetOpen(true)
  }

  const handleCloseItemSheet = () => {
    setItemSheetOpen(false)
    setSelectedDrawerId(null)
  }

  const IconGear = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )

  const IconPlus = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )

  const IconClock = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )

  return (
    <Page>
      <Navbar
        large
        title={freezer?.name ?? 'Mein Gefrierschrank'}
        right={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <button
              className="ft-icon-btn"
              onClick={() => setAddMenuOpen(true)}
              aria-label="Hinzufügen"
              type="button"
            >
              {IconPlus}
            </button>
            <button
              className="ft-icon-btn"
              onClick={() => navigate('/settings')}
              aria-label="Einstellungen öffnen"
              type="button"
            >
              {IconGear}
            </button>
          </div>
        }
      />

      <FreezerBody>
        {exportReminder.shouldShow && (
          <div className="ft-callout" style={{ marginBottom: 12 }}>
            <div className="ft-callout-title">Export empfohlen</div>
            <p className="ft-callout-text">
              {exportReminder.lastExportAt
                ? `Der letzte Export war vor ${exportReminder.daysSinceLastExport} Tagen. Bitte Daten erneut exportieren.`
                : 'Es wurde noch kein Export gemacht. Bitte erstelle jetzt ein Backup deiner Daten.'}
            </p>
            <button
              onClick={() => navigate('/settings')}
              type="button"
              style={{
                background: 'var(--ft-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Jetzt exportieren
            </button>
          </div>
        )}
        <DrawerList
          drawers={drawers ?? []}
          onLongPressDrawer={handleLongPress}
        />

        <div style={{ marginTop: 12 }}>
          <List strongIos insetIos>
            <ListItem
              title="Ablauf-Check öffnen"
              media={<span style={{ color: 'var(--ft-secondary-label)' }}>{IconClock}</span>}
              link
              linkComponent="button"
              linkProps={{
                type: 'button',
                onClick: () => navigate('/ablauf-check'),
                'aria-label': 'Ablauf-Check öffnen',
              }}
            />
          </List>
        </div>
      </FreezerBody>

      <Actions
        opened={addMenuOpen}
        onBackdropClick={() => setAddMenuOpen(false)}
      >
        <ActionsGroup>
          <ActionsButton
            onClick={() => {
              setAddMenuOpen(false)
              setPickDrawerOpen(true)
            }}
          >
            Produkt hinzufügen
          </ActionsButton>
          <ActionsButton
            onClick={() => {
              setAddMenuOpen(false)
              setEditDrawer(null)
              setSheetOpen(true)
            }}
          >
            Fach hinzufügen
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setAddMenuOpen(false)}>
            Abbrechen
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <PickDrawerSheet
        opened={pickDrawerOpen}
        onClose={() => setPickDrawerOpen(false)}
        drawers={drawers ?? []}
        onPickDrawer={handlePickDrawer}
      />

      {selectedDrawerId && (
        <AddItemSheet
          opened={itemSheetOpen}
          onClose={handleCloseItemSheet}
          drawerId={selectedDrawerId}
        />
      )}

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
