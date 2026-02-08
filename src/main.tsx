import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './app.css'
import { initializeDatabase } from './db/seed'

initializeDatabase()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
