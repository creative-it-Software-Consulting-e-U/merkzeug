import { MeetingNotes as SharedMeetingNotes, type MeetingHost } from '@merkzeug/editor/MeetingNotes'
import { listCalendarEvents, calendarSourceHost } from '../calendar'
import { vault } from '../vault'
const host: MeetingHost = { sources: calendarSourceHost, list: listCalendarEvents, create: async (path, text) => { if (!await vault.exists(path)) await vault.writeFile(path, text, 0) } }
export function MeetingNotes(props: { folder: string; onOpen: (path: string) => void; onClose: () => void }) { return <SharedMeetingNotes {...props} host={host} /> }
