import { HashRouter, Routes, Route } from 'react-router-dom'
import { App as KonstaApp } from 'konsta/react'
import FreezerViewPage from './pages/FreezerViewPage'
import DrawerViewPage from './pages/DrawerViewPage'
import SettingsPage from './pages/SettingsPage'
import FrozenDurationPage from './pages/ExpiryOverviewPage'

function App() {
  return (
    <KonstaApp theme="ios" safeAreas>
      <HashRouter>
        <Routes>
          <Route path="/" element={<FreezerViewPage />} />
          <Route path="/drawer/:drawerId" element={<DrawerViewPage />} />
          <Route path="/lagerdauer" element={<FrozenDurationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </HashRouter>
    </KonstaApp>
  )
}

export default App
