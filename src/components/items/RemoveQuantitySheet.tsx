import { useState, useEffect } from 'react'
import { Sheet, Button } from 'konsta/react'
import type { Item } from '../../db/database'
import { updateItem, deleteItem } from '../../hooks/useFreezerData'
import ConfirmDialog from '../common/ConfirmDialog'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock'

interface RemoveQuantitySheetProps {
  opened: boolean
  onClose: () => void
  item: Item | null
}

export default function RemoveQuantitySheet({ opened, onClose, item }: RemoveQuantitySheetProps) {
  const [removeCount, setRemoveCount] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (opened) {
      setRemoveCount(1)
      setIsSaving(false)
      setShowDeleteConfirm(false)
    }
  }, [opened])

  useEffect(() => {
    if (!opened) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [opened])

  if (!item) return null

  const maxCount = item.quantity
  const remaining = maxCount - removeCount

  const handleDecrement = () => {
    setRemoveCount(prev => Math.max(1, prev - 1))
  }

  const handleIncrement = () => {
    setRemoveCount(prev => Math.min(maxCount, prev + 1))
  }

  const handleRemoveAll = () => {
    setRemoveCount(maxCount)
  }

  const handleConfirm = async () => {
    if (isSaving || !item) return

    if (remaining === 0) {
      setShowDeleteConfirm(true)
      return
    }

    setIsSaving(true)
    try {
      await updateItem(item.id, { quantity: remaining })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!item) return
    setIsSaving(true)
    try {
      await deleteItem(item.id)
      setShowDeleteConfirm(false)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <Sheet
        opened={opened && !showDeleteConfirm}
        onBackdropClick={() => { if (!isSaving) onClose() }}
        style={{ height: 'auto', maxHeight: '85vh', overflow: 'auto', overscrollBehavior: 'contain' }}
      >
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              disabled={isSaving}
              onClick={onClose}
              style={{ color: isSaving ? '#AEAEB2' : '#007AFF', background: 'none', border: 'none', fontSize: 17, padding: '8px 0', minWidth: 80, textAlign: 'left' }}
            >
              Abbrechen
            </button>
            <span style={{ fontWeight: 600, fontSize: 17 }}>Entnehmen</span>
            <div style={{ minWidth: 80 }} />
          </div>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Item info */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#1C1C1E' }}>
              {item.name}
            </p>
            <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>
              Aktuell: {maxCount} {item.unit}
            </p>
          </div>

          {/* Stepper */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            marginBottom: 16,
          }}>
            <button
              onClick={handleDecrement}
              disabled={removeCount <= 1}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1.5px solid #D1D1D6',
                background: 'white',
                fontSize: 24,
                fontWeight: 600,
                color: removeCount <= 1 ? '#D1D1D6' : '#007AFF',
                cursor: removeCount <= 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Weniger entnehmen"
            >
              −
            </button>

            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#1C1C1E' }}>
                {removeCount}
              </span>
              <p style={{ fontSize: 13, color: '#8E8E93', margin: '2px 0 0' }}>
                {item.unit} entnehmen
              </p>
            </div>

            <button
              onClick={handleIncrement}
              disabled={removeCount >= maxCount}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1.5px solid #D1D1D6',
                background: 'white',
                fontSize: 24,
                fontWeight: 600,
                color: removeCount >= maxCount ? '#D1D1D6' : '#007AFF',
                cursor: removeCount >= maxCount ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Mehr entnehmen"
            >
              +
            </button>
          </div>

          {/* Remaining info */}
          <p style={{
            textAlign: 'center',
            fontSize: 14,
            color: remaining === 0 ? '#FF3B30' : '#8E8E93',
            fontWeight: remaining === 0 ? 600 : 400,
            marginBottom: 20,
          }}>
            {remaining === 0
              ? 'Alle entnommen – Artikel wird gelöscht'
              : `Verbleibend: ${remaining} ${item.unit}`
            }
          </p>

          {/* Quick action: remove all */}
          {maxCount > 1 && removeCount < maxCount && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <button
                onClick={handleRemoveAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007AFF',
                  fontSize: 15,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Alle entnehmen
              </button>
            </div>
          )}

          {/* Confirm button */}
          <Button
            large
            disabled={isSaving}
            onClick={handleConfirm}
            style={{
              background: remaining === 0 ? '#FF3B30' : '#34C759',
              color: 'white',
            }}
          >
            {isSaving
              ? 'Speichert...'
              : remaining === 0
                ? 'Alle entnehmen & löschen'
                : `${removeCount} ${item.unit} entnehmen`
            }
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        opened={showDeleteConfirm}
        title="Alle entnommen"
        content={`"${item.name}" wurde komplett entnommen. Artikel löschen?`}
        confirmText="Löschen"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  )
}
