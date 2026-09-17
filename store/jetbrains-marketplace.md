# JetBrains Marketplace listing draft

Prepared copy; not submitted or published. The English description bundled with the plugin is maintained in [plugin.xml](../intellij/src/main/resources/META-INF/plugin.xml). Installation scope and limitations are documented in the [IntelliJ guide](../docs/user/intellij.md).

## English

Merkzeug is a visual Markdown editor for IntelliJ IDEA with formatting tools, Mermaid diagrams, frontmatter and PDF export. Your notes stay ordinary Markdown files in your project.

### Visual editing alongside your Markdown source editor

Merkzeug adds a separate editor tab for the same Markdown file. Keep the built-in Markdown editor available for source editing and switch back to Merkzeug for visual editing. Both work with the same IntelliJ document. The JetBrains Markdown plugin is optional; Merkzeug does not replace it. Other Markdown plugins can remain installed, but compatibility depends on how each plugin registers its editors; we do not claim compatibility with every third-party plugin.

### Images stay with their notes — including IntelliJ refactoring

Images inserted or pasted into `Plan.md` are saved as separate files in the sibling folder `Plan.assets/`. Relative Markdown links connect the note to its images. Commit or share the note and its companion folder together. The desktop and iOS editions use the same directory pattern.

Merkzeug teaches IntelliJ's own **Refactor → Move** and **Refactor → Rename** actions this pairing rule:

- Rename `Plan.md` to `Draft.md`: `Plan.assets/` becomes `Draft.assets/`, and companion-folder references in the note are updated.
- Move the note: its companion folder moves with it.
- Native Undo/Redo applies to the pair.
- Existing destinations stop the operation; companion folders are never merged or overwritten.

Existing shared `assets/` folders remain supported and are not assigned to a single note. The integration applies to IntelliJ Move/Rename refactoring, not external filesystem actions, copying or deletion. Symbolic-link companions require manual handling.

IntelliJ owns saving, Git integration and undo history. Merkzeug follows the IDE theme and offers optional PDF content styles while editing, project-specific PDF templates and automatic discovery of desktop Merkzeug templates. An offline styling prompt explains template files, CSS and preview limitations for your agent. Optional coding-agent guidance can be added to explicitly selected `AGENTS.md` or `CLAUDE.md` files after reviewing their contents.

Merkzeug is proprietary software, free for private and internal business use under the Merkzeug End User License Agreement. It adds its own editor tab; the JetBrains Markdown plugin is optional.

Preview target: IntelliJ IDEA 2026.2.2–2026.2.3, builds 262.10315.125–262.10968.63, with JCEF enabled.

## Deutsch

Merkzeug ist ein visueller Markdown-Editor für IntelliJ IDEA mit Formatierungswerkzeugen, Mermaid-Diagrammen, Frontmatter und PDF-Export. Deine Notizen bleiben gewöhnliche Markdown-Dateien im Projekt.

### Visuell bearbeiten und Markdown-Quelltext nutzen

Merkzeug ergänzt einen eigenen Editor-Tab für dieselbe Markdown-Datei. Der mitgelieferte Markdown-Editor bleibt für die Quelltextbearbeitung verfügbar; für visuelles Bearbeiten wechselst du zurück zu Merkzeug. Beide arbeiten mit demselben IntelliJ-Dokument. Das JetBrains-Markdown-Plugin ist optional und wird nicht ersetzt. Weitere Markdown-Plugins können installiert bleiben; das Zusammenspiel hängt von deren Editor-Registrierung ab. Eine pauschale Kompatibilität mit allen Drittanbieter-Plugins versprechen wir nicht.

### Bilder bleiben bei ihrer Notiz – auch beim IntelliJ-Refactoring

Bilder, die du in `Plan.md` einfügst oder aus der Zwischenablage übernimmst, werden als einzelne Dateien im benachbarten Ordner `Plan.assets/` gespeichert. Relative Markdown-Verweise verbinden die Notiz mit ihren Bildern. Nimm beim Git-Commit oder Weitergeben einer Notiz auch ihren Begleitordner mit. Desktop- und iOS-Version verwenden dasselbe Verzeichnismuster.

Merkzeug erweitert IntelliJs eigene Aktionen **Refactor → Move** und **Refactor → Rename** um diese Zuordnung:

- `Plan.md` in `Draft.md` umbenennen: Aus `Plan.assets/` wird `Draft.assets/`; Verweise auf den Begleitordner in der Notiz werden angepasst.
- Die Notiz verschieben: Ihr Begleitordner wird mitverschoben.
- IntelliJs Rückgängig/Wiederherstellen gilt für beide zusammen.
- Existiert ein Ziel bereits, wird die Aktion gestoppt. Begleitordner werden weder zusammengeführt noch überschrieben.

Bestehende gemeinsame `assets/`-Ordner bleiben unterstützt und werden keiner einzelnen Notiz zugeordnet. Die Integration gilt für IntelliJs Move/Rename-Refactoring, nicht für externe Dateisystemaktionen, Kopieren oder Löschen. Begleitordner mit symbolischen Links müssen manuell behandelt werden.

Speichern, Git-Integration und Undo-Verlauf bleiben bei IntelliJ. Merkzeug folgt dem IDE-Theme und bietet optional PDF-Inhaltsstile beim Bearbeiten, projektspezifische PDF-Vorlagen und die automatische Erkennung von Vorlagen der Desktop-App. Ein offline verfügbarer Styling-Prompt erklärt einem Agenten Vorlagendateien, CSS und Grenzen der Vorschau. Hinweise für Coding-Agenten lassen sich nach Prüfung der vorhandenen Inhalte gezielt in ausgewählte `AGENTS.md`- oder `CLAUDE.md`-Dateien einfügen.

Merkzeug ist proprietäre Software, kostenlos für private und interne geschäftliche Nutzung gemäß der Merkzeug-Endnutzerlizenz. Es ergänzt einen eigenen Editor-Tab; das JetBrains-Markdown-Plugin ist optional.

Vorschau für IntelliJ IDEA 2026.2.2–2026.2.3, Builds 262.10315.125–262.10968.63, mit aktiviertem JCEF.

### Link refactoring

Rename/Move updates local Markdown links in other project notes, including notes without a companion image folder. Moving a note also recalculates outgoing relative links. Inline links, images and reference-style definitions are supported independently of the optional Markdown editor plugin. Code examples and external URLs remain unchanged; all changes participate in native Undo/Redo.

### Link-Refactoring

Rename/Move aktualisiert lokale Markdown-Links in anderen Projektnotizen, auch ohne eigenen Bilderordner. Beim Verschieben werden zusätzlich ausgehende relative Links angepasst. Direkte Links, Bilder und Referenz-Linkdefinitionen werden unabhängig vom optionalen Markdown-Editor-Plugin unterstützt. Codebeispiele und externe URLs bleiben unverändert; alle Änderungen sind Teil von Rückgängig/Wiederherstellen.
