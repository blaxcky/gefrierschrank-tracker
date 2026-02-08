import { useState, useEffect } from 'react'
import { Sheet, List, ListInput } from 'konsta/react'
import { addItem } from '../../hooks/useFreezerData'
import TagPicker from './TagPicker'

interface AddItemSheetProps {
  opened: boolean
  onClose: () => void
  drawerId: string
}

const UNITS = ['Stück', 'g', 'kg', 'Packung', 'Beutel', 'Dose']

export default function AddItemSheet({ opened, onClose, drawerId }: AddItemSheetProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('Stück')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  useEffect(() => {
    if (opened) {
      setName('')
      setQuantity('1')
      setUnit('Stück')
      setTags([])
      setNotes('')
      setExpiryDate('')
    }
  }, [opened])

  const handleSave = async () => {
    if (!name.trim()) return
    const qty = Math.max(1, parseInt(quantity) || 1)
    const expiry = expiryDate ? new Date(expiryDate + 'T00:00:00') : undefined

    await addItem(drawerId, name.trim(), qty, unit, tags, notes.trim(), expiry)
    onClose()
  }

  return (
    <Sheet opened={opened} onBackdropClick={onClose} style={{ height: 'auto', maxHeight: '85vh', overflow: 'auto' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ color: '#007AFF', background: 'none', border: 'none', fontSize: 17, padding: '8px 0', minWidth: 80, textAlign: 'left' }}>
            Abbrechen
          </button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Neuer Artikel</span>
          <button onClick={handleSave} style={{ color: '#007AFF', background: 'none', border: 'none', fontSize: 17, fontWeight: 700, padding: '8px 0', minWidth: 80, textAlign: 'right' }}>
            Speichern
          </button>
        </div>
      </div>

      <List strongIos insetIos style={{ margin: '8px 16px' }}>
        <ListInput
          type="text"
          placeholder="z.B. Hackfleisch"
          value={name}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          label="Name *"
          floatingLabel
        />
        <ListInput
          type="number"
          placeholder="1"
          value={quantity}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
          label="Menge"
          floatingLabel
          min={1}
        />
        <ListInput
          type="select"
          value={unit}
          onInput={(e: React.ChangeEvent<HTMLSelectElement>) => setUnit(e.target.value)}
          label="Einheit"
          floatingLabel
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </ListInput>
        <ListInput
          type="date"
          value={expiryDate}
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)}
          label="MHD (optional)"
          floatingLabel
        />
      </List>

      <div style={{ padding: '0 24px' }}>
        <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>Tags</p>
        <TagPicker selectedTags={tags} onChange={setTags} />
      </div>

      <List strongIos insetIos style={{ margin: '8px 16px 24px' }}>
        <ListInput
          type="textarea"
          placeholder="Optionale Notiz..."
          value={notes}
          onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          label="Notiz"
          floatingLabel
        />
      </List>
    </Sheet>
  )
}
