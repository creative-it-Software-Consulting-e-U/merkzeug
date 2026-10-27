import type { Editor } from '@milkdown/kit/core'
import type { Node } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey, Selection, TextSelection, type Command, type EditorState, type Transaction } from '@milkdown/kit/prose/state'
import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  isInTable,
  selectedRect,
  type TableRect
} from '@milkdown/kit/prose/tables'
import { $prose, $useKeymap } from '@milkdown/kit/utils'

export type TableAlign = 'left' | 'center' | 'right'

export type TableAction =
  | 'rowAbove'
  | 'rowBelow'
  | 'colBefore'
  | 'colAfter'
  | 'deleteRow'
  | 'deleteCol'
  | 'deleteTable'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'

/** Position des Cursors in der Tabelle, Grundlage der Tabellen-Leiste. */
export interface TableInfo {
  /** Zeile (0 = Kopfzeile) und Spalte der Auswahl */
  row: number
  col: number
  rows: number
  cols: number
  /** Ausrichtung der Spalte laut Kopfzelle */
  align: TableAlign
}

export function tableInfo(state: EditorState): TableInfo | null {
  if (!isInTable(state)) return null
  const rect = selectedRect(state)
  const header = rect.table.nodeAt(rect.map.map[rect.left] ?? 0)
  return {
    row: rect.top,
    col: rect.left,
    rows: rect.map.height,
    cols: rect.map.width,
    align: (header?.attrs.alignment as TableAlign | undefined) ?? 'left'
  }
}

export function sameTableInfo(a: TableInfo | null, b: TableInfo | null): boolean {
  if (!a || !b) return a === b
  return a.row === b.row && a.col === b.col && a.rows === b.rows && a.cols === b.cols && a.align === b.align
}

/** Startposition der Zeile `row` im Dokument. */
function rowStart({ table, tableStart }: TableRect, row: number): number {
  let pos = tableStart
  for (let i = 0; i < row; i++) pos += table.child(i).nodeSize
  return pos
}

/** Cursor in die Zelle (row, col) einer Tabelle setzen, die bei `tableStart` beginnt. */
function focusCell(tr: Transaction, tableStart: number, row: number, col: number): Transaction {
  const table = tr.doc.nodeAt(tableStart - 1)
  if (!table) return tr
  let pos = tableStart
  for (let i = 0; i < row; i++) pos += table.child(i).nodeSize
  const rowNode = table.child(row)
  pos += 1
  for (let i = 0; i < col; i++) pos += rowNode.child(i).nodeSize
  return tr.setSelection(Selection.near(tr.doc.resolve(pos + 1)))
}

/** Leere Zeile mit den Spaltenausrichtungen der Kopfzeile vor Zeile `at` einfügen (nie vor der Kopfzeile). */
function insertRow(state: EditorState, rect: TableRect, at: number, focusCol: number): Transaction | null {
  const rowType = state.schema.nodes.table_row
  const cellType = state.schema.nodes.table_cell
  if (!rowType || !cellType || at < 1) return null
  const cells: Node[] = []
  for (let col = 0; col < rect.map.width; col++) {
    const header = rect.table.nodeAt(rect.map.map[col] ?? 0)
    const cell = cellType.createAndFill({ alignment: header?.attrs.alignment ?? 'left' })
    if (!cell) return null
    cells.push(cell)
  }
  const tr = state.tr.insert(rowStart(rect, at), rowType.create(null, cells))
  return focusCell(tr, rect.tableStart, at, Math.min(focusCol, rect.map.width - 1)).scrollIntoView()
}

function rowIsEmpty(rect: TableRect, row: number): boolean {
  return rect.table.child(row).textContent.trim() === ''
}

/** Cursor hinter die Tabelle setzen; fehlt dort ein Absatz, wird einer angelegt. */
function leaveTable(tr: Transaction, tableEnd: number): Transaction {
  const after = tr.doc.resolve(tableEnd).nodeAfter
  if (after?.isTextblock) return tr.setSelection(TextSelection.create(tr.doc, tableEnd + 1))
  const paragraph = tr.doc.type.schema.nodes.paragraph?.createAndFill()
  if (!paragraph) return tr
  tr.insert(tableEnd, paragraph)
  return tr.setSelection(TextSelection.create(tr.doc, tableEnd + 1))
}

/** Ausrichtung aller ausgewählten Spalten setzen (Markdown kennt nur ganze Spalten). */
function setColumnAlign(state: EditorState, align: TableAlign): Transaction {
  const rect = selectedRect(state)
  const tr = state.tr
  for (let row = 0; row < rect.map.height; row++) {
    for (let col = rect.left; col < rect.right; col++) {
      const offset = rect.map.map[row * rect.map.width + col]
      if (offset === undefined) continue
      const cell = rect.table.nodeAt(offset)
      if (cell) tr.setNodeMarkup(rect.tableStart + offset, undefined, { ...cell.attrs, alignment: align })
    }
  }
  return tr
}

/**
 * Ist die Tabellen-Aktion an der aktuellen Position möglich? Die Kopfzeile
 * muss bleiben und eine Tabelle braucht mindestens eine Datenzeile.
 */
export function canRunTableAction(info: TableInfo | null, action: TableAction): boolean {
  if (!info) return false
  switch (action) {
    case 'rowAbove':
    case 'deleteRow':
      if (info.row === 0) return false
      return action === 'rowAbove' || info.rows > 2
    default:
      return true
  }
}

export function tableActionCommand(action: TableAction): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    const info = tableInfo(state)
    if (!canRunTableAction(info, action)) return false
    switch (action) {
      case 'rowAbove':
      case 'rowBelow': {
        const tr = insertRow(state, rect, action === 'rowAbove' ? rect.top : rect.bottom, rect.left)
        if (!tr) return false
        dispatch?.(tr)
        return true
      }
      case 'colBefore':
        return addColumnBefore(state, dispatch)
      case 'colAfter':
        return addColumnAfter(state, dispatch)
      case 'deleteRow':
        // mindestens eine Datenzeile muss übrig bleiben
        if (rect.map.height - (rect.bottom - rect.top) < 2) return false
        return deleteRow(state, dispatch)
      case 'deleteCol':
        if (rect.left === 0 && rect.right === rect.map.width) return deleteTable(state, dispatch)
        return deleteColumn(state, dispatch)
      case 'deleteTable':
        return deleteTable(state, dispatch)
      case 'alignLeft':
      case 'alignCenter':
      case 'alignRight': {
        const align = action === 'alignLeft' ? 'left' : action === 'alignCenter' ? 'center' : 'right'
        dispatch?.(setColumnAlign(state, align))
        return true
      }
    }
  }
}

/** Tab: nächste Zelle; in der letzten Zelle eine neue Zeile anhängen. */
const tabInTable: Command = (state, dispatch, view) => {
  if (!isInTable(state) || (view && !view.editable)) return false
  if (goToNextCell(1)(state, dispatch)) return true
  const rect = selectedRect(state)
  const tr = insertRow(state, rect, rect.map.height, 0)
  if (!tr) return false
  dispatch?.(tr)
  return true
}

/**
 * Enter: in die Zelle darunter; in der letzten Zeile eine neue Zeile anhängen.
 * Enter in einer leeren letzten Zeile entfernt sie und verlässt die Tabelle.
 */
const enterInTable: Command = (state, dispatch, view) => {
  if (!isInTable(state) || (view && !view.editable)) return false
  const rect = selectedRect(state)
  const last = rect.map.height - 1
  if (rect.bottom - 1 < last) {
    dispatch?.(focusCell(state.tr, rect.tableStart, rect.bottom, rect.left).scrollIntoView())
    return true
  }
  if (rect.top > 1 && rowIsEmpty(rect, last)) {
    if (dispatch) {
      const from = rowStart(rect, last)
      const tr = state.tr.delete(from, from + rect.table.child(last).nodeSize)
      dispatch(leaveTable(tr, rect.tableStart - 1 + rect.table.nodeSize - rect.table.child(last).nodeSize).scrollIntoView())
    }
    return true
  }
  const tr = insertRow(state, rect, rect.map.height, rect.left)
  if (!tr) return false
  dispatch?.(tr)
  return true
}

// Vorrang vor Milkdowns Tabellen-Keymap (Priorität 100), deren Enter die Tabelle verlässt
const tableKeymap = $useKeymap('merkzeugTableKeymap', {
  NextCellOrRow: {
    priority: 200,
    shortcuts: ['Tab'],
    command: () => tabInTable
  },
  NextRow: {
    priority: 200,
    shortcuts: ['Enter'],
    command: () => enterInTable
  }
})

const tableInfoKey = new PluginKey('merkzeug-table-info')

/** Tabellen-Tastenbelegung aktivieren und Cursorwechsel in/aus Tabellen melden. */
export function enableTableTools(editor: Editor, onChange: (info: TableInfo | null) => void): void {
  editor.use(tableKeymap).use($prose(() => new Plugin({
    key: tableInfoKey,
    view: (view) => {
      let previous: TableInfo | null = null
      const report = (state: EditorState): void => {
        const next = tableInfo(state)
        if (sameTableInfo(previous, next)) return
        previous = next
        onChange(next)
      }
      report(view.state)
      return {
        update: (updated) => report(updated.state),
        destroy: () => onChange(null)
      }
    }
  })))
}
