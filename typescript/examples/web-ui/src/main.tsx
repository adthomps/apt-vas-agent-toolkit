import React from 'react'
import ReactDOM from 'react-dom/client'
// Explicitly import the TSX source to avoid picking up the stale ./ui/App.js file
import AppWithBranding from './ui/App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithBranding />
  </React.StrictMode>
)
