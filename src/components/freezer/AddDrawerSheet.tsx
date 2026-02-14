import { useState, useEffect, useRef } from 'react'
import { Sheet, Button, List, ListInput } from 'konsta/react'
import { addDrawer, updateDrawer, deleteDrawer } from '../../hooks/useFreezerData'
import { DRAWER_COLORS } from '../../utils/defaultTags'
import ConfirmDialog from '../common/ConfirmDialog'
import type { Drawer } from '../../db/database'

interface AddDrawerSheetProps {
  opened: boolean
  onClose: () => void
  freezerId: string
  editDrawer?: Drawer | null
}

export default function AddDrawerSheet({ opened, onClose, freezerId, editDrawer }: AddDrawerSheetProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DRAWER_COLORS[0])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveInProgressRef = useRef(false)

  useEffect(() => {
    if (editDrawer) {
      setName(editDrawer.name)
      setColor(editDrawer.color)
    } else {
      setName('')
      setColor(DRAWER_COLORS[0])
    }
  }, [editDrawer, opened])

  const handleSave = async () => {
    if (saveInProgressRef.current || isSaving) return
    if (!name.trim()) return

    saveInProgressRef.current = true
    setIsSaving(true)

    try {
      if (editDrawer) {
        await updateDrawer(editDrawer.id, { name: name.trim(), color })
      } else {
        await addDrawer(freezerId, name.trim(), color)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save drawer:', error)
      alert('Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      saveInProgressRef.current = false
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (saveInProgressRef.current || isSaving) return

    saveInProgressRef.current = true
    setIsSaving(true)

    try {
      if (editDrawer) {
        await deleteDrawer(editDrawer.id)
      }
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete drawer:', error)
      alert('Löschen fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      saveInProgressRef.current = false
      setIsSaving(false)
    }
  }

  const handleRequestClose = () => {
    if (isSaving || saveInProgressRef.current) return
    onClose()
  }

  const handleCancelDelete = () => {
    if (isSaving || saveInProgressRef.current) return
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <Sheet opened={opened} onBackdropClick={handleRequestClose} style={{ height: 'auto', maxHeight: '70vh' }}>
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleRequestClose}
              disabled={isSaving}
              style={{ color: isSaving ? '#C7C7CC' : '#007AFF', background: 'none', border: 'none', fontSize: 17, padding: '8px 0', minWidth: 80, textAlign: 'left' }}
            >
              Abbrechen
            </button>
            <span style={{ fontWeight: 600, fontSize: 17 }}>{editDrawer ? 'Fach bearbeiten' : 'Neues Fach'}</span>
            <button onClick={handleSave} disabled={isSaving} style={{ color: isSaving ? '#C7C7CC' : '#007AFF', background: 'none', border: 'none', fontSize: 17, fontWeight: 700, padding: '8px 0', minWidth: 80, textAlign: 'right' }}>
              {isSaving ? 'Speichern...' : 'Fertig'}
            </button>
          </div>
        </div>
        <List strongIos insetIos style={{ margin: '16px' }}>
          <ListInput
            type="text"
            placeholder="z.B. Oberes Fach"
            value={name}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            label="Name"
            floatingLabel
          />
        </List>
        <div style={{ padding: '0 32px 16px' }}>
          <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>Farbe</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DRAWER_COLORS.map((c) => (
              <div
                key={c}
                className={`color-option ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        {editDrawer && (
          <div style={{ padding: '0 32px 24px' }}>
            <Button
              large
              tonal
              disabled={isSaving}
              onClick={() => setShowDeleteConfirm(true)}
              style={{ color: '#FF3B30' }}
            >
              Fach löschen
            </Button>
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        opened={showDeleteConfirm}
        title="Fach löschen?"
        content="Alle Artikel in diesem Fach werden ebenfalls gelöscht."
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />
    </>
  )
}
