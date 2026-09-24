import { ReleaseNotes } from '@merkzeug/editor/ReleaseNotes'
import { initializeTheme } from '@merkzeug/editor/theme'
import './locale'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { HelpApp } from './HelpApp'
import { ZoomApp } from './ZoomApp'
import { PdfApp } from './PdfApp'
import { SettingsApp } from './SettingsApp'
import './styles.css'

initializeTheme()

const releaseHost = { claim: window.merkzeug.claimReleaseNotes, seen: window.merkzeug.markReleaseNotesSeen }

function Root(): React.JSX.Element {
  const hash = window.location.hash
  if (hash === '#help') return <HelpApp />
  if (hash === '#zoom') return <ZoomApp />
  if (hash === '#pdf') return <PdfApp />
  if (hash === '#settings') return <SettingsApp />
  return <ReleaseNotes host={releaseHost}><App /></ReleaseNotes>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
