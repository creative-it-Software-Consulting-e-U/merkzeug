# MyNotion

WYSIWYG-Markdown-Editor (wie Notion) für einen Ordner („Vault") mit
Markdown-Dateien. Gespeichert wird immer sauberes Markdown — die Vaults sind
zwischen allen App-Versionen voll austauschbar.

## Aufbau des Repos

| Ordner | Inhalt |
|---|---|
| [`crossplatform/`](crossplatform/README.md) | **Die aktuelle App**: Electron + Milkdown, eine Codebasis für macOS, Windows und Linux |
| [`legacy/`](legacy/README.md) | Die frühere native macOS-App (SwiftUI + AppKit, SwiftPM) |
| `SampleVault/` | Beispiel-Vault zum Ausprobieren |

## Schnellstart (aktuelle App)

```bash
cd crossplatform
npm install
npm run dev            # Entwicklungsmodus mit Hot Reload
npm run package:mac    # macOS-App nach dist/mac-arm64/MyNotion.app
npm run package:win    # Windows-Installer (NSIS, x64 + arm64 kombiniert)
npm run package:linux  # Linux x64: AppImage, .deb und .rpm
```

Funktionsumfang, Architektur und Details stehen in
[`crossplatform/README.md`](crossplatform/README.md); die Legacy-App ist in
[`legacy/README.md`](legacy/README.md) beschrieben und wird dort mit
`make run` / `make install` gebaut.
