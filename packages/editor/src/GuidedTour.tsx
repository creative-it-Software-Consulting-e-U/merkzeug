import { TourVideo } from './TourVideo'
import { useEffect, useRef, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
type Edition = 'desktop' | 'ios' | 'intellij'
const steps = {
  desktop: [
    ['.sidebar, .welcome', 'Your vault', 'Open a folder of Markdown notes. Your files stay in that folder and can be opened with other tools.'],
    ['.editor-host', 'Write and connect ideas', 'Edit text directly, type / for blocks, paste images, and follow links between notes. Images belong to a folder named after the note, such as Plan.assets.'],
    ['.frontmatter-bar', 'Document metadata', 'Use frontmatter for titles, tags, meeting participants and export options.'],
    ['.git-bar', 'Git integration', 'With Git installed and a repository open, review changes and explicitly pull, commit or push. Merkzeug never treats opening a Git client as successful synchronization.'],
    ['.live-template-bar', 'PDF export and templates', 'Export with File → Export PDF. Choose a template in Settings and optionally preview its formatting while editing. Linked documents, diagrams and images can be included.'],
    ['.app', 'Meeting notes', 'Choose New meeting note to use calendar events. You can also import ICS files and subscribe to calendar feeds.']
  ],
  ios: [
    ['.topbar, .start-screen', 'Your vault', 'Choose a folder from Files, including a repository provided by Working Copy.'],
    ['.editor-host', 'Write and connect ideas', 'Switch to editing, type / for blocks, paste images and link notes. Images are saved beside the note in its .assets folder.'],
    ['.working-copy', 'Working Copy actions', 'Configure the exact repository and callback key for this vault. Pull, Commit and Push open Working Copy; the result is confirmed by its callback.'],
    ['.appearance-bar', 'Meeting notes', 'Create notes from your iOS calendars or ICS subscriptions. Calendar access is requested only when you open meeting notes.'],
    ['.theme-select', 'Make it yours', 'Choose System, Light or Dark. PDF export is available in the desktop and IntelliJ editions.']
  ],
  intellij: [
    ['.editor-host', 'Markdown in your IDE', 'Write in the visual editor while IntelliJ owns the document, saving and undo history.'],
    ['header', 'PDF export and templates', 'Choose a PDF template and export notes, including linked documents, diagrams and images.'],
    ['.theme-select', 'Follow your IDE theme', 'System follows IntelliJ colors. Light and Dark override the IDE appearance.'],
    ['header', 'Meeting notes', 'Import ICS calendars or subscribe to feeds to create meeting notes in your project.']
  ]
} satisfies Record<Edition, string[][]>
export function GuidedTour({ edition, seen, onSeen, showLauncher = true }: { edition: Edition; seen?: boolean; onSeen?: () => void; showLauncher?: boolean }) {
  const [open, setOpen] = useState(() => !(seen ?? localStorage.getItem('merkzeug.tour.v1') === 'seen'))
  const [index, setIndex] = useState(-1)
  const ref = useRef<HTMLDialogElement>(null)
  const list = steps[edition]
  function dismiss() { localStorage.setItem('merkzeug.tour.v1', 'seen'); onSeen?.(); setOpen(false); setIndex(-1) }
  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])
  useEffect(() => {
    if (!open || index < 0) return
    const element = document.querySelector(list[index][0])
    element?.classList.add('tour-highlight')
    return () => element?.classList.remove('tour-highlight')
  }, [index, open, list])
  useEffect(() => {
    if (showLauncher) return
    const launch = () => { setIndex(-1); setOpen(true) }
    window.addEventListener('merkzeug:guided-tour', launch)
    return () => window.removeEventListener('merkzeug:guided-tour', launch)
  }, [showLauncher])
  return <div className="tour-tools" style={showLauncher ? undefined : { display: 'contents' }}>
    {showLauncher && <button className="tour-launch" onClick={() => { setIndex(-1); setOpen(true) }}>{t('Guided tour')}</button>}
    <TourVideo showLauncher={showLauncher} />
    <dialog className="tour-dialog" ref={ref} aria-labelledby="tour-title" onCancel={event => { event.preventDefault(); dismiss() }}>
      <h2 id="tour-title">{t(index < 0 ? 'Welcome to Merkzeug' : list[index][1])}</h2>
      <p>{t(index < 0 ? 'Would you like a short tour of writing, images, calendars and Git?' : list[index][2])}</p>
      {index >= 0 && <p className="tour-progress">{index + 1} / {list.length}</p>}
      <div className="tour-actions"><button onClick={dismiss}>{t(index < 0 ? 'Later' : 'Close')}</button>
        {index > 0 && <button onClick={() => setIndex(index - 1)}>{t('Back')}</button>}
        <button autoFocus onClick={() => index + 1 >= list.length ? dismiss() : setIndex(index + 1)}>{t(index < 0 ? 'Start tour' : index + 1 === list.length ? 'Finish' : 'Next')}</button></div>
    </dialog>
  </div>
}
