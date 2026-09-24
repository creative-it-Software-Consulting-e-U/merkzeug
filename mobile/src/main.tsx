import { ReleaseNotes } from '@merkzeug/editor/ReleaseNotes'
import { initializeTheme } from '@merkzeug/editor/theme'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReleaseNotes><App /></ReleaseNotes>
  </React.StrictMode>
)
