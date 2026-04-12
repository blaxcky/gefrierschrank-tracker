import { useState } from 'react'
import type { Item, Tag } from '../../db/database'
import { deleteItem } from '../../hooks/useFreezerData'
import ItemRow from './ItemRow'
import EmptyState from '../common/EmptyState'
import ConfirmDialog from '../common/ConfirmDialog'
import RemoveQuantitySheet from './RemoveQuantitySheet'

interface ItemListProps {
  items: Item[]
  tags: Tag[]
  onEdit: (item: Item) => void
}

export default function ItemList({ items, tags, onEdit }: ItemListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Item | null>(null)

  if (items.length === 0) {
    return (
      <EmptyState
        icon="&#10052;&#65039;"
        title="Keine Artikel"
        subtitle="Tippe auf + um etwas hinzuzuf&#252;gen"
      />
    )
  }

  const sorted = [...items].sort((a, b) => a.dateAdded.getTime() - b.dateAdded.getTime())

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteItem(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div style={{ margin: '8px 0', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
        {sorted.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            tags={tags}
            onDelete={() => setDeleteTarget(item)}
            onEdit={onEdit}
            onRemove={(i) => setRemoveTarget(i)}
          />
        ))}
      </div>
      <ConfirmDialog
        opened={deleteTarget !== null}
        title="Artikel entfernen?"
        content={deleteTarget ? `"${deleteTarget.name}" wird aus dem Fach entfernt.` : ''}
        confirmText="Entfernen"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <RemoveQuantitySheet
        opened={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        item={removeTarget}
      />
    </>
  )
}
