import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Navbar, NavbarBackLink, Page } from 'konsta/react'
import EmptyState from '../components/common/EmptyState'
import { resolveSyncConflict, synchronizeHousehold, useSyncConflicts } from '../hooks/useFreezerData'

export default function SyncConflictsPage() {
  const navigate = useNavigate()
  const conflicts = useSyncConflicts()
  const [busyConflictId, setBusyConflictId] = useState<string | null>(null)

  const visibleConflicts = useMemo(() => conflicts ?? [], [conflicts])

  const handleResolve = async (conflictId: string, winnerSource: 'local' | 'remote') => {
    setBusyConflictId(conflictId)
    try {
      await resolveSyncConflict(conflictId, winnerSource)
      await synchronizeHousehold()
    } finally {
      setBusyConflictId(null)
    }
  }

  return (
    <Page>
      <Navbar
        title="Sync-Konflikte"
        left={<NavbarBackLink onClick={() => navigate('/settings')} text="Zuruck" />}
      />

      {visibleConflicts.length === 0 ? (
        <EmptyState
          icon="&#9989;"
          title="Keine offenen Konflikte"
          subtitle="Zurzeit gibt es keine uberschneidenden Anderungen, die manuell bereinigt werden mussen."
        />
      ) : (
        <div style={{ padding: '12px 16px 24px' }}>
          {visibleConflicts.map((conflict) => {
            const localPayload = conflict.localPayload
            const remotePayload = conflict.remotePayload
            const isBusy = busyConflictId === conflict.id

            return (
              <div
                key={conflict.id}
                style={{
                  marginBottom: 14,
                  background: 'white',
                  borderRadius: 18,
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#64748B' }}>
                        {getConflictLabel(conflict.entityType)}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {getDisplayName(localPayload, remotePayload)}
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: conflict.winnerSource === 'local' ? '#DBEAFE' : '#DCFCE7',
                      color: conflict.winnerSource === 'local' ? '#1D4ED8' : '#166534',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                    >
                      Vorschlag: {conflict.winnerSource === 'local' ? 'Lokal' : 'Cloud'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <ConflictSide title="Lokal" accent="#2563EB" payload={localPayload} />
                  <ConflictSide title="Cloud" accent="#059669" payload={remotePayload} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 16, background: '#F8FAFC' }}>
                  <Button large disabled={isBusy} onClick={() => handleResolve(conflict.id, 'local')} style={{ background: '#2563EB', color: 'white' }}>
                    {isBusy ? 'Speichert...' : 'Lokal behalten'}
                  </Button>
                  <Button large disabled={isBusy} onClick={() => handleResolve(conflict.id, 'remote')} style={{ background: '#059669', color: 'white' }}>
                    {isBusy ? 'Speichert...' : 'Cloud behalten'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}

function ConflictSide({
  title,
  accent,
  payload,
}: {
  title: string
  accent: string
  payload: Record<string, unknown>
}) {
  return (
    <div style={{ padding: 16, borderRight: title === 'Lokal' ? '1px solid #F1F5F9' : 'none' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
        <PayloadRow label="Name" value={String(payload.name ?? '-')} />
        {'quantity' in payload && (
          <PayloadRow label="Menge" value={`${String(payload.quantity ?? '')} ${String(payload.unit ?? '')}`.trim()} />
        )}
        {'tags' in payload && Array.isArray(payload.tags) && (
          <PayloadRow label="Tags" value={payload.tags.length > 0 ? payload.tags.map(String).join(', ') : '-'} />
        )}
        {'notes' in payload && (
          <PayloadRow label="Notiz" value={String(payload.notes ?? '-')} />
        )}
        {'updatedAt' in payload && (
          <PayloadRow label="Geandert" value={formatDateTime(payload.updatedAt)} />
        )}
        {'version' in payload && (
          <PayloadRow label="Version" value={String(payload.version ?? '-')} />
        )}
        {'deletedAt' in payload && Boolean(payload.deletedAt) && (
          <PayloadRow label="Status" value="Gelöscht" />
        )}
      </div>
    </div>
  )
}

function PayloadRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94A3B8' }}>
        {label}
      </div>
      <div style={{ marginTop: 2 }}>
        {value || '-'}
      </div>
    </div>
  )
}

function getConflictLabel(entityType: string) {
  switch (entityType) {
    case 'freezers':
      return 'Gefrierschrank'
    case 'drawers':
      return 'Fach'
    case 'items':
      return 'Artikel'
    case 'tags':
      return 'Tag'
    default:
      return 'Datensatz'
  }
}

function getDisplayName(localPayload: Record<string, unknown>, remotePayload: Record<string, unknown>) {
  const localName = typeof localPayload.name === 'string' ? localPayload.name : ''
  const remoteName = typeof remotePayload.name === 'string' ? remotePayload.name : ''
  return localName || remoteName || 'Unbenannter Datensatz'
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('de-AT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
