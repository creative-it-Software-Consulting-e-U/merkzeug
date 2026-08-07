# Merkzeug Mobile – iOS/iPadOS-Spike

Experimenteller Port von Merkzeug auf iOS/iPadOS: **Capacitor**-Schale um den
gleichen Milkdown/Crepe-Editor wie in `crossplatform/`. Git übernimmt die App
bewusst **nicht** selbst — der Vault-Ordner kommt von
[Working Copy](https://apps.apple.com/app/working-copy-git-client/id896694807)
(oder ist ein beliebiger Ordner in der Dateien-App); committen/pushen/pullen
passiert dort.

## Architektur

- `src/` – React-App (Vite). Dateibaum als Liste, Milkdown-Editor mit
  Link-Navigation (Zurück/Vorwärts-Stack), Mermaid-Vorschau, Autosave.
  Standardmäßig **Lesemodus**; ✎ schaltet Bearbeitung ein.
- `src/vault.ts` – `VaultBackend`-Interface. Nativ: Capacitor-Plugin `Vault`;
  im Browser (`npm run dev`): In-Memory-Demo-Vault.
- `ios/App/App/VaultPlugin.swift` – natives Plugin: Ordner-Picker
  (`UIDocumentPickerViewController`), security-scoped Bookmark (überlebt
  App-Neustarts), Dateibaum-Scan, Lesen/Schreiben mit `NSFileCoordinator`
  (Pflicht bei File-Provider-Ordnern wie denen von Working Copy).
- Pfade sind im JS-Teil immer **Vault-relativ** (`/Projekte/Ideen.md`).

## Entwicklung

```bash
npm install
npm run dev      # Browser-Dev-Modus mit Demo-Vault (ohne native Funktionen)
npm run build    # Type-Check + Vite-Build nach dist/
npm run sync     # Build + Web-Assets/Plugins nach ios/ synchronisieren
npm run open     # Xcode öffnen
```

Das iOS-Projekt nutzt **Swift Package Manager** (kein CocoaPods nötig).

## Auf dem Gerät ausprobieren

1. `npm run sync && npm run open`
2. In Xcode: Team (3BNJ4M9R56) unter *Signing & Capabilities* wählen,
   Gerät anschließen, Run. (Fürs private Testen reicht ein Development-Profil,
   kein App-Store-Review.)
3. Auf dem Gerät: In **Working Copy** das Vault-Repo klonen.
4. In **Merkzeug** „Vault-Ordner öffnen“ → im Picker *Durchsuchen → Working
   Copy → \<Repo\>* wählen. Die Freigabe merkt sich die App dauerhaft.
5. Nach einem Pull in Working Copy genügt ein Wechsel zurück zu Merkzeug
   (oder ↻), um den neuen Stand zu sehen.

Im Simulator gibt es kein Working Copy — dort stattdessen einen Ordner unter
„Auf meinem iPhone“ anlegen und den auswählen.

## Bewusste Grenzen des Spikes

- Kein Git in der App (Commit/Push/Pull → Working Copy).
- Kein Datei-Watcher: neu eingelesen wird beim App-Wechsel oder per ↻.
- Kein Anlegen/Umbenennen/Löschen von Notizen und Ordnern.
- Bilder aus dem Vault werden als data-URIs geladen (gut für Notizen,
  ungeeignet für sehr große Bilder); Einfügen legt sie unter `assets/` ab.
- Keine Tabs/Panes wie am Desktop — eine Notiz zur Zeit, Navigation über
  den Zurück/Vorwärts-Stack.
- Hilfe (⌘?) ist nicht eingebaut; bei Übernahme als echtes Feature gelten
  die Regeln aus `CLAUDE.md` (Hilfe + README beider Sprachen pflegen).
