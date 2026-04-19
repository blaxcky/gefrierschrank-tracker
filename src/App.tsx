import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { App as KonstaApp } from 'konsta/react'
import FreezerViewPage from './pages/FreezerViewPage'
import DrawerViewPage from './pages/DrawerViewPage'
import SettingsPage from './pages/SettingsPage'
import FrozenDurationPage from './pages/ExpiryOverviewPage'
import AuthPage from './pages/AuthPage'
import AccessPendingPage from './pages/AccessPendingPage'
import SyncConflictsPage from './pages/SyncConflictsPage'
import { useSessionStore } from './store/useSessionStore'

function App() {
  const status = useSessionStore((state) => state.status)

  return (
    <KonstaApp theme="ios" safeAreas>
      <HashRouter>
        {status === 'loading' && (
          <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            Synchronisation wird vorbereitet...
          </div>
        )}

        {status === 'signed_out' && <AuthPage />}
        {status === 'needs_access' && <AccessPendingPage />}

        {(status === 'ready' || status === 'local_only') && (
          <Routes>
            <Route path="/" element={<FreezerViewPage />} />
            <Route path="/drawer/:drawerId" element={<DrawerViewPage />} />
            <Route path="/lagerdauer" element={<FrozenDurationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/sync-konflikte" element={<SyncConflictsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </HashRouter>
    </KonstaApp>
  )
}

export default App
