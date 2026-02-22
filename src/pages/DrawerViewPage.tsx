import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, Navbar, NavbarBackLink } from 'konsta/react'
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

  const IconPlus = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )

  return (
    <Page>
      <Navbar
        large
        title={drawer?.name ?? 'Fach'}
        left={<NavbarBackLink onClick={() => navigate('/')} text="Zurück" />}
        right={
          <button
            className="ft-icon-btn"
            onClick={() => setSheetOpen(true)}
            aria-label="Produkt hinzufügen"
            type="button"
          >
            {IconPlus}
          </button>
        }
      />

      <div style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'calc(16px + var(--sab))' }}>
        <ItemList items={items ?? []} tags={tags ?? []} onEdit={handleEdit} />
      </div>

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
