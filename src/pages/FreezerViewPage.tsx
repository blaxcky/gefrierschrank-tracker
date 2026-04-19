import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Navbar, Fab } from 'konsta/react'
import { synchronizeHousehold, useFirstFreezer, useDrawers, usePendingSyncCount, useSyncConflicts } from '../hooks/useFreezerData'
import FreezerBody from '../components/freezer/FreezerBody'
import DrawerList from '../components/freezer/DrawerList'
import AddDrawerSheet from '../components/freezer/AddDrawerSheet'
import ReloadPrompt from '../components/common/ReloadPrompt'
import type { Drawer } from '../db/database'
import { useSessionStore } from '../store/useSessionStore'
import { getExportReminderInfo } from '../utils/export'

export default function FreezerViewPage() {
  const freezer = useFirstFreezer()
  const drawers = useDrawers(freezer?.id)
  const pendingSyncCount = usePendingSyncCount()
  const conflicts = useSyncConflicts()
  const isLocalOnly = useSessionStore((state) => state.status === 'local_only')
  const isSyncing = useSessionStore((state) => state.isSyncing)
  const syncError = useSessionStore((state) => state.syncError)
  const navigate = useNavigate()
  const exportReminder = getExportReminderInfo()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDrawer, setEditDrawer] = useState<Drawer | null>(null)
  const hasOpenSync = !isLocalOnly && (
    (pendingSyncCount ?? 0) > 0
    || (conflicts?.length ?? 0) > 0
    || Boolean(syncError)
  )

  const handleLongPress = (drawer: Drawer) => {
    setEditDrawer(drawer)
    setSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    setEditDrawer(null)
  }

  const handleSync = async () => {
    if (isLocalOnly || isSyncing) return

    try {
      await synchronizeHousehold()
    } catch {
      alert('Synchronisation fehlgeschlagen. Bitte Verbindung und Supabase-Konfiguration pruefen.')
    }
  }

  return (
    <Page>
      <Navbar
        title={freezer?.name ?? 'Gefrierschrank'}
        right={
          <div className="topbar-action-group">
            {!isLocalOnly && (
              <button
                onClick={() => { void handleSync() }}
                className={`topbar-icon-btn sync-status-btn ${hasOpenSync ? 'sync-pending' : 'sync-ok'} ${isSyncing ? 'sync-active' : ''}`}
                aria-label={hasOpenSync ? 'Synchronisation mit offenen Aenderungen starten' : 'Jetzt synchronisieren'}
                title={hasOpenSync ? 'Offene Synchronisation' : 'Alles synchronisiert'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 1-15.5 6.36" />
                  <path d="M3 12a9 9 0 0 1 15.5-6.36" />
                  <polyline points="7 17 5.5 18.5 4 17" />
                  <polyline points="17 7 18.5 5.5 20 7" />
                </svg>
              </button>
            )}

            <button
              onClick={() => navigate('/settings')}
              className="topbar-icon-btn settings-icon-btn"
              aria-label="Einstellungen öffnen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        }
      />

      <FreezerBody>
        {isLocalOnly && (
          <div
            style={{
              margin: '0 12px 12px',
              background: '#ECFDF5',
              border: '1px solid #86EFAC',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#166534',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            Lokaler Modus aktiv. Deine Daten bleiben nur auf diesem Gerät, bis Supabase eingerichtet ist.
          </div>
        )}

        {!isLocalOnly && (conflicts?.length ?? 0) > 0 && (
          <div
            style={{
              margin: '0 12px 12px',
              background: '#FFF7ED',
              border: '1px solid #FDBA74',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: '#9A3412' }}>
              Sync-Konflikte offen
            </div>
            <p style={{ margin: '6px 0 10px', color: '#9A3412', fontSize: 13, lineHeight: 1.4 }}>
              {conflicts?.length} Datensatze brauchen eine Entscheidung zwischen lokaler und Cloud-Version.
            </p>
            <button
              onClick={() => navigate('/sync-konflikte')}
              style={{
                background: '#EA580C',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Konflikte ansehen
            </button>
          </div>
        )}

        {!isLocalOnly && (pendingSyncCount ?? 0) > 0 && (
          <div
            style={{
              margin: '0 12px 12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#1D4ED8',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {pendingSyncCount ?? 0} Anderungen warten noch auf Synchronisation.
          </div>
        )}

        {exportReminder.shouldShow && (
          <div
            style={{
              margin: '0 12px 12px',
              background: '#FFF3CD',
              border: '1px solid #F5D67A',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, color: '#6B4F00' }}>
              Export empfohlen
            </div>
            <p style={{ margin: '6px 0 10px', color: '#6B4F00', fontSize: 13, lineHeight: 1.4 }}>
              {exportReminder.lastExportAt
                ? `Der letzte Export war vor ${exportReminder.daysSinceLastExport} Tagen. Bitte Daten erneut exportieren.`
                : 'Es wurde noch kein Export gemacht. Bitte erstelle jetzt ein Backup deiner Daten.'}
            </p>
            <button
              onClick={() => navigate('/settings')}
              style={{
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
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

        <div style={{ margin: '12px 10px 2px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/lagerdauer')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8E8E93',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '6px 8px',
            }}
          >
            Lagerdauer öffnen
          </button>
        </div>
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
