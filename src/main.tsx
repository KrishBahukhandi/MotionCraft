import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const container = document.getElementById('root')!
const tree = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// The landing route is prerendered at build time, so attach to the existing
// markup instead of throwing it away and re-rendering from scratch.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
