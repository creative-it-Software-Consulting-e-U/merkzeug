# Merkzeug – Hilfe

Merkzeug ist ein nativer macOS-Editor für Markdown-Notizen im Stil von Notion:
Du bearbeitest deine Notizen **WYSIWYG** (formatiert, ohne sichtbare Markdown-Syntax),
gespeichert wird aber immer sauberes, portables Markdown. Alle Notizen liegen als
`.md`-Dateien in einem gewöhnlichen Ordner – dem **Vault**.

---

## 1. Erste Schritte

- Beim ersten Start wählst du einen **Vault-Ordner** (einen beliebigen Ordner mit
  Markdown-Dateien). Die Auswahl wird gemerkt.
- Über **Ablage → Vault öffnen…** (⌘O) wechselst du den Vault des aktuellen Fensters.
- **Ablage → Zuletzt geöffnete Vaults** listet die letzten zehn Vaults zum schnellen
  Wechsel; „Einträge löschen“ leert die Liste.
- **Autosave:** Änderungen werden eine Sekunde nach der letzten Eingabe automatisch
  gespeichert, außerdem beim Schließen von Tabs und beim Beenden der App.
  Manuell: **⌘S** (aktive Notiz) bzw. **⌥⌘S** (alle offenen Notizen).
- Der Vault kann auch per Umgebungsvariable `MERKZEUG_VAULT` vorgegeben werden.

## 2. Sidebar & Dateibaum

Links zeigt die Sidebar den Vault als hierarchischen Baum.

- **Klick auf eine Notiz** öffnet sie in einem Tab; Klick auf einen Ordner klappt ihn auf/zu.
- **Kontextmenü** (Rechtsklick): Übersicht öffnen, neue Notiz, neuer Ordner,
  Umbenennen, in den Papierkorb legen, im Finder zeigen.
- **Verschieben:** Dateien und Ordner einfach per Drag & Drop auf einen Ordner ziehen.
- **Ordnerübersicht:** „Übersicht öffnen“ zeigt den Inhalt eines Ordners als eigenen
  Tab mit Kopfzeile (Name, Pfad, Anzahl der Einträge).
- Die Buttons unten in der Sidebar: neue Notiz, neuer Ordner, Baum neu einlesen und
  das Augen-Symbol zum Ein-/Ausblenden der **Ressourcen-Ordner** (⇧⌘R).
- Änderungen, die außerhalb der App am Vault gemacht werden (Finder, Terminal, Sync),
  erkennt die App automatisch.

## 3. Tabs, Sektionen & Fenster

- Jede Notiz öffnet in einem eigenen **Tab**; **⌘W** schließt den aktiven Tab.
- **Zwei Sektionen** nebeneinander: **⌘\** teilt den Editor-Bereich. Tabs lassen sich
  per Drag & Drop auf die andere Sektion ziehen oder mit **⇧⌘\** verschieben.
- **Mehrere Fenster:** **⌥⌘N** öffnet ein neues Fenster (übernimmt zunächst den Vault
  des aktuellen Fensters; per ⌘O kann jedes Fenster einen anderen Vault anzeigen).

## 4. Editor & Formatierung

Der Editor zeigt die Notiz formatiert an; gespeichert wird Markdown.

- **Zeichenformate:** fett (⌘B), kursiv (⌘I), durchgestrichen (⇧⌘X), Inline-Code (⌘E).
- **Absatzformate:** normaler Text (⌘0), Überschriften 1–3 (⌘1–⌘3), Zitat (⇧⌘9),
  Codeblock (⌥⌘C), Trennlinie (Toolbar).
- **Listen:** Aufzählung (⇧⌘8) und nummerierte Liste (⇧⌘7); verschachteln mit
  Tab/⇧Tab, automatische Fortführung beim Enter und automatische Neunummerierung.
- **Auto-Formatierung beim Tippen:** `# `, `## `, `- `, `1. `, `> ` am Zeilenanfang
  sowie ` ``` ` + Enter erzeugen das jeweilige Format sofort.
- **Tabellen:** Einfügen über Toolbar oder ⌥⌘T. Mit Tab von Zelle zu Zelle springen
  (letzte Zelle + Tab = neue Zeile); Zeilen/Spalten über das Tabellen-Menü der
  Toolbar oder das Kontextmenü einfügen und löschen.
- **Bilder:** per Einfügen aus der Zwischenablage, Drag & Drop oder Toolbar.
- **Undo/Redo** wie gewohnt (⌘Z / ⇧⌘Z).

## 5. Links

- **⌘K** öffnet das Link-Sheet zum Einfügen oder Bearbeiten eines formatierten Links.
- Als Adresse sind möglich: `https://…`-Adressen, Pfade **relativ zur aktuellen
  Datei**, Pfade **relativ zur Vault-Wurzel**, absolute Pfade und `~`-Pfade.
- **Links auf `.md`-Dateien** öffnen die Notiz in einem Tab. **Links auf Ordner**
  klappen den Ordner in der Sidebar auf und öffnen die Ordnerübersicht.
  Externe Links öffnen im Browser bzw. Standardprogramm.

## 6. Navigationsmodus (Lesen & Blättern)

Zum Stöbern in verlinkten Notizen gibt es pro Tab einen **Navigationsmodus** –
umschaltbar mit **⌘R**, über **Ansicht → Navigationsmodus** oder das Buch-Symbol
rechts in der Editor-Toolbar.

- Im Navigationsmodus ist die Notiz **schreibgeschützt**; Klicks auf Vault-Links
  laden das Ziel **im selben Tab** (statt einen neuen Tab zu öffnen).
- Auch **Ordner-Links** bleiben im selben Tab: Der Tab zeigt die Ordnerübersicht,
  und Klicks auf deren Einträge navigieren ebenfalls im selben Tab weiter
  (über das Kontextmenü lässt sich ein Eintrag weiterhin „In neuem Tab öffnen“).
  Beim Verlassen des Modus zeigt der Tab wieder die zuletzt geladene Notiz.
- **Zurück/Vorwärts:** Pfeil-Buttons links in der Toolbar, **⌘[** / **⌘]**,
  Drei-Finger-Wischen (gemäß Systemeinstellung „Zwischen Seiten blättern“) oder die
  Maus-Zusatztasten 4/5.
- Die **Historie bleibt pro Tab erhalten**, auch wenn du den Modus verlässt, die
  Notiz bearbeitest und den Modus später wieder einschaltest.
- Außerhalb des Navigationsmodus sind die Zurück/Vorwärts-Buttons ausgegraut und
  Links verhalten sich wie gewohnt.

## 7. Mermaid-Diagramme

- Codeblöcke mit der Sprache `mermaid` werden direkt im Editor **als Diagramm
  gerendert** (offline, mermaid.js ist in der App enthalten).
- **Klick auf ein Diagramm** zeigt den Quelltext als Codeblock; verlässt der Cursor
  den Block, erscheint wieder das Diagramm. In der Datei bleibt immer der
  ` ```mermaid `-Block erhalten.
- **Zoom-Vorschau:** die Lupe (erscheint beim Überfahren des Diagramms), ⌘-Klick
  oder das Kontextmenü öffnen ein eigenes Fenster – zoomen mit Pinch-Geste oder
  den Tasten **+/−/0**, schließen mit **Esc**.

## 8. Bild-Ressourcen

- Jede Notiz hat einen eigenen Ressourcen-Ordner **`Notizname.assets/`** neben der
  Datei; eingefügte Bilder werden dort abgelegt.
- Beim **Umbenennen** der Notiz wird der Ordner mit umbenannt (inkl. Anpassung der
  Bildpfade in der Notiz), beim **Verschieben** wandert er mit, beim **Löschen**
  landet er mit im Papierkorb.
- Ressourcen-Ordner sind im Dateibaum standardmäßig ausgeblendet (⇧⌘R zeigt sie).

## 9. Git-Integration

Ist der Vault ein **Git-Repository**, erscheint unten in der Sidebar eine Statuszeile:

- **Branch-Name**, Anzahl geänderter Dateien (orange Punkt), **n↑** = lokale Commits,
  die noch nicht gepusht wurden (orange), **n↓** = neue Commits auf dem Server,
  grünes Häkchen = alles committet und gepusht.
- Der Status aktualisiert sich automatisch – auch wenn du außerhalb der App
  committest oder pullst.
- **Klick auf die Statuszeile** öffnet ein Fenster mit den Details: Liste der
  geänderten Dateien (M = geändert, A = neu, D = gelöscht, R = umbenannt,
  ? = unversioniert, ! = Konflikt), Eingabefeld für die Commit-Nachricht sowie
  die Buttons **Pull** und **Commit & Push**.
- **Commit & Push** sichert zuerst alle offenen Notizen, dann `git add`, Commit und
  Push. Gibt es nichts mehr zu committen, aber ungepushte Commits, heißt der Button
  **Push**. Ohne konfigurierten Upstream wird dieser automatisch gesetzt; ohne
  Remote wird nur lokal committet (mit Hinweis).
- **Pull** holt Änderungen vom Server. Bei Merge-Konflikten erscheint eine
  Fehlermeldung und die betroffenen Dateien werden mit **!** gelistet; die
  Konflikte löst du dann außerhalb der App.
- Die App nutzt die Git-Zugangsdaten deines Systems (SSH-Schlüssel oder Credential
  Helper). Wäre eine interaktive Anmeldung nötig, bricht der Vorgang mit einer
  Fehlermeldung ab statt zu warten.

## 10. Tastaturkürzel

| Kürzel | Funktion |
| --- | --- |
| ⌘N | Neue Notiz |
| ⇧⌘N | Neuer Ordner |
| ⌥⌘N | Neues Fenster |
| ⌘O | Vault öffnen |
| ⌘W | Tab schließen |
| ⌘S / ⌥⌘S | Sichern / Alle sichern |
| ⌘B / ⌘I / ⇧⌘X / ⌘E | Fett / Kursiv / Durchgestrichen / Inline-Code |
| ⌘0 … ⌘3 | Text / Überschrift 1–3 |
| ⇧⌘8 / ⇧⌘7 | Aufzählung / Nummerierte Liste |
| ⇧⌘9 / ⌥⌘C | Zitat / Codeblock |
| ⌘K | Link einfügen/bearbeiten |
| ⌥⌘T | Tabelle einfügen |
| ⌘R | Navigationsmodus ein/aus |
| ⌘[ / ⌘] | Zurück / Vorwärts (Navigationsmodus) |
| ⌘\ | Zweite Sektion ein-/ausblenden |
| ⇧⌘\ | Tab in andere Sektion verschieben |
| ⇧⌘R | Ressourcen ein-/ausblenden |
