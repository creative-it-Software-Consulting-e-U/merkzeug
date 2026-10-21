import { createRoot } from 'react-dom/client'
import { mountIde } from '@merkzeug/ide'
import { initializeTheme } from '@merkzeug/editor/theme'
import { installMacNavigation } from './macNavigation'
import { MeetingApp } from './MeetingApp'

installMacNavigation()
// `?meeting` is the File → New meeting-note dialog; JCEF serves project images through the editor's private resource origin.
if (new URLSearchParams(location.search).has('meeting')) {
  initializeTheme()
  createRoot(document.getElementById('root')!).render(<MeetingApp />)
} else mountIde({ host: 'IntelliJ', edition: 'intellij' })
