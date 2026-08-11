# Merkzeug – Cross-Platform (macOS, Windows & Linux)

Die **aktuelle App-Version** von Merkzeug auf Basis von **Electron + Milkdown**
(ProseMirror): ein Vault-basierter WYSIWYG-Markdown-Editor aus einer Codebasis
für macOS, **Windows und Linux**. Die frühere native macOS-App liegt als
Legacy-Version unter `../legacy/`.
Die Markdown-Dateien sind zwischen beiden Apps voll austauschbar.

## Entwickeln & Bauen

```bash
npm install            # Abhängigkeiten installieren
npm run dev            # Entwicklungsmodus mit Hot Reload
npm run package:mac    # macOS-App (signiert) nach dist/mac-arm64/Merkzeug.app
npm run package:mac:dmg# macOS-DMG (signiert) nach dist/
npm run package:win    # Windows-Installer (NSIS, x64 + arm64 kombiniert) – läuft auch auf dem Mac
npm run package:linux  # Linux x64: AppImage, .deb und .rpm – läuft auch auf dem Mac
```

Der Windows-Installer lässt sich direkt auf dem Mac bauen (`package:win`);
getestet wird er z. B. in einer Windows-11-VM (UTM, Parallels) oder per CI.

Für die Linux-Pakete (`package:linux`) werden auf dem Mac zusätzlich
`gnu-tar`, `xz` (für .deb) und `rpm` (für .rpm) benötigt:
`brew install gnu-tar xz rpm`.

### macOS: Signierung & Notarisierung

Die macOS-Builds werden automatisch mit dem „Developer ID Application“-
Zertifikat (Team `3BNJ4M9R56`, creative-it) aus dem Login-Schlüsselbund
signiert (Hardened Runtime, Entitlements in `build/entitlements.mac.plist`).
Fehlt das Zertifikat im Schlüsselbund, bricht der Build mit einem
Signierfehler ab.

Für die Notarisierung (empfohlen vor Weitergabe des DMG) müssen vor dem
Build diese Variablen gesetzt sein — dann notarisiert electron-builder
automatisch, andernfalls wird der Schritt übersprungen:

```bash
export APPLE_API_KEY=~/.appstoreconnect/private_keys/AuthKey_2DJ72DRWCB.p8
export APPLE_API_KEY_ID=2DJ72DRWCB
export APPLE_API_ISSUER=69a6de6e-8907-47e3-e053-5b8c7c11a4d1
npm run package:mac:dmg
```

## Aufbau

```
src/main/       Electron-Main-Prozess: Fenster, Menü (deutsch), IPC,
                Datei-Operationen inkl. .assets-Logik, chokidar-Watcher, Git
src/preload/    Typisierte IPC-Brücke (window.merkzeug)
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
Aufgabenlisten, Verschieben von Blöcken per Drag & Drop, automatische
Benennung neuer Notizen nach ihrer Überschrift 1 (Slug wie
`2026-08-11-bpp-call-neustrukturierung`, bis zum manuellen Umbenennen) und
die Tipp-Ersetzung `->` → „→“. Extern geänderte
Dateien werden auch in offenen Tabs erkannt: ohne eigene ungespeicherte
Änderungen lädt der Tab neu (mit Uhrzeit-Hinweis über dem Editor), sonst
bietet ein Banner „Neu laden" oder „Meine Version behalten" an.

Abhängigkeits- und Build-Ordner (`node_modules`, `__pycache__`, virtualenvs
sowie `target`/`build`/`dist`/`out` neben der passenden Build-Datei, siehe
`src/main/ignore.ts`) werden im Dateibaum ausgeblendet und nicht überwacht —
dadurch bleiben auch große Code-Repos als Vault benutzbar.

## Bekannte Unterschiede zur Mac-App

- Beim ersten echten Bearbeiten einer Notiz normalisiert die Markdown-Engine
  (remark) die Formatierung leicht (z. B. ausgerichtete Tabellenspalten).
  Reines Öffnen/Lesen verändert Dateien nie.
- Mermaid: Umschalten Diagramm ↔ Quelltext über den Button am Block
  (statt automatisch über die Cursor-Position).
- Web-Bilder (`http…`) werden angezeigt, wenn eine Internetverbindung besteht
  (die Mac-App zeigt einen Platzhalter).

## Debug-Screenshots

Für automatisierte UI-Tests kann die App mit
`MERKZEUG_SCREENSHOT=/pfad.png [MERKZEUG_CLICK='Schritt;;Schritt…']`
gestartet werden; sie führt die Schritte aus, speichert einen Screenshot und
beendet sich (Schritte: Baum-Label, `menu:<aktion>`, `js:<code>`, `helpwindow`).
