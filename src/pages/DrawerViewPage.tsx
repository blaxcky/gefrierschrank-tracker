import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Fab } from 'konsta/react'
import { useDrawer, useItems, useTags } from '../hooks/useFreezerData'
import type { Item } from '../db/database'
import ItemList from '../components/items/ItemList'
import AddItemSheet from '../components/items/AddItemSheet'

export default function DrawerViewPage() {
  const { drawerId } = useParams<{ drawerId: string }>()
  const navigate = useNavigate()
  const drawer = useDrawer(drawerId)
  const items = useItems(drawerId)
  const tags = useTags()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const handleEdit = (item: Item) => {
    setEditItem(item)
    setSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    setEditItem(null)
  }

  return (
    <Page>
      {/* Custom Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'linear-gradient(to bottom, #F2F2F7, #F2F2F7 90%, transparent)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ padding: '12px 16px 16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: '#007AFF',
              fontSize: 16,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 8,
            }}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8,1 1,8 8,15" />
            </svg>
            Zurück
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: '#1C1C1E',
            }}>
              {drawer?.name ?? 'Fach'}
            </h1>
            {items && items.length > 0 && (
              <span style={{
                fontSize: 15,
                color: '#8E8E93',
                fontWeight: 400,
              }}>
                {items.length} {items.length === 1 ? 'Artikel' : 'Artikel'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: 80 }}>
        <ItemList items={items ?? []} tags={tags ?? []} onEdit={handleEdit} />
      </div>

      <Fab
        className="fixed right-4 bottom-6 z-20"
        onClick={() => setSheetOpen(true)}
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        }
      />

      {drawerId && (
        <AddItemSheet
          opened={sheetOpen}
          onClose={handleCloseSheet}
          drawerId={drawerId}
          editItem={editItem}
        />
      )}
    </Page>
  )
}
