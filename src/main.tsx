import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './app.css'
import AppBootstrap from './components/app/AppBootstrap'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppBootstrap>
      <App />
    </AppBootstrap>
  </React.StrictMode>,
)
