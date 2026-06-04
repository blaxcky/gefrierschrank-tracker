import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Navbar, NavbarBackLink } from 'konsta/react'
import { useFirstFreezer, useDrawers, useItemsByFreezer } from '../hooks/useFreezerData'
import EmptyState from '../components/common/EmptyState'
import FrozenDurationBadge from '../components/common/FrozenDurationBadge'
import { formatDate, getFrozenDays } from '../utils/dates'
import { formatQuantity } from '../utils/units'

export default function FrozenDurationPage() {
  const navigate = useNavigate()
  const freezer = useFirstFreezer()
  const drawers = useDrawers(freezer?.id)
  const items = useItemsByFreezer(freezer?.id)

  const [minimumDaysInput, setMinimumDaysInput] = useState('30')
  const minimumDays = Math.max(0, parseInt(minimumDaysInput, 10) || 0)

  const drawerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const drawer of drawers ?? []) {
      map.set(drawer.id, drawer.name)
    }
    return map
  }, [drawers])

  const filteredItems = useMemo(() => {
    const allItems = items ?? []

    return allItems
      .filter(item => getFrozenDays(item.dateAdded) >= minimumDays)
      .sort((a, b) => a.dateAdded.getTime() - b.dateAdded.getTime())
  }, [items, minimumDays])

  return (
    <Page>
      <Navbar
        title="Lagerdauer"
        left={<NavbarBackLink onClick={() => navigate('/')} text="Zurück" />}
      />

      <div style={{ padding: '12px 16px 8px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 14,
            border: '1px solid #E5E5EA',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#8E8E93' }}>
            Zeigt alle Artikel, die seit mindestens der gewählten Anzahl an Tagen eingefroren sind.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, fontSize: 14 }}>
              Seit mindestens
            </label>
            <input
              type="number"
              min={0}
              value={minimumDaysInput}
              onChange={(e) => setMinimumDaysInput(e.target.value)}
              style={{
                width: 72,
                border: '1px solid #D1D1D6',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 14, color: '#8E8E93' }}>Tagen eingefroren</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 8px', color: '#8E8E93', fontSize: 13 }}>
        {filteredItems.length} Treffer
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon="&#128269;"
          title="Keine passenden Artikel"
          subtitle="Reduziere die Mindestdauer, um mehr Ergebnisse zu sehen"
        />
      ) : (
        <div style={{ margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          {filteredItems.map(item => (
            <div key={item.id} style={{ padding: '12px 14px', borderBottom: '1px solid #F2F2F7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>
                    {item.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8E8E93' }}>
                    Fach: {drawerNameById.get(item.drawerId) ?? 'Unbekannt'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8E8E93' }}>
                    Eingefroren seit: {formatDate(item.dateAdded)}
                  </p>
                  <div style={{ marginTop: 6 }}>
                    <FrozenDurationBadge date={item.dateAdded} />
                  </div>
                </div>
                <span style={{ fontSize: 14, color: '#8E8E93', whiteSpace: 'nowrap' }}>
                  {formatQuantity(item.quantity, item.unit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
