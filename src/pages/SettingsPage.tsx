import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogButton,
  List,
  ListInput,
  ListItem,
  Navbar,
  NavbarBackLink,
  Page,
} from 'konsta/react'
import {
  addTag,
  synchronizeHousehold,
  updateFreezer,
  useFirstFreezer,
  usePendingSyncCount,
  useSyncConflicts,
  useTags,
  deleteTag,
} from '../hooks/useFreezerData'
import { exportData, importData, downloadJson, setLastExportAt } from '../utils/export'
import { resetHouseholdData } from '../services/syncService'
import { signOutUser } from '../services/authService'
import { useSessionStore } from '../store/useSessionStore'
import { setLocalOnlyPreferred } from '../utils/localMode'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const TAG_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#8E8E93']

export default function SettingsPage() {
  const navigate = useNavigate()
  const freezer = useFirstFreezer()
  const tags = useTags()
  const conflicts = useSyncConflicts()
  const pendingSyncCount = usePendingSyncCount()
  const status = useSessionStore((state) => state.status)
  const profile = useSessionStore((state) => state.profile)
  const household = useSessionStore((state) => state.household)
  const lastSyncAt = useSessionStore((state) => state.lastSyncAt)
  const isSyncing = useSessionStore((state) => state.isSyncing)
  const syncError = useSessionStore((state) => state.syncError)
  const isLocalOnly = status === 'local_only'

  const [freezerName, setFreezerName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#007AFF')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  const handleSaveName = async () => {
    if (freezer && freezerName.trim()) {
      await updateFreezer(freezer.id, { name: freezerName.trim() })
      await synchronizeHousehold()
    }
    setNameEditing(false)
  }

  const handleExport = async () => {
    const data = await exportData()
    const date = new Date().toISOString().split('T')[0]
    downloadJson(data, `gefrierschrank-backup-${date}.json`)
    setLastExportAt()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()

    try {
      await importData(text)
      await synchronizeHousehold()
      alert('Import erfolgreich.')
    } catch {
      alert('Fehler beim Import. Bitte pruefe die Datei.')
    }

    event.target.value = ''
  }

  const handleClearAll = async () => {
    await resetHouseholdData()
    setShowClearConfirm(false)

    try {
      await synchronizeHousehold()
    } catch {
      // Pending changes stay local and will sync later.
    }
  }

  const handleCacheReset = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    window.location.reload()
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return

    try {
      await addTag(newTagName.trim(), newTagColor)
      setNewTagName('')
      await synchronizeHousehold()
    } catch {
      alert('Tag existiert bereits.')
    }
  }

  const handleManualSync = async () => {
    try {
      await synchronizeHousehold()
    } catch {
      alert('Synchronisation fehlgeschlagen. Bitte Verbindung und Supabase-Konfiguration pruefen.')
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOutUser()
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleSwitchToAccountMode = () => {
    setLocalOnlyPreferred(false)
    useSessionStore.getState().setSession({
      status: 'signed_out',
      user: null,
      profile: null,
      household: null,
    })
    useSessionStore.getState().setSyncState({
      isSyncing: false,
      syncError: null,
      lastSyncAt: null,
    })
  }

  return (
    <Page>
      <Navbar
        title="Einstellungen"
        left={<NavbarBackLink onClick={() => navigate('/')} text="Zuruck" />}
        className="settings-navbar"
      />

      {isLocalOnly ? (
        <div
          style={{
            margin: '12px 16px 0',
            background: '#ECFDF5',
            border: '1px solid #86EFAC',
            borderRadius: 16,
            padding: '14px 16px',
            color: '#166534',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Lokaler Modus
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            Die App ist voll nutzbar, speichert aber nur auf diesem Geraet. Login, Cloud-Sync und Konfliktbereinigung werden aktiv, sobald Supabase konfiguriert ist.
          </div>
          <button
            onClick={handleSwitchToAccountMode}
            style={{
              marginTop: 12,
              border: 'none',
              borderRadius: 10,
              padding: '10px 12px',
              background: '#166534',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Mit Konto anmelden
          </button>
        </div>
      ) : (
        <>
          <List strongIos insetIos>
            <ListItem title={<strong>Konto</strong>} />
            <ListItem title="E-Mail" after={profile?.email ?? 'Unbekannt'} />
            <ListItem title="Haushalt" after={household?.name ?? 'Nicht gesetzt'} />
            <ListItem title="Rolle" after={household?.role ?? 'Kein Zugriff'} />
            <ListItem
              title="Abmelden"
              onClick={handleSignOut}
              after={isSigningOut ? '...' : undefined}
              link={!isSigningOut}
            />
          </List>

          <List strongIos insetIos>
            <ListItem title={<strong>Synchronisation</strong>} />
            <ListItem title="Status" after={isSyncing ? 'Lauft...' : pendingSyncCount ? `${pendingSyncCount} ausstehend` : 'Aktuell'} />
            <ListItem title="Letzter Sync" after={lastSyncAt ? formatDateTime(lastSyncAt) : 'Noch nie'} />
            <ListItem title="Offene Konflikte" after={String(conflicts?.length ?? 0)} />
            {syncError && (
              <li style={{ padding: '0 16px 12px', color: '#B91C1C', fontSize: 13 }}>
                {syncError}
              </li>
            )}
            <ListItem link title="Jetzt synchronisieren" onClick={handleManualSync} />
            <ListItem link title="Konflikte bereinigen" subtitle="Lokale und Cloud-Version vergleichen" onClick={() => navigate('/sync-konflikte')} />
          </List>
        </>
      )}

      <List strongIos insetIos>
        <ListItem
          title="Gefrierschrank-Name"
          after={
            nameEditing ? (
              <Button small onClick={handleSaveName}>Fertig</Button>
            ) : (
              <Button
                small
                onClick={() => {
                  setFreezerName(freezer?.name ?? '')
                  setNameEditing(true)
                }}
              >
                Bearbeiten
              </Button>
            )
          }
        />
        {nameEditing && (
          <ListInput
            type="text"
            value={freezerName}
            onInput={(event: React.ChangeEvent<HTMLInputElement>) => setFreezerName(event.target.value)}
            placeholder="Name eingeben"
          />
        )}
      </List>

      <List strongIos insetIos>
        <ListItem title={<strong>Tags verwalten</strong>} />
        {(tags ?? []).map((tag) => (
          <ListItem
            key={tag.id}
            title={tag.name}
            media={
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: tag.color,
                }}
              />
            }
            after={
              <button
                onClick={async () => {
                  await deleteTag(tag.id)
                  try {
                    await synchronizeHousehold()
                  } catch {
                    // Keep local pending deletion.
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF3B30',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Loschen
              </button>
            }
          />
        ))}
        <li style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="Neuer Tag"
              style={{
                flex: 1,
                border: '1px solid #D1D1D6',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {TAG_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: newTagColor === color ? '2px solid #000' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <Button small onClick={handleAddTag}>+</Button>
          </div>
        </li>
      </List>

      <List strongIos insetIos>
        <ListItem title={<strong>Daten</strong>} />
        <ListItem link title="Daten exportieren" onClick={handleExport} after="JSON" />
        <ListItem link title="Daten importieren" onClick={() => fileInputRef.current?.click()} />
        <ListItem
          link
          title={<span style={{ color: '#FF3B30' }}>{isLocalOnly ? 'Lokale Daten zurucksetzen' : 'Haushalt zurucksetzen'}</span>}
          subtitle={isLocalOnly
            ? 'Loescht alle lokalen Daten auf diesem Geraet und startet mit frischen Beispieldaten'
            : 'Setzt den gemeinsamen Bestand fur alle Mitglieder auf den Startzustand'}
          onClick={() => setShowClearConfirm(true)}
        />
        {installPrompt && (
          <ListItem
            link
            title="App installieren"
            subtitle="Als App auf dem Gerat installieren"
            onClick={handleInstall}
          />
        )}
        <ListItem
          link
          title="App aktualisieren"
          subtitle="Cache und Service Worker zurucksetzen"
          onClick={() => setShowResetConfirm(true)}
        />
      </List>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />

      <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: 13 }}>
        {isLocalOnly ? 'Gefrierschrank Tracker im lokalen Modus' : 'Gefrierschrank Tracker mit Supabase-Sync'}
      </div>

      <Dialog
        opened={showResetConfirm}
        onBackdropClick={() => setShowResetConfirm(false)}
        title="App aktualisieren?"
        content="Der Service Worker und alle Caches werden geloescht. Deine lokalen Daten bleiben erhalten. Die App wird danach neu geladen."
        buttons={
          <>
            <DialogButton onClick={() => setShowResetConfirm(false)}>Abbrechen</DialogButton>
            <DialogButton strong onClick={handleCacheReset}>
              Aktualisieren
            </DialogButton>
          </>
        }
      />

      <Dialog
        opened={showClearConfirm}
        onBackdropClick={() => setShowClearConfirm(false)}
        title={isLocalOnly ? 'Lokale Daten zurucksetzen?' : 'Haushalt zurucksetzen?'}
        content={isLocalOnly
          ? 'Alle lokalen Gefrierschraenke, Faecher, Artikel und Tags auf diesem Geraet werden entfernt und mit einem frischen Startbestand ersetzt.'
          : 'Alle Gefrierschraenke, Faecher, Artikel und Tags werden fuer den gemeinsamen Haushalt entfernt und mit einem frischen Startbestand ersetzt.'}
        buttons={
          <>
            <DialogButton onClick={() => setShowClearConfirm(false)}>
              Abbrechen
            </DialogButton>
            <DialogButton strong onClick={handleClearAll} className="text-red-500">
              Zurucksetzen
            </DialogButton>
          </>
        }
      />
    </Page>
  )
}

function formatDateTime(date: Date) {
  return date.toLocaleString('de-AT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
