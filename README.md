# MyNotion

Native macOS-App (SwiftUI + AppKit), die einen Ordner („Vault“) mit Markdown-Dateien
hierarchisch darstellt und die Dateien in einem **WYSIWYG-Editor** (wie Notion)
bearbeitet. Gespeichert wird immer sauberes Markdown.

## Bauen & Starten

```bash
make run        # Release-Build, erstellt dist/MyNotion.app und öffnet sie
make test       # Round-Trip-Tests der Markdown-Engine
```

Beim ersten Start wählst du den Vault-Ordner (z. B. `SampleVault/` in diesem Repo).
Die Auswahl wird gemerkt; über **Ablage → Vault öffnen…** (⌘O) wechselst du den Vault,
**Ablage → Zuletzt geöffnete Vaults** listet die letzten zehn Vaults zum schnellen Wechsel.
Alternativ kann der Vault per Umgebungsvariable vorgegeben werden:

```bash
MYNOTION_VAULT=/pfad/zum/vault dist/MyNotion.app/Contents/MacOS/MyNotion
```

## Funktionen

**Editor (WYSIWYG):**
- Überschriften, fett/kursiv/durchgestrichen, Inline-Code, Codeblöcke, Zitate, Trennlinien
- Aufzählungen & nummerierte Listen (verschachtelbar mit Tab/⇧Tab, automatische Fortführung und Neunummerierung)
- **Tabellen**: Einfügen über Toolbar/⌥⌘T, Navigation mit Tab (letzte Zelle + Tab = neue Zeile), Zeilen/Spalten einfügen & löschen per Rechtsklick oder Tabellen-Menü
- **Formatierte Links** (⌘K): externer Link oder Pfad innerhalb des Vaults (relativ zur Datei, relativ zur Vault-Wurzel oder absolut) — Links auf `.md`-Dateien öffnen die Notiz in einem neuen Tab, Links auf Ordner klappen den Ordner in der Sidebar auf und öffnen eine Datei-Übersicht in einem eigenen Tab
- **Bilder**: per Paste, Drag & Drop oder Toolbar einfügen
- Auto-Formatierung beim Tippen: `# `, `## `, `- `, `1. `, `> `, ` ``` `+Enter
- **Mermaid-Diagramme**: ` ```mermaid `-Codeblöcke werden als Diagramm gerendert (offline, gebündeltes mermaid.js). Klick auf das Diagramm zeigt den Quelltext als Codeblock; verlässt der Cursor den Block, wird wieder das Diagramm angezeigt. Im Markdown bleibt immer der ` ```mermaid `-Block erhalten. Zum Vergrößern öffnet die Lupen-Schaltfläche (erscheint beim Überfahren des Diagramms), ⌘-Klick oder das Kontextmenü eine Zoom-Vorschau in einem eigenen Fenster (Pinch-Geste bzw. +/−/0-Tasten, Esc schließt).
- Autosave (1 s nach der letzten Änderung, außerdem beim Schließen von Tabs und beim Beenden), Undo/Redo

**Bild-Ressourcen:**
- Jede Notiz bekommt einen eigenen Ordner `Notizname.assets/` neben der Datei
- Beim **Umbenennen** wird der Ordner mit umbenannt und die Bildpfade in der Notiz werden angepasst; beim **Verschieben** wandert er mit; beim **Löschen** landet er mit im Papierkorb
- Ressourcen-Ordner sind im Dateibaum standardmäßig ausgeblendet — einblendbar über das Augen-Symbol unten in der Sidebar (oder ⇧⌘R)

**Fenster:**
- **Mehrere Fenster** (Ablage → Neues Fenster, ⌥⌘N): jedes Fenster hat eigene Tabs/Sektionen und kann denselben oder einen anderen Vault anzeigen (Vault wechseln pro Fenster über ⌘O)
- Ein neues Fenster übernimmt standardmäßig den Vault des Fensters, aus dem es geöffnet wurde

**Vault & Tabs:**
- Hierarchischer Dateibaum mit Kontextmenü (neue Notiz, neuer Ordner, umbenennen, Papierkorb, im Finder zeigen) und Verschieben per Drag & Drop auf Ordner
- Jede Datei öffnet in einem eigenen Tab; ⌘W schließt den aktiven Tab
- **Zwei Sektionen** nebeneinander (⌘\), Tabs per Drag & Drop auf die andere Sektion oder per Kontextmenü/⇧⌘\ verschieben
- **Navigationsmodus** pro Tab (⌘R, Menü „Ansicht“ oder Buch-Symbol in der Toolbar): Notiz ist schreibgeschützt, Vault-Links — auch Ordner-Links samt Klicks in der Ordnerübersicht — laden ihr Ziel im **selben Tab**; Zurück/Vorwärts über die Toolbar-Pfeile, ⌘[/⌘], Drei-Finger-Wischen oder Maus-Zusatztasten 4/5, Historie bleibt pro Tab erhalten
- Änderungen im Dateisystem werden automatisch erkannt (FSEvents)

## Aufbau

```
Sources/MarkdownEngine/   Parser, NSAttributedString-Builder, Serializer (testbar)
Sources/MyNotion/         App: Vault, Tabs, Editor (NSTextView/TextKit 1), SwiftUI-UI
Tests/                    Round-Trip-Tests Markdown → Editor → Markdown
Support/                  Info.plist, Icon-Generator
SampleVault/              Beispiel-Vault zum Ausprobieren
```

## Hinweise / Grenzen

- Der Editor deckt das gängige GFM-Subset ab (keine Fußnoten, kein eingebettetes HTML);
  unbekannte Konstrukte werden als Text übernommen.
- Wird eine geöffnete Datei extern geändert, gewinnt beim nächsten Autosave der Editor-Stand.
  Das gilt auch, wenn dieselbe Datei in zwei Fenstern geöffnet ist (der zuletzt speichernde Stand gewinnt).
- Mermaid-Diagramme werden für den aktuellen Hell-/Dunkelmodus gerendert; nach einem
  Moduswechsel aktualisieren sich bereits gerenderte Diagramme erst beim nächsten Öffnen.
- Web-Bilder (`http…`) werden als Platzhalter angezeigt, der Link bleibt im Markdown erhalten.
