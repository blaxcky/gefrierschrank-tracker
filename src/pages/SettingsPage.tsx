import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Page,
  Navbar,
  NavbarBackLink,
  List,
  ListItem,
  ListInput,
  Button,
  Dialog,
  DialogButton,
} from 'konsta/react'
import { useFirstFreezer, useTags, updateFreezer, deleteTag, addTag } from '../hooks/useFreezerData'
import { exportData, importData, downloadJson } from '../utils/export'
import { db } from '../db/database'

export default function SettingsPage() {
  const navigate = useNavigate()
  const freezer = useFirstFreezer()
  const tags = useTags()
  const [freezerName, setFreezerName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#007AFF')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveName = async () => {
    if (freezer && freezerName.trim()) {
      await updateFreezer(freezer.id, { name: freezerName.trim() })
    }
    setNameEditing(false)
  }

  const handleExport = async () => {
    const data = await exportData()
    const date = new Date().toISOString().split('T')[0]
    downloadJson(data, `gefrierschrank-backup-${date}.json`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      await importData(text)
      alert('Import erfolgreich!')
    } catch {
      alert('Fehler beim Import. Bitte prüfe die Datei.')
    }
    e.target.value = ''
  }

  const handleClearAll = async () => {
    await db.transaction('rw', [db.freezers, db.drawers, db.items, db.tags], async () => {
      await db.items.clear()
      await db.drawers.clear()
      await db.freezers.clear()
      await db.tags.clear()
    })
    setShowClearConfirm(false)
    // Re-seed
    const { initializeDatabase } = await import('../db/seed')
    await initializeDatabase()
  }

  const handleCacheReset = async () => {
    // 1. Alle Caches löschen
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // 2. Service Worker deregistrieren
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    }

    // 3. Seite komplett neu laden
    window.location.reload()
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    try {
      await addTag(newTagName.trim(), newTagColor)
      setNewTagName('')
    } catch {
      alert('Tag existiert bereits.')
    }
  }

  const TAG_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF2D55', '#8E8E93']

  return (
    <Page>
      <Navbar
        title="Einstellungen"
        left={<NavbarBackLink onClick={() => navigate('/')} text="Zurück" />}
      />

      {/* Freezer Name */}
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
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setFreezerName(e.target.value)}
            placeholder="Name eingeben"
          />
        )}
      </List>

      {/* Tags */}
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
                onClick={() => deleteTag(tag.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF3B30',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Löschen
              </button>
            }
          />
        ))}
        <li style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
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
              {TAG_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: newTagColor === c ? '2px solid #000' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <Button small onClick={handleAddTag}>+</Button>
          </div>
        </li>
      </List>

      {/* Data Management */}
      <List strongIos insetIos>
        <ListItem title={<strong>Daten</strong>} />
        <ListItem
          link
          title="Daten exportieren"
          onClick={handleExport}
          after="JSON"
        />
        <ListItem
          link
          title="Daten importieren"
          onClick={() => fileInputRef.current?.click()}
        />
        <ListItem
          link
          title={<span style={{ color: '#FF3B30' }}>Alle Daten löschen</span>}
          onClick={() => setShowClearConfirm(true)}
        />
        <ListItem
          link
          title="App aktualisieren"
          subtitle="Cache & Service Worker zurücksetzen"
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

      <div style={{ textAlign: 'center', padding: '24px', color: '#AEAEB2', fontSize: 13 }}>
        Gefrierschrank Tracker v1.0
      </div>

      <Dialog
        opened={showResetConfirm}
        onBackdropClick={() => setShowResetConfirm(false)}
        title="App aktualisieren?"
        content="Der Service Worker und alle Caches werden gelöscht. Deine Daten bleiben erhalten. Die App wird danach neu geladen."
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
        title="Alle Daten löschen?"
        content="Alle Gefrierschränke, Fächer, Artikel und Tags werden unwiderruflich gelöscht. Die App wird auf Werkseinstellungen zurückgesetzt."
        buttons={
          <>
            <DialogButton onClick={() => setShowClearConfirm(false)}>
              Abbrechen
            </DialogButton>
            <DialogButton strong onClick={handleClearAll} className="text-red-500">
              Alles löschen
            </DialogButton>
          </>
        }
      />
    </Page>
  )
}
