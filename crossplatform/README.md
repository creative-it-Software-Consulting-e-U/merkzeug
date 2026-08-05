# MyNotion – Cross-Platform (macOS, Windows & Linux)

Die **aktuelle App-Version** von MyNotion auf Basis von **Electron + Milkdown**
(ProseMirror): ein Vault-basierter WYSIWYG-Markdown-Editor aus einer Codebasis
für macOS, **Windows und Linux**. Die frühere native macOS-App liegt als
Legacy-Version unter `../legacy/`.
Die Markdown-Dateien sind zwischen beiden Apps voll austauschbar.

## Entwickeln & Bauen

```bash
npm install            # Abhängigkeiten installieren
npm run dev            # Entwicklungsmodus mit Hot Reload
npm run package:mac    # macOS-App (unsigniert) nach dist/mac-arm64/MyNotion.app
npm run package:mac:dmg# macOS-DMG nach dist/
npm run package:win    # Windows-Installer (NSIS, x64 + arm64 kombiniert) – läuft auch auf dem Mac
npm run package:linux  # Linux x64: AppImage, .deb und .rpm – läuft auch auf dem Mac
```

Der Windows-Installer lässt sich direkt auf dem Mac bauen (`package:win`);
getestet wird er z. B. in einer Windows-11-VM (UTM, Parallels) oder per CI.

Für die Linux-Pakete (`package:linux`) werden auf dem Mac zusätzlich
`gnu-tar`, `xz` (für .deb) und `rpm` (für .rpm) benötigt:
`brew install gnu-tar xz rpm`.

## Aufbau

```
src/main/       Electron-Main-Prozess: Fenster, Menü (deutsch), IPC,
                Datei-Operationen inkl. .assets-Logik, chokidar-Watcher, Git
src/preload/    Typisierte IPC-Brücke (window.mynotion)
src/renderer/   React-UI: Sidebar/Dateibaum, Tabs & zwei Sektionen,
                Milkdown-Crepe-Editor, Ordnerübersicht, Hilfe- & Zoom-Fenster
src/shared/     Gemeinsame Typen (IPC-Verträge)
resources/help/ In-App-Hilfe (DE/EN) – bei Feature-Änderungen aktualisieren!
```

## Funktionsumfang

Entspricht der nativen macOS-App (siehe `../legacy/README.md`): Vault-Ordner mit
Dateibaum, Tabs und zwei Sektionen, Mehrfenster-Betrieb, WYSIWYG-Editor mit
Tabellen, Bildern (`Notizname.assets/`), formatierten Links (⌘K),
Mermaid-Diagrammen inkl. Zoom-Fenster, Navigationsmodus mit Historie,
Git-Integration (Status, Commit & Push, Pull), Hilfe in DE/EN (⌘? oder
Hilfe-Button in der Toolbar) und
Autosave. Bonus gegenüber der Mac-App: Slash-Menü („/“), Auswahl-Toolbar,
Aufgabenlisten und Verschieben von Blöcken per Drag & Drop.

## Bekannte Unterschiede zur Mac-App

- Beim ersten echten Bearbeiten einer Notiz normalisiert die Markdown-Engine
  (remark) die Formatierung leicht (z. B. ausgerichtete Tabellenspalten).
  Reines Öffnen/Lesen verändert Dateien nie.
- Mermaid: Umschalten Diagramm ↔ Quelltext über den Button am Block
  (statt automatisch über die Cursor-Position).
- Web-Bilder (`http…`) werden angezeigt, wenn eine Internetverbindung besteht
  (die Mac-App zeigt einen Platzhalter).
- Drei-Finger-Wischen und Maus-Zusatztasten für Zurück/Vorwärts sind nicht
  belegt (⌘[ / ⌘] und Toolbar-Pfeile funktionieren).

## Debug-Screenshots

Für automatisierte UI-Tests kann die App mit
`MYNOTION_SCREENSHOT=/pfad.png [MYNOTION_CLICK='Schritt;;Schritt…']`
gestartet werden; sie führt die Schritte aus, speichert einen Screenshot und
beendet sich (Schritte: Baum-Label, `menu:<aktion>`, `js:<code>`, `helpwindow`).
