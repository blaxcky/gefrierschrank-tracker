import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Navbar, NavbarBackLink } from 'konsta/react'
import { useFirstFreezer, useDrawers, useItemsByFreezer } from '../hooks/useFreezerData'
import EmptyState from '../components/common/EmptyState'
import ExpiryBadge from '../components/common/ExpiryBadge'
import { formatDate } from '../utils/dates'

const DAY_MS = 24 * 60 * 60 * 1000

function toStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ExpiryOverviewPage() {
  const navigate = useNavigate()
  const freezer = useFirstFreezer()
  const drawers = useDrawers(freezer?.id)
  const items = useItemsByFreezer(freezer?.id)

  const [includeExpired, setIncludeExpired] = useState(true)
  const [includeExpiringSoon, setIncludeExpiringSoon] = useState(false)
  const [expiringDaysInput, setExpiringDaysInput] = useState('7')
  const [useFrozenDays, setUseFrozenDays] = useState(false)
  const [frozenDaysInput, setFrozenDaysInput] = useState('30')

  const expiringDays = Math.max(0, parseInt(expiringDaysInput, 10) || 0)
  const frozenDays = Math.max(0, parseInt(frozenDaysInput, 10) || 0)

  const drawerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const drawer of drawers ?? []) {
      map.set(drawer.id, drawer.name)
    }
    return map
  }, [drawers])

  const filteredItems = useMemo(() => {
    const allItems = items ?? []
    const today = toStartOfDay(new Date())
    const expiryThreshold = new Date(today)
    expiryThreshold.setDate(expiryThreshold.getDate() + expiringDays)

    const hasExpiryFilter = includeExpired || includeExpiringSoon

    return allItems
      .filter(item => {
        if (hasExpiryFilter) {
          if (!item.expiryDate) return false
          const expiry = item.expiryDate
          const isExpired = expiry < today
          const isExpiringSoon = expiry >= today && expiry <= expiryThreshold
          const matchesExpiry = (includeExpired && isExpired) || (includeExpiringSoon && isExpiringSoon)
          if (!matchesExpiry) return false
        }

        if (useFrozenDays) {
          const ageInDays = Math.floor((today.getTime() - toStartOfDay(item.dateAdded).getTime()) / DAY_MS)
          if (ageInDays < frozenDays) return false
        }

        return true
      })
      .sort((a, b) => {
        if (a.expiryDate && b.expiryDate) {
          return a.expiryDate.getTime() - b.expiryDate.getTime()
        }
        if (a.expiryDate) return -1
        if (b.expiryDate) return 1
        return a.dateAdded.getTime() - b.dateAdded.getTime()
      })
  }, [items, includeExpired, includeExpiringSoon, expiringDays, useFrozenDays, frozenDays])

  return (
    <Page>
      <Navbar
        title="Ablauf-Check"
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
            Filter lassen sich kombinieren.
          </p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Abgelaufene Artikel anzeigen</span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="checkbox"
                checked={includeExpiringSoon}
                onChange={(e) => setIncludeExpiringSoon(e.target.checked)}
              />
              <span style={{ fontSize: 14 }}>Läuft in den nächsten</span>
            </label>
            <input
              type="number"
              min={0}
              value={expiringDaysInput}
              onChange={(e) => setExpiringDaysInput(e.target.value)}
              style={{
                width: 72,
                border: '1px solid #D1D1D6',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 14,
              }}
              disabled={!includeExpiringSoon}
            />
            <span style={{ fontSize: 14, color: '#8E8E93' }}>Tagen ab</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="checkbox"
                checked={useFrozenDays}
                onChange={(e) => setUseFrozenDays(e.target.checked)}
              />
              <span style={{ fontSize: 14 }}>Seit mindestens</span>
            </label>
            <input
              type="number"
              min={0}
              value={frozenDaysInput}
              onChange={(e) => setFrozenDaysInput(e.target.value)}
              style={{
                width: 72,
                border: '1px solid #D1D1D6',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 14,
              }}
              disabled={!useFrozenDays}
            />
            <span style={{ fontSize: 14, color: '#8E8E93' }}>Tagen gefroren</span>
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
          subtitle="Passe die Filter an, um Ergebnisse zu sehen"
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
                  {item.expiryDate && (
                    <div style={{ marginTop: 2 }}>
                      <ExpiryBadge date={item.expiryDate} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 14, color: '#8E8E93', whiteSpace: 'nowrap' }}>
                  {item.quantity} {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
