# MyNotion – Hinweise für Claude

Native macOS-App (SwiftUI + AppKit, SwiftPM): WYSIWYG-Markdown-Editor für einen
Vault-Ordner. Architektur und Feature-Überblick stehen in `README.md`.

## Bauen & Testen

```bash
swift build          # Debug-Build
swift test           # alle Tests
make install         # Release-Build als App-Bundle nach /Applications
```

## WICHTIG: Hilfe aktuell halten

Die App enthält eine vollständige Benutzer-Hilfe in zwei Sprachen:

- `Sources/MyNotion/Resources/Help.de.md` (Deutsch)
- `Sources/MyNotion/Resources/Help.en.md` (Englisch)

**Bei jedem neuen Feature und jeder Verhaltensänderung (auch geänderte
Tastaturkürzel, Menüs oder UI-Umbauten) muss geprüft werden, ob diese beiden
Dateien anzupassen sind — und zwar immer beide Sprachen synchron.** Die Tabelle
der Tastaturkürzel am Ende beider Dateien ebenfalls aktualisieren. Die Hilfe
wird über Menü „Hilfe → MyNotion-Hilfe" (⌘?) angezeigt und mit der App-eigenen
Markdown-Engine gerendert (`HelpView.swift`); Mermaid-Blöcke dort vermeiden,
da das Hilfe-Fenster keine Diagramme rendert.

Das gleiche gilt sinngemäß für den Funktionsüberblick in `README.md`.
