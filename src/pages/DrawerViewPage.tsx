import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Navbar, NavbarBackLink, Fab } from 'konsta/react'
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
      <Navbar
        title={drawer?.name ?? 'Fach'}
        left={<NavbarBackLink onClick={() => navigate('/')} text="Zurück" />}
      />

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
