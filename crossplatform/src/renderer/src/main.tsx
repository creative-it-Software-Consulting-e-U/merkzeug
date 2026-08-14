import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { HelpApp } from './HelpApp'
import { ZoomApp } from './ZoomApp'
import { PdfApp } from './PdfApp'
import './styles.css'

function Root(): React.JSX.Element {
  const hash = window.location.hash
  if (hash === '#help') return <HelpApp />
  if (hash === '#zoom') return <ZoomApp />
  if (hash === '#pdf') return <PdfApp />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
