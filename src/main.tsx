import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootTheme } from './shell/theme'
import App from './App.tsx'

bootTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
