# Merkzeug – Hinweise für Claude

WYSIWYG-Markdown-Editor für einen Vault-Ordner, in zwei Varianten:

- `crossplatform/` — **die aktuelle App**: Electron + Milkdown, eine Codebasis
  für macOS, Windows und Linux (siehe `crossplatform/README.md`).
  Änderungen und neue Features landen hier.
- `legacy/` — die frühere native macOS-App (SwiftUI + AppKit, SwiftPM, siehe
  `legacy/README.md`). Nur noch pflegen, wenn explizit gewünscht.

## Bauen & Testen

Aktuelle App (in `crossplatform/`):

```bash
npm install
npm run dev            # Entwicklungsmodus mit Hot Reload
npm run build          # electron-vite build (auch für Type-Fehler-Check)
npm run package:mac    # macOS-App nach dist/mac-arm64/Merkzeug.app
npm run package:win    # Windows-Installer (NSIS, x64 + arm64 kombiniert)
npm run package:linux  # Linux x64: AppImage, .deb, .rpm
```

Legacy-App (in `legacy/`):

```bash
swift build          # Debug-Build
swift test           # alle Tests
make install         # Release-Build als App-Bundle nach /Applications
```

Achtung: `make install` der Legacy-App überschreibt `/Applications/Merkzeug.app`
— dort ist normalerweise die aktuelle (Electron-)App installiert.

## WICHTIG: Hilfe aktuell halten

Beide Apps enthalten eine vollständige Benutzer-Hilfe in zwei Sprachen:

- Aktuelle App: `crossplatform/resources/help/Help.de.md` und `Help.en.md`
- Legacy-App: `legacy/Sources/Merkzeug/Resources/Help.de.md` und `Help.en.md`

**Bei jedem neuen Feature und jeder Verhaltensänderung (auch geänderte
Tastaturkürzel, Menüs oder UI-Umbauten) muss geprüft werden, ob die Hilfe der
betroffenen App anzupassen ist — und zwar immer beide Sprachen synchron.** Die
Tabelle der Tastaturkürzel am Ende beider Dateien ebenfalls aktualisieren. Die
Hilfe wird über Menü „Hilfe → Merkzeug-Hilfe" (⌘?) angezeigt und mit der
jeweils app-eigenen Markdown-Engine gerendert (Legacy: `HelpView.swift`);
Mermaid-Blöcke dort vermeiden, da das Hilfe-Fenster keine Diagramme rendert.

Das gleiche gilt sinngemäß für den Funktionsüberblick in der jeweiligen
`README.md`.
