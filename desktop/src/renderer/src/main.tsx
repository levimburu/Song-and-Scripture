import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerBible } from '../../shared/bible'
import kjv from '../../shared/data/kjv.json'
import { App } from './App'
import './styles.css'

// The King James Version is public domain, so it ships inside the app and works offline.
registerBible(kjv)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
