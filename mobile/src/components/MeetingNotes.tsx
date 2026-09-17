import { ensureMeetingFile } from '@merkzeug/core/meetingFiles'
import { dirname } from '../util/paths'
import { MeetingNotes as SharedMeetingNotes, type MeetingHost } from '@merkzeug/editor/MeetingNotes'
import { listCalendarEvents, calendarSourceHost } from '../calendar'
import { vault } from '../vault'
const host: MeetingHost = { sources: calendarSourceHost, list: listCalendarEvents, create: async (path, text) => { return ensureMeetingFile(dirname(path), text, {
  list: async folder => {
    const tree = await vault.readTree()
    const find = (node: typeof tree): typeof tree | undefined => node.path === folder ? node : node.children?.map(find).find(Boolean)
    return (find(tree)?.children ?? []).filter(n => !n.isDirectory).map(n => n.path)
  },
  read: async p => (await vault.readFile(p)).content, exists: p => vault.exists(p),
  create: async (p, content) => { await vault.writeFile(p, content, 0) }
}) } }
export function MeetingNotes(props: { folder: string; onOpen: (path: string) => void; onClose: () => void }) { return <SharedMeetingNotes {...props} host={host} /> }
