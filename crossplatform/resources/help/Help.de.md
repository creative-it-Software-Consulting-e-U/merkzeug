# Merkzeug – Hilfe für Mac & Linux

Auf einem deutschen System erscheinen Oberfläche und Hilfe auf Deutsch, andernfalls auf Englisch. Die Sprache dieser Hilfe lässt sich unabhängig umschalten.

Merkzeug ist ein Editor für Markdown-Notizen im Stil von Notion – diese Version
läuft auf **macOS und Linux** (Windows folgt). Du bearbeitest deine Notizen **WYSIWYG**
(formatiert, ohne sichtbare Markdown-Syntax), gespeichert wird aber immer
sauberes, portables Markdown. Alle Notizen liegen als `.md`-Dateien in einem
gewöhnlichen Ordner – dem **Vault**.

Die Kürzel zeigen zuerst Mac, danach Linux/Windows. Die Tabelle der Tastaturkürzel führt beide Plattformen ausdrücklich auf.

**Inhalt:** [1. Erste Schritte](#1.-erste-schritte) ·
[2. Sidebar & Dateibaum](#2.-sidebar-&-dateibaum) ·
[3. Tabs, Sektionen & Fenster](#3.-tabs,-sektionen-&-fenster) ·
[4. Editor & Formatierung](#4.-editor-&-formatierung) ·
[5. Links](#5.-links) ·
[6. Navigationsmodus](#6.-navigationsmodus-%28lesen-&-blättern%29) ·
[7. Mermaid-Diagramme](#7.-mermaid-diagramme) ·
[8. Bild-Ressourcen](#8.-bild-ressourcen) ·
[9. PDF-Export](#9.-pdf-export) ·
[10. Git-Integration](#10.-git-integration) ·
[11. Tastaturkürzel](#11.-tastaturkürzel) ·
[Meeting-Notizen und Kalender](#meeting-notizen-und-kalender) ·
[Linux-Installation & Unterschiede](#linux-installation-und-plattformunterschiede)

---

## 1. Erste Schritte

- Beim ersten Start wählst du einen **Vault-Ordner** (einen beliebigen Ordner mit
  Markdown-Dateien). Die Auswahl wird gemerkt.
- Über **Ablage → Vault öffnen…** (⌘O / Strg+O) wechselst du den Vault des aktuellen Fensters.
- **Ablage → Zuletzt geöffnete Vaults** listet die letzten zehn Vaults zum schnellen
  Wechsel.
- **Autosave:** Änderungen werden eine Sekunde nach der letzten Eingabe automatisch
  gespeichert, außerdem beim Schließen von Tabs und beim Beenden der App.
  Manuell: **⌘S / Strg+S** (aktive Notiz) bzw. **⌥⌘S / Strg+Alt+S** (alle offenen Notizen).
- Der Vault kann auch per Umgebungsvariable `MERKZEUG_VAULT` vorgegeben werden.

## 2. Sidebar & Dateibaum

Links zeigt die Sidebar den Vault als hierarchischen Baum.

- **Klick auf eine Notiz** öffnet sie in einem Tab; Klick auf einen Ordner klappt
  ihn auf/zu. **Doppelklick auf einen Ordner** öffnet die Ordnerübersicht.
- **Breite anpassen:** Die Trennlinie zwischen Sidebar und Editorbereich lässt
  sich mit der Maus ziehen; Doppelklick darauf stellt die Standardbreite wieder
  her. Reicht der Platz für lange Namen oder tiefe Hierarchien nicht, kann der
  Baum horizontal und vertikal gescrollt werden.
- **Kontextmenü** (Rechtsklick): neue Notiz, neuer Ordner, als PDF exportieren,
  Umbenennen, in den Papierkorb legen, im Finder/Explorer zeigen.
- **Mehrfachauswahl:** ⌘-Klick (Windows/Linux: Ctrl-Klick) nimmt weitere
  Notizen in die Auswahl auf bzw. wieder heraus, ⇧-Klick wählt den Bereich
  bis zur angeklickten Notiz — beides nur unter Notizen **desselben Ordners**.
  Rechtsklick auf die Auswahl bietet dann **„N Dateien als PDF
  exportieren…“** an (siehe Abschnitt PDF-Export).
- **Verschieben:** Dateien und Ordner einfach per Drag & Drop auf einen Ordner ziehen.
- **Ordnerübersicht:** zeigt den Inhalt eines Ordners als Karten in einem eigenen
  Tab; Klicks auf Notizen und Unterordner navigieren weiter.
- **Fußleiste der Sidebar:** Buttons für neue Notiz, neue Meeting-Notiz und
  neuen Ordner (links) sowie zum Neu-Einlesen des Vaults; das Augen-Symbol
  blendet die **Ressourcen-Ordner** ein/aus (⇧⌘R / Strg+Shift+R).
- **Meeting-Notizen:** siehe [Meeting-Notizen und Kalender](#meeting-notizen-und-kalender).
- **Automatische Benennung neuer Notizen:** Eine neue Notiz heißt zunächst
  „Neue Notiz“. Beginnt sie mit einer **Überschrift 1**, wird die Datei beim
  Speichern automatisch nach dem Titel benannt: alles klein, Leerzeichen und
  Sonderzeichen werden zu „-“, Umlaute bleiben erhalten — aus
  „2026-08-11 BPP Call Gerulf & Alois - Neustrukturierung“ wird
  `2026-08-11-bpp-call-gerulf-alois-neustrukturierung.md`. Ändert sich die
  Überschrift, zieht der Dateiname nach. Sobald du die Datei einmal **manuell
  umbenennst**, bleibt dein Name unangetastet.
- Änderungen, die außerhalb der App am Vault gemacht werden (Finder/Explorer,
  Terminal, Sync), erkennt die App automatisch. Das gilt auch für **offene
  Notizen**: Ändert sich die Datei auf der Platte, lädt der Tab sie neu und
  zeigt einen Hinweis mit Uhrzeit („Neu geladen um …“) über dem Editor.
  Hast du dort gerade ungespeicherte Änderungen, erscheint stattdessen ein
  Banner mit der Wahl **„Neu laden“** (Stand von der Platte übernehmen) oder
  **„Meine Version behalten“** (eigene Änderungen speichern); bis zur
  Entscheidung wird nichts überschrieben.
- **Versteckte und technische Ordner:** Einträge, die mit einem Punkt beginnen
  (z. B. `.git`), sowie Abhängigkeits- und Build-Ordner aus Software-Projekten
  werden ausgeblendet und nicht überwacht — `node_modules`, `__pycache__`,
  Python-virtualenvs sowie `target`, `build`, `dist` und `out`, wenn daneben
  die passende Build-Datei liegt (z. B. `pom.xml` oder `package.json`). So
  bleibt die App auch flüssig, wenn ein großes Code-Repository als Vault
  geöffnet wird.
  Überschriften und Datumsangaben neuer Meeting-Notizen folgen der App-Sprache. Termintitel und Namen der Teilnehmer bleiben unverändert.

## 3. Tabs, Sektionen & Fenster

- Jede Notiz öffnet in einem eigenen **Tab**; **⌘W / Strg+W** schließt den aktiven Tab,
  **⇧⌘W / Strg+Shift+W** das Fenster.
- **Zwei Sektionen** nebeneinander: **⌘\ / Strg+\** teilt den Editor-Bereich. Tabs lassen sich
  per Drag & Drop auf die andere Tab-Leiste ziehen oder mit **⇧⌘\ / Strg+Shift+\** verschieben.
- **Mehrere Fenster:** **⌥⌘N / Strg+Alt+N** öffnet ein neues Fenster (übernimmt zunächst den Vault
  des aktuellen Fensters; per ⌘O / Strg+O kann jedes Fenster einen anderen Vault anzeigen).

## 4. Editor & Formatierung

Der Editor zeigt die Notiz formatiert an; gespeichert wird Markdown.

- **Toolbar:** Die Leiste über dem Editor bietet Absatzformat, fett/kursiv/
  durchgestrichen/Inline-Code, Listen, Zitat, Codeblock, Link, Bild, Tabelle
  und Trennlinie — plus Zurück/Vorwärts sowie rechts den Hilfe-Button
  (Fragezeichen, öffnet diese Hilfe) und den Navigationsmodus (Buch-Symbol).
- **Inhaltsverzeichnis-Dropdown:** Der Listen-Button links in der Toolbar
  zeigt alle Überschriften der Notiz (eingerückt nach Ebene); ein Klick
  springt direkt zur jeweiligen Überschrift. Funktioniert auch im
  Navigationsmodus.
- **Slash-Menü:** Tippe **„/“** in einer leeren Zeile für alle Block-Typen
  (Überschriften, Listen, Zitat, Codeblock, Tabelle, Bild …).
- **Auswahl-Toolbar:** Text markieren zeigt eine schwebende Leiste für fett,
  kursiv, durchgestrichen, Inline-Code und Links.
- **Zeichenformate:** fett (⌘B / Strg+B), kursiv (⌘I / Strg+I), Inline-Code (⌘E / Strg+E),
  durchgestrichen (⌥⌘X / Strg+Alt+X).
- **Absatzformate:** normaler Text (⌥⌘0 / Strg+Alt+0), Überschriften 1–6 (⌥⌘1 / Strg+Alt+1–⌥⌘6 / Strg+Alt+6),
  Zitat (⇧⌘B / Strg+Shift+B), Codeblock (⌥⌘C / Strg+Alt+C).
- **Listen:** Aufzählung (⌥⌘8 / Strg+Alt+8), nummerierte Liste (⌥⌘7 / Strg+Alt+7) und Aufgabenlisten;
  verschachteln mit Tab/⇧Tab, automatische Fortführung beim Enter und
  automatische Neunummerierung.
- **Auto-Formatierung beim Tippen:** `# `, `## `, `- `, `1. `, `> ` am Zeilenanfang
  sowie ` ``` ` erzeugen das jeweilige Format sofort; `->` wird zu einem
  Pfeil „→“.
- **Tabellen:** Einfügen über ⌥⌘T / Strg+Alt+T, das Slash-Menü oder Menü „Bearbeiten“. Mit Tab
  von Zelle zu Zelle springen; Zeilen/Spalten über die Tabellen-Steuerung direkt
  an der Tabelle oder das Menü **Tabelle** einfügen und löschen.
- **Bilder:** per Einfügen aus der Zwischenablage, Drag & Drop, Slash-Menü oder
  Menü „Bearbeiten → Bild einfügen…“.
- **Undo/Redo** wie gewohnt (⌘Z / Strg+Z / ⇧⌘Z / Strg+Shift+Z).
- **Suchen & Ersetzen:** **⌘F / Strg+F** öffnet die Suchleiste rechts oben im Editor,
  **⌥⌘F / Strg+Alt+F** zusätzlich die Ersetzen-Zeile (auch über **Bearbeiten → Suchen…**).
  Gesucht wird in der aktuellen Notiz ohne Beachtung der Groß-/Kleinschreibung;
  eine markierte Textstelle wird als Suchbegriff übernommen. **↩** springt zum
  nächsten, **⇧↩** zum vorherigen Treffer, **Esc** schließt die Leiste.
  „Ersetzen“ ersetzt den aktuellen Treffer, „Alle“ sämtliche Treffer. Im
  Navigationsmodus ist nur Suchen möglich, nicht Ersetzen.
- **Blöcke verschieben:** Der Griff links neben einem Block (erscheint beim
  Überfahren) erlaubt Verschieben per Drag & Drop.
- **YAML-Frontmatter:** Ein `---`-Block am Dateianfang (z. B. mit `title:`,
  `tags:` …) erscheint nicht im Text, sondern hinter dem grauen, aufklappbaren
  Balken **„Frontmatter“** ganz oben im Editor. Dort lässt er sich direkt
  bearbeiten; wird das Feld geleert, entfällt der Block beim Speichern.
  `title:` bestimmt den Titel beim PDF-Export.
- **Welche Felder wertet Merkzeug aus?** Das Menü **„+ Feld“** rechts im
  Frontmatter-Balken listet sie mit Erklärung auf (derzeit `title:`,
  `pdf-linked-title:`, `pdf-exclude:`, `pdf-toc:` und `language:`) und fügt per Klick eine
  Vorlagen-Zeile ein. Eigene Felder darüber hinaus werden gespeichert, aber
  nicht ausgewertet.

Bei Auswahl einer ganzen Tabellenzelle wird die Zelle hervorgehoben. Klicke in den Text, um den Cursor zu setzen und zu bearbeiten. Text und Links behalten bei der Zellauswahl ihre Farben, auch mit PDF-Vorlagenstilen.

## 5. Links

- **⌘K / Strg+K** öffnet den Link-Dialog zum Einfügen eines formatierten Links; bestehende
  Links bearbeitest du über den Tooltip, der beim Klick auf den Link erscheint.
- Als Adresse sind möglich: `https://…`-Adressen, Pfade **relativ zur aktuellen
  Datei**, Pfade **relativ zur Vault-Wurzel** (führender „/“) und absolute Pfade.
- **Links auf `.md`-Dateien** öffnen die Notiz in einem Tab. **Links auf Ordner**
  klappen den Ordner in der Sidebar auf und öffnen die Ordnerübersicht.
  Externe Links öffnen im Browser bzw. Standardprogramm.
- **Links auf Überschriften:** Hänge `#überschrift` an das Ziel an, um direkt zu
  einer Überschrift zu springen – z. B. `notiz.md#erste-schritte`. Nur
  `#erste-schritte` springt zur Überschrift **in derselben Notiz**. Das Fragment
  ist der Überschriftentext in Kleinbuchstaben mit `-` statt Leerzeichen;
  Groß-/Kleinschreibung und Satzzeichen werden beim Springen tolerant behandelt.
  Die Ziel-Überschrift wird nach dem Sprung kurz hervorgehoben. Zeigt das
  Fragment auf keine vorhandene Überschrift, öffnet die Notiz am Anfang.

## 6. Navigationsmodus (Lesen & Blättern)

Zum Stöbern in verlinkten Notizen gibt es pro Tab einen **Navigationsmodus** –
umschaltbar mit **⌘R / Strg+R**, über **Ansicht → Navigationsmodus** oder das Buch-Symbol
in der Toolbar.

- Im Navigationsmodus ist die Notiz **schreibgeschützt**; Klicks auf Vault-Links
  laden das Ziel **im selben Tab** (statt einen neuen Tab zu öffnen).
- Auch **Ordner-Links** bleiben im selben Tab: Der Tab zeigt die Ordnerübersicht,
  und Klicks auf deren Einträge navigieren im selben Tab weiter.
- **Zurück/Vorwärts:** Pfeil-Buttons in der Toolbar, **⌘[ / Strg+[** / **⌘] / Strg+]**, die
  Zurück-/Vorwärts-Tasten der Maus oder Wischgesten auf dem Trackpad
  (horizontales Wischen mit zwei Fingern, unter macOS auch mit drei Fingern,
  wenn „Zwischen Seiten blättern" entsprechend eingestellt ist).
- Beim Zurück-/Vorwärtsgehen landest du wieder an der **Stelle, an der du die
  Notiz verlassen hast** (bzw. am verlinkten Anker, wenn du dort nicht gescrollt
  hattest).
- Die **Historie bleibt pro Tab erhalten**, auch wenn du den Modus verlässt, die
  Notiz bearbeitest und den Modus später wieder einschaltest.

## 7. Mermaid-Diagramme

- Codeblöcke mit der Sprache `mermaid` werden direkt im Editor **als Diagramm
  gerendert** (offline, mermaid.js ist in der App enthalten).
- Der Button **„Bearbeiten“** am Diagramm zeigt den Quelltext; **„Diagramm“**
  wechselt zurück zur gerenderten Ansicht. In der Datei bleibt immer der
  ` ```mermaid `-Block erhalten.
- **Zoom-Vorschau:** die Lupe (erscheint beim Überfahren des Diagramms) oder
  ⌘-Klick öffnen ein eigenes Fenster – zoomen mit ⌘+Scrollen bzw. Pinch oder den
  Tasten **+/−/0**, schließen mit **Esc**.

## 8. Bild-Ressourcen

- Jede Notiz hat einen eigenen Ressourcen-Ordner **`Notizname.assets/`** neben der
  Datei; eingefügte Bilder werden dort abgelegt.
- Beim **Umbenennen** der Notiz wird der Ordner mit umbenannt (inkl. Anpassung der
  Bildpfade in der Notiz), beim **Verschieben** wandert er mit, beim **Löschen**
  landet er mit im Papierkorb.
- Ressourcen-Ordner sind im Dateibaum standardmäßig ausgeblendet (⇧⌘R / Strg+Shift+R zeigt sie).

## 9. PDF-Export

- **Ablage → Als PDF exportieren…** exportiert die aktive Notiz als PDF;
  alternativ per Rechtsklick auf eine Notiz im Dateibaum.
- Verlinkt die Notiz weitere Markdown-Dateien **in derselben Hierarchie** (im
  eigenen Ordner oder darunter), fragt die App: **„Nur diese Datei“** oder
  **„Mit verlinkten Dokumenten“**. Letzteres ist für Index-Dateien wie eine
  `README` mit Inhaltsverzeichnis gedacht: Zuerst kommt die Index-Datei,
  danach alle direkt verlinkten Dokumente in alphabetischer Reihenfolge –
  jedes beginnt auf einer neuen Seite.
- **Mehrere Notizen einzeln exportieren:** Nach einer Mehrfachauswahl im
  Dateibaum (⌘/Ctrl- bzw. ⇧-Klick, siehe Abschnitt 2) bietet das Kontextmenü
  **„N Dateien als PDF exportieren…“** an. Man wählt einen **Zielordner**,
  dann wird jede ausgewählte Notiz als **eigenes PDF** (Dateiname der Notiz
  mit `.pdf`) dorthin exportiert — ohne Nachfrage zu verlinkten Dokumenten,
  jede Datei für sich. Vorhandene gleichnamige PDFs werden nach Rückfrage
  überschrieben. Eine zugewiesene PDF-Vorlage gilt für alle Dateien.
- **Dokumente ausschließen:** Eine `pdf-exclude:`-Liste im Frontmatter der
  Index-Datei nimmt einzelne verlinkte Dokumente vom Export aus, z. B.:

  ```
  ---
  pdf-exclude:
    - intern
    - unterordner/entwurf.md
  ---
  ```

  Pfade wie in Links: relativ zur Index-Datei, mit führendem `/` relativ zum
  Vault; `.md` ist optional. Auch die Kurzform `pdf-exclude: [intern, entwurf]`
  ist möglich. Ausgeschlossene Dokumente zählen in der Nachfrage nicht mit.
- **Eigener Titel für den Gesamt-Export:** `pdf-linked-title:` im Frontmatter
  der Index-Datei setzt den Dokumenttitel für den Export **mit verlinkten
  Dokumenten** — nützlich, wenn die Index-Datei allein z. B. ein „Management
  Summary“ ist, das Gesamtdokument aber „Full Report“ heißen soll:

  ```
  ---
  title: Management Summary
  pdf-linked-title: Full Report
  ---
  ```

  Beim Export „Nur diese Datei“ gilt weiterhin `title:` (bzw. die erste
  Überschrift). Der Titel erscheint in den PDF-Metadaten, im
  `{{titel}}`-Platzhalter von Vorlagen und in Chromiums `<span class="title">`
  in Kopf-/Fußzeilen.
- **Inhaltsverzeichnis:** `pdf-toc: true` im Frontmatter der exportierten
  (Index-)Datei stellt dem PDF ein klickbares Inhaltsverzeichnis voran —
  Überschriften 1–3 aller enthaltenen Dokumente auf einer eigenen Seite nach
  dem Deckblatt (mit Deckblatt also ab Seite 2).
- **Dokumentsprache:** `language:` im Frontmatter der (Index-)Datei (z. B.
  `language: en`) bestimmt die Überschrift des Inhaltsverzeichnisses
  („Table of Contents“ statt „Inhaltsverzeichnis“; unterstützt: de, en, fr,
  es, it, pt, nl — andere Sprachen erhalten den englischen Titel) und die
  Silbentrennung im PDF. Ohne Angabe wird die Sprache der Oberfläche (Deutsch oder Englisch) verwendet.
- Das PDF wird immer hell gerendert (unabhängig vom System-Design) und enthält
  Tabellen, Bilder und Mermaid-Diagramme. Web-Links, Dateien außerhalb der
  Hierarchie und nicht verlinkte Dateien werden nicht angehängt.
- **Mermaid im PDF:** Diagramme werden nie über einen Seitenumbruch geteilt —
  passt ein Diagramm nicht mehr auf die aktuelle Seite, beginnt es auf der
  nächsten; ein Diagramm, das höher als eine Seite wäre, wird passend
  verkleinert.
- **Automatisches Querformat:** Enthält eines der exportierten Dokumente eine
  Tabelle, die nicht auf eine A4-Seite im Hochformat passt, wird das gesamte
  PDF im Querformat erzeugt.
- **Links im PDF:** Links zwischen den exportierten Dokumenten (z. B. vom
  Inhaltsverzeichnis) springen im PDF direkt zur jeweiligen Seite; Web-Links
  bleiben klickbar. Vault-Links auf Dateien, die nicht im PDF enthalten sind,
  erscheinen als normaler Text.
- Während des Exports zeigt eine **Fortschrittsanzeige** unten im Fenster den
  Stand („Dokument 3 von 15 gerendert …“, danach „PDF wird erzeugt …“).
- Nach dem Export wird die erzeugte Datei im Finder/Explorer gezeigt.

### PDF-Vorlagen (Briefkopf, Kopf- und Fußzeile)

Mit Vorlagen bekommt das PDF ein Firmen-Layout: Logo und Kopfzeile auf jeder
Seite, Fußzeile mit Seitenzahlen sowie optional ein Deckblatt.

- Verwaltet werden Vorlagen unter **Merkzeug → Einstellungen…** (⌘, / Strg+,). Dort wird
  der **Vorlagen-Ordner** festgelegt; jede Vorlage ist ein Unterordner darin.
- **„Anlegen“** erzeugt eine neue Vorlage mit Beispieldateien und öffnet sie im
  Finder/Explorer. Eine Vorlage besteht aus (alle Dateien optional):
  - `kopfzeile.html` – Kopfzeile auf jeder Seite
  - `fusszeile.html` – Fußzeile auf jeder Seite
  - `deckblatt.html` – Deckblatt als erste Seite
  - `stil.css` – Zusatz-CSS für den Dokumentinhalt
  - `vorlage.json` – Seitenränder in Millimetern
- **Platzhalter:** `{{titel}}` (`title:` aus dem YAML-Frontmatter, sonst die
  erste Überschrift 1 der Notiz, sonst der Dateiname; beim Export mit
  verlinkten Dokumenten hat `pdf-linked-title:` Vorrang) und `{{datum}}`
  (Exportdatum);
  in Kopf-/Fußzeile zusätzlich `<span class="pageNumber"></span>` und
  `<span class="totalPages"></span>` für Seitenzahlen.
- **Logo:** Bilddatei (z. B. `logo.png`) mit in den Vorlagen-Ordner legen und
  relativ referenzieren (`<img src="logo.png" style="height: 8mm">`) – sie wird
  beim Export automatisch eingebettet. In Kopf- und Fußzeile ist nur
  Inline-CSS möglich. Details stehen in der `LIESMICH.md` jeder Vorlage.
- **Querformat erkennen:** Wird das PDF automatisch im Querformat erzeugt,
  trägt das Dokument die Klasse `pdf-landscape` am `<html>`-Element. `stil.css`
  kann darauf reagieren, z. B. ein hohes Deckblatt niedriger machen:
  `html.pdf-landscape .cover { height: 150mm; }`.
- **Zuweisung pro Vault:** In den Einstellungen wird dem aktuellen Vault eine
  Vorlage zugewiesen. Die Zuweisung liegt im Vault
  (`.merkzeug/settings.json`) und wandert per Git auf alle Geräte mit; der
  Export verwendet sie automatisch. Ohne Zuweisung wird wie bisher ohne
  Vorlage exportiert.
- **Sync zwischen Geräten:** Liegt der Vorlagen-Ordner in **iCloud Drive,
  Google Drive, OneDrive oder Dropbox**, synchronisiert der jeweilige
  Cloud-Client die Vorlagen automatisch auf alle Rechner.

## 10. Git-Integration

Die Desktop-Version verwendet eine separat installierte Git-Anwendung zur Versionsverwaltung. Auf macOS ist Git über Apples Command Line Tools oder eine separate Git-Installation verfügbar; das vollständige Xcode ist nicht erforderlich. Fehlt Git oder lässt es sich nicht starten, erscheint in der Seitenleiste **Git ist nicht verfügbar**. **Git einrichten** öffnet die Installationsanleitung; wähle nach der Installation oder Konfiguration **Erneut prüfen**. Automatische Git-Abfragen pausieren, solange Git nicht verfügbar ist. Merkzeug öffnet keinen Installationsdialog für Apples Entwicklerwerkzeuge. Notizen bearbeiten und PDFs exportieren funktioniert weiterhin ohne Git.

Ist der Vault ein **Git-Repository**, erscheint unten in der Sidebar eine Statuszeile:

- **Branch-Name**, Anzahl geänderter Dateien, **n↑** = lokale Commits, die noch
  nicht gepusht wurden, **n↓** = neue Commits auf dem Server, Häkchen = alles
  committet und gepusht.
- Der Status aktualisiert sich automatisch – auch wenn du außerhalb der App
  committest oder pullst.
- **Klick auf die Statuszeile** klappt die Details auf: Liste der geänderten
  Dateien, Eingabefeld für die Commit-Nachricht sowie die Buttons
  **Commit & Push**, **Push** und **Pull**.
- **Commit & Push** sichert zuerst alle offenen Notizen, dann `git add`, Commit und
  Push. Ohne konfigurierten Upstream wird dieser automatisch gesetzt; ohne
  Remote wird nur lokal committet (mit Hinweis).
- **Push** überträgt bereits committete, aber noch nicht gepushte Commits
  (**n↑** in der Statuszeile) zum Server – etwa um einen fehlgeschlagenen Push
  nachzuholen, wenn der Server zwischenzeitlich nicht erreichbar war.
- **Pull** holt Änderungen vom Server; Merge-Konflikte löst du außerhalb der App.
- Schlägt eine Git-Aktion fehl (z. B. weil der Server nicht erreichbar ist),
  zeigt die Statuszeile ein **⚠**-Zeichen. Die Fehlermeldung steht in den
  aufgeklappten Details; das Zeichen verschwindet, sobald eine Git-Aktion
  wieder gelingt.
- Die App nutzt die Git-Zugangsdaten deines Systems (SSH-Schlüssel oder Credential
  Helper). Wäre eine interaktive Anmeldung nötig, bricht der Vorgang mit einer
  Fehlermeldung ab statt zu warten.

## 11. Tastaturkürzel

| Funktion | Mac | Linux / Windows |
| --- | --- | --- |
| Neue Notiz | ⌘N | Strg+N |
| Neue Meeting-Notiz | ⌃⌘N | Strg+Alt+Shift+N |
| Neuer Ordner | ⇧⌘N | Strg+Shift+N |
| Neues Fenster | ⌥⌘N | Strg+Alt+N |
| Vault öffnen | ⌘O | Strg+O |
| Tab schließen / Fenster schließen | ⌘W / ⇧⌘W | Strg+W / Strg+Shift+W |
| Sichern / Alle sichern | ⌘S / ⌥⌘S | Strg+S / Strg+Alt+S |
| Drucken | ⌘P | Strg+P |
| Einstellungen (PDF-Vorlagen) | ⌘, | Strg+, |
| Fett / Kursiv / Durchgestrichen / Inline-Code | ⌘B / ⌘I / ⌥⌘X / ⌘E | Strg+B / Strg+I / Strg+Alt+X / Strg+E |
| Text / Überschrift 1–6 | ⌥⌘0 … ⌥⌘6 | Strg+Alt+0 … Strg+Alt+6 |
| Aufzählung / Nummerierte Liste | ⌥⌘8 / ⌥⌘7 | Strg+Alt+8 / Strg+Alt+7 |
| Zitat / Codeblock | ⇧⌘B / ⌥⌘C | Strg+Shift+B / Strg+Alt+C |
| Link einfügen | ⌘K | Strg+K |
| Tabelle einfügen | ⌥⌘T | Strg+Alt+T |
| Suchen / Suchen und Ersetzen | ⌘F / ⌥⌘F | Strg+F / Strg+Alt+F |
| Navigationsmodus ein/aus | ⌘R | Strg+R |
| Zurück / Vorwärts | ⌘[ / ⌘] | Strg+[ / Strg+] |
| Zweite Sektion ein-/ausblenden | ⌘\ | Strg+\ |
| Tab in andere Sektion verschieben | ⇧⌘\ | Strg+Shift+\ |
| Ressourcen ein-/ausblenden | ⇧⌘R | Strg+Shift+R |
| Diese Hilfe | ⌘? | F1 |

*(Windows/Linux: ⌘ = Strg, ⌥ = Alt, ⇧ = Umschalt)*

## Gemeinsamer Editor und Speicherkonflikte

Desktop, iOS und IntelliJ verwenden denselben Merkzeug-Editor. Frontmatter bleibt beim Bearbeiten erhalten und kann im Editor geöffnet werden. Scheitert das Speichern, bleibt die Änderung als ungespeichert markiert. Bei gleichzeitigen externen Änderungen kannst du die externe Fassung neu laden oder ausdrücklich deine eigene Version behalten.

## Ordnerzugriff der Mac-App-Store-Version

Die Mac-App-Store-Version merkt sich die Zugriffsberechtigung beim Auswählen eines Vaults oder PDF-Vorlagenordners. Wenn macOS den Zugriff entzieht oder der Ordner verschoben wird, wähle ihn erneut aus.


## Support und Rückmeldungen

Wähle **Hilfe → Support kontaktieren…**, um das Supportformular mit Merkzeug, Sprache, Variante und App-Version zu öffnen. Die App-Informationen kannst du vor dem Senden abwählen. Notizinhalte und Dateipfade werden nicht automatisch angehängt.

[Merkzeug App Support kontaktieren](https://support.apps.creative-it.com/?app=merkzeug&lang=de). Nenne App-Version, Betriebssystem und Schritte zum Nachstellen des Problems. Verwende fiktive Beispiele und sende keine vertraulichen Notizen.

## PDF-Startvorlage

Merkzeug enthält die fertige PDF-Vorlage **Merkzeug**: ein Deckblatt in warmem Papierweiß, Serifenschrift für Überschriften, blaue Akzente, Kopfzeilen und nummerierte Fußzeilen. Wähle sie unter **Einstellungen → Vorlage für diesen Vault** aus. Bestehende Vaults behalten ihre Auswahl, auch **Keine Vorlage**. **Erstellen** legt eine bearbeitbare Kopie unter einem neuen Namen an; **Bearbeiten** öffnet ihren Ordner. App-Updates überschreiben deine Anpassungen nicht. Auch in einem neu gewählten Vorlagenordner wird die Standardvorlage bereitgestellt, sofern er beschreibbar ist.

Entferne `deckblatt.html` oder benenne die Datei um, wenn du kein Deckblatt möchtest. Passe `stil.css` für Dokumentstile sowie `kopfzeile.html` / `fusszeile.html` für Inline-Stile der Kopf- und Fußzeilen an. Die Seitenränder stehen in `vorlage.json`. Die deutschen Dateinamen und Platzhalter `{{titel}}` / `{{datum}}` gehören zum gemeinsamen Dateiformat. Lege Logos im Vorlagenordner ab und verwende relative Bildpfade. Die Vorlage funktioniert auch in IntelliJ: **PDF-Vorlage…** öffnet zunächst den mitgelieferten Vorlagenordner, wenn keine andere Vorlage ausgewählt ist. iOS verwendet Vorlagen für Editor-Styles, PDF-Export und AirPrint.

### Vorlage mit einem Agenten anpassen

Erstelle zuerst eine Kopie und übergib dem Agenten diesen Ordner mit folgendem Prompt:

> Lies README.md und alle fünf Vorlagendateien in diesem Ordner. Passe diese Kopie an meinen Stil an: [FARBEN], [SCHRIFTEN] und [LOKALER LOGO-PFAD]. Behalte Dateinamen, Titel-/Datumsplatzhalter und Chromium-Seitennummern bei. Verwende Inline-CSS für Kopf-/Fußzeilen und begrenze Dokumentstile auf PDF-Selektoren. Nutze lokale Dateien, keine Skripte oder Netzwerkabhängigkeiten. Unterstütze A4 im Hoch- und Querformat ohne abgeschnittene Inhalte. Dokumentiere Änderungen in README.md. Exportiere zur Prüfung Notizen mit langem Titel, Überschriften, Links, Code, einer Tabelle und einem Diagramm und kontrolliere jede PDF-Seite.

Die README der Vorlage enthält das Dateiformat und einen wiederverwendbaren Prompt. Prüfe das Ergebnis durch einen Export in Merkzeug: Eine Browser-Vorschau allein prüft keine Seitenumbrüche. **Vorlagen-Anleitung und Agenten-Prompt** in den Einstellungen öffnet diesen Abschnitt der Online-Hilfe; dieselbe Anleitung findest du auch in der Offline-Hilfe der App.

## Darstellung, Tour und Agentenhinweise

Wähle **System**, **Hell** oder **Dunkel** für die Darstellung. System folgt dem Betriebssystem (in IntelliJ der IDE); deine Auswahl wird gespeichert. Die **Geführte Tour** startet erst nach deiner Zustimmung zur Einladung beim ersten Start und lässt sich jederzeit wieder öffnen. Der Tour-Schritt **Lesen und navigieren** erklärt den Wechsel zwischen Lesen und Bearbeiten sowie die Link-Navigation. Öffne vor dem Tourstart eine Notiz, damit der Modus-Schalter hervorgehoben werden kann.

Beim Öffnen eines Vaults kann Merkzeug Hinweise in den Stammdateien `AGENTS.md` / `CLAUDE.md` für `Notiz.md` und `Notiz.assets/` vorschlagen. Prüfe den einmal angezeigten Ergänzungstext und die vollständigen Inhalte beider Hinweisdateien. Wähle vor **Hinzufügen** ausdrücklich die Zieldateien aus; keine ist vorausgewählt. Verweist `CLAUDE.md` nur auf `AGENTS.md`, kannst du sie unverändert lassen. Fehlende Dateien werden nur bei Auswahl angelegt. **Später** verschiebt den Hinweis für diese Sitzung; **Für diesen Vault nicht mehr vorschlagen** unterdrückt weitere Hinweise für diesen Vault. Widersprüchliche oder unklare Bilderordner-Regeln müssen manuell geprüft werden. Gleichzeitige externe Änderungen bleiben erhalten und erfordern eine neue Vorschau. Bestehende gemeinsame `assets/`-Verweise bleiben lesbar.

## Kalenderquellen

**Neue Meeting-Notiz** öffnet die Terminauswahl. Unter **Kalenderquellen** kannst du eine `.ics`-Datei importieren oder ein benanntes privates HTTPS/Webcal-Abonnement hinzufügen. Abonnements werden auf diesem Gerät gespeichert, niemals im Vault. **Kalender aktualisieren** lädt Änderungen; bei Fehlern bleibt der vorherige Stand mit Zeitangabe verfügbar. Der erneute Import einer gleichnamigen ICS-Datei aktualisiert die Quelle, ohne Notizen zu duplizieren. Ein Termin erstellt oder öffnet seine Meeting-Notiz; bestehender Notiztext wird nicht ersetzt. CalDAV und das Zurückschreiben in Kalender werden nicht unterstützt.

Wähle unter **Einstellungen** die PDF-Vorlage für diesen Vault. Aktiviere unten **PDF-Vorlage beim Bearbeiten verwenden**, um Textformatierung und Farben anzuzeigen. Deaktiviere die Option für das normale Editor-Design. Es werden nur `.pdf-content`-Inhaltsregeln übernommen; Deckblatt, Kopf-/Fußzeilen, Drucklayout und globale App-Regeln sind ausgenommen. Die Vorschau zeigt Formatierung, keinen seitengetreuen PDF-Proof. Der PDF-Export behält die vollständige Originalvorlage und Druckfarben. Linux benötigt für private Abonnements einen System-Schlüsselbund; ICS-Dateien lassen sich ohne ihn importieren.

Mermaid-Diagramme verwenden den Dokumenthintergrund statt einer dunklen Codeblock-Fläche und wechseln bei aktiver PDF-Vorlagenvorschau zum hellen PDF-Theme. Nach dem Ausschalten folgen sie wieder der Darstellung der Anwendung.

### Vorlagen-Styling-Prompt

In den Desktop-Einstellungen gibt es bei jeder Vorlage **Vorlagen-Styling-Prompt** zum Aufklappen, Prüfen und Kopieren, einschließlich des Vorlagenpfads. IntelliJ bietet dieselbe Aktion unter **Einstellungen → Tools → Merkzeug** mit dem aktuell im Einstellungsfeld angezeigten Ordner. Auf iOS findest du sie unter **Hilfe → Vorlagen-Styling-Prompt**; ergänze dort den Ordnerpfad auf dem Computer des Agenten. iOS unterstützt PDF-Vorlagen-Styles beim Bearbeiten, PDF-Export und Drucken über AirPrint.

Ersetze den neuen Vorlagennamen sowie Farben, Schriften, Logo und Gestaltungswünsche vor der Übergabe. Der Prompt ist auf Englisch und enthält die vollständige technische Anleitung offline, auch für ältere Vorlagen ohne Hinweisdateien. Beim Kopieren werden keine Notizinhalte gelesen oder bestehende Vorlagen verändert. Falls die Webansicht keinen Zugriff auf die Zwischenablage hat, markiere und kopiere den angezeigten Text manuell.

Neue Startvorlagen enthalten `AGENTS.md` mit Dateiformat, CSS-Beispielen, Platzhaltern, Vorschau-Grenzen und Prüfhinweisen sowie `STYLING-PROMPT.md` als wiederverwendbaren Arbeitsauftrag. Gestaltungsentscheidungen für die jeweilige Vorlage gehören in `README.md`. Der Auftrag verlangt eine separate Kopie und den Erhalt vorhandener Anweisungen. Bestehende Desktop-Vorlagen werden nicht aktualisiert oder überschrieben. Für die manuelle Nutzung STYLING-PROMPT.md und AGENTS.md zusammenfügen und den Platzhalter für den Vorlagenpfad ersetzen.


### Lizenz

Merkzeug steht unter der MIT-Lizenz. Der vollständige Lizenztext steht am Ende der In-App-Hilfe sowie auf der [Website](https://merkzeug.creative-it.com/license-de.html). Drittanbieter-Komponenten behalten ihre eigenen Lizenzen.


## Drucken

Wähle **Ablage → Drucken…** (⌘P unter macOS, Ctrl+P unter Windows/Linux). Merkzeug speichert ausstehende Änderungen, bereitet dieselbe PDF-Datei wie beim Export auf und öffnet den System-Druckdialog. Die PDF-Vorschau bleibt nach Drucken oder Abbrechen verfügbar. Sie enthält die gewählte Vorlage, Deckblatt, Kopf-/Fußzeilen, Diagramme und Bilder. Verlinkte Dokumente können optional aufgenommen werden. Ein Speicherziel ist nicht nötig; die temporäre PDF-Datei wird beim Schließen der Vorschau entfernt. PDF-Export bleibt eine eigene Menüaktion.

## Gemeinsame iCloud-Vorlagen

Unter macOS verwendet Merkzeug **iCloud Drive → Merkzeug → Templates**, sobald iCloud Drive verfügbar ist. Beim ersten Zugriff werden die Vorlagen des bisherigen Standardordners kopiert und geprüft, bevor die Einstellung umgestellt wird. Die Originale bleiben als Sicherung im alten Ordner. Ein ausdrücklich gewählter eigener Ordner bleibt eingestellt.

In den Einstellungen kopiert **Merkzeug-iCloud-Vorlagen verwenden** die aktuellen Vorlagen in die gemeinsame Ablage und wechselt nach erfolgreicher Prüfung den Ordner. Unterschiedliche Dateien mit gleichem Namen stoppen die Übernahme, ohne eine Version zu überschreiben. Prüfe diese Dateien vor einem erneuten Versuch.

Unter Windows mit iCloud Drive wird die Aktion verfügbar, sobald der öffentliche Ordner **Merkzeug** synchronisiert wurde. Öffne Merkzeug dafür zuerst auf einem Apple-Gerät. Berücksichtigt werden in Windows registrierte abweichende iCloud-Speicherorte sowie die üblichen Ordner im Benutzerprofil. Über **Ändern…** kannst du einen synchronisierten Vorlagenordner auch direkt wählen. Linux kann über **Ändern…** jeden eingebundenen synchronisierten Ordner verwenden.

Verwende auf allen Geräten denselben iCloud-Account und warte vor dem Bearbeiten auf einem anderen Gerät auf die Synchronisierung. iOS nutzt denselben Ordner und dieselbe Vault-Zuordnung.

### Dateinamen von Meeting-Notizen

Eine Meeting-Notiz verwendet ihre erste Überschrift als Dateinamen. Großschreibung, Leerzeichen und Umlaute bleiben erhalten; unzulässige Dateinamen-Zeichen werden ersetzt. Bei Namenskollisionen kommt ein Zusatz hinzu, ohne eine andere Notiz oder deren Bildordner zu überschreiben. Nach dem Speichern einer geänderten Überschrift benennt Merkzeug die Notiz und ihren `.assets/`-Ordner um. Die Kalenderzuordnung bleibt im Frontmatter: Derselbe Termin öffnet im gewählten Ordner seine vorhandene Notiz, auch bei älteren `meeting-…`-Namen. Diese Namen werden beim Bearbeiten und Speichern der Überschrift aktualisiert. Behalte die Kalender-Identitätsfelder für diese Zuordnung bei.

## Links beim Umbenennen und Verschieben

Beim Umbenennen einer Notiz oder eines Ordners durch Merkzeug werden lokale Markdown-Verweise darauf in anderen Markdown-Dateien desselben Vaults aktualisiert. Das gilt auch, wenn eine gespeicherte Überschrift automatisch den Dateinamen ändert. Der zugehörige `.assets/`-Ordner und Bildverweise folgen der Notiz. Beim Verschieben werden zusätzlich ihre ausgehenden relativen Links angepasst; gemeinsame Bilderordner bleiben an ihrem Ort.

Unterstützt werden direkte Links, Bilder und Referenz-Linkdefinitionen, auch mit URL-kodierten Namen und `#abschnitt`-Anhängen. Linktexte und Linktitel bleiben erhalten. Abschnittsanhänge werden beibehalten, bei Änderungen einer Überschrift aber nicht neu berechnet. Codebeispiele, Frontmatter, externe URLs und gewöhnlicher Text werden nicht verändert. HTML-Links und Wiki-Link-Syntax sind nicht enthalten.

Berücksichtigt werden reguläre Markdown-Dateien im Vault; versteckte/ignorierte Ordner und symbolische Links werden nicht verfolgt. Umbenennungen außerhalb von Merkzeug werden nicht als Refactoring erkannt. Namenskollisionen oder zwischenzeitlich geänderte Inhalte stoppen den Vorgang. Offene Dokumente ohne eigene Änderungen werden neu geladen; ungespeicherte konkurrierende Änderungen bleiben zur Prüfung erhalten.

Beim Beenden merkt sich Merkzeug alle offenen Vault-Fenster und stellt sie beim nächsten Start mit Größe, Position sowie Vollbild- bzw. maximiertem Zustand wieder her. Zuvor einzeln geschlossene Fenster bleiben geschlossen. Nicht mehr vorhandene Vault-Ordner werden übersprungen; Fenster von getrennten Bildschirmen werden auf einen verfügbaren Bildschirm verschoben.


## Vorlagen im Repository teilen

Eine Vorlage ist ein gewöhnlicher Ordner mit `vorlage.json`, `stil.css`, HTML-Fragmenten und zugehörigen Dateien. Du kannst ihn in einem Git-Repository ablegen, damit dein Team Änderungen prüfen und dasselbe Layout verwenden kann. Committe den vollständigen Ordner, einschließlich Logos und Schriften, die du teilen darfst.

Wähle bei den PDF-Funktionen **Vorlage in diesem Vault** und gib den relativen Vorlagenordner an. Die Zuordnung in `.merkzeug/settings.json` funktioniert am Desktop, auf iPhone/iPad und in IntelliJ. Versioniere diese Einstellungen gemeinsam mit dem Vorlagenordner.

Alternativ können zentrale Vorlagen über **iCloud Drive → Merkzeug → Templates** geteilt werden. Die Synchronisation zwischen eigenen Apple-Geräten setzt dasselbe Konto und abgeschlossene Übertragung voraus.

PDF-Dateiexport und das Zusammenfassen direkt verlinkter Dokumente gibt es am Desktop, auf iPhone/iPad und in IntelliJ. Die ausgewählte Vorlage wird auch beim Drucken verwendet.

## Vorlagen-Ort wählen

In den PDF-Bedienelementen über einer geöffneten Notiz (IntelliJ: **…**) findest du **PDF-Vorlage für diesen Vault**. Wähle **Zentrale Vorlage**, einen Namen und **Übernehmen**, oder **Vorlage in diesem Vault**, den relativen Ordner (zum Beispiel `.merkzeug/templates/Firma`) und **Übernehmen**. Die Auswahl gilt für alle Notizen dieses Vaults, einschließlich Bearbeitungsansicht, PDF-Export und Drucken. Vorlagendateien werden dabei nicht verschoben oder kopiert. **Keine Vorlage** und **Übernehmen** entfernt die Zuordnung.

Die portable Zuordnung liegt in `.merkzeug/settings.json`. Zentrale Vorlagen werden über ihren Namen referenziert, Vault-Vorlagen mit `{"pdfTemplate":{"source":"vault","path":".merkzeug/templates/Firma"}}`. Einstellungen und Vorlagenordner können gemeinsam im Repository versioniert werden. Bestehende zentrale Zuordnungen bleiben kompatibel. Auf Apple-Geräten liegt die zentrale Sammlung bei verfügbarem iCloud im Merkzeug-Container; ein lokal ausgewählter Vorlagenordner bleibt eine Geräteeinstellung. IntelliJ erkennt auch installierte Desktop-Vorlagen. Fehlende Vorlagenordner werden gemeldet, statt still eine andere Vorlage zu verwenden.

## Release Notes

Über **Release Notes** in der Hilfe (IntelliJ: **…**) ist die vollständige Versionsgeschichte auf Deutsch und Englisch auch offline lesbar. Beim ersten Start einer neuen Marketing-Version erscheinen deren Release Notes automatisch. **Fertig** merkt diese Version auf der aktuellen Installation als gelesen; die komplette Historie bleibt erreichbar. Website und Apps verwenden dieselbe Quelle für Release Notes.


## Linux-Installation und Plattformunterschiede

Wähle ein separates Paket für deine Linux-Architektur: **x86_64 (x64)** für Intel-/AMD-PCs oder **ARM64 (aarch64)** für ARM-Rechner, einschließlich Linux auf Apple Silicon in Parallels. `uname -m` zeigt deine Architektur. Jedes Paket enthält nur die gewählte Architektur. Ersetze in den folgenden Befehlen `x64` durch `arm64`, wenn du ARM64 nutzt.

- **DEB:** auf Ubuntu-/Debian-kompatiblen Systemen mit `sudo apt install ./Merkzeug-1.2.1-linux-x64.deb` installieren.
- **RPM:** auf Fedora-kompatiblen Systemen mit `sudo dnf install ./Merkzeug-1.2.1-linux-x64.rpm` installieren.
- **AppImage:** in den Dateieigenschaften ausführbar machen oder `chmod +x Merkzeug-1.2.1-linux-x64.AppImage` ausführen und die Datei öffnen. FUSE 2 ist erforderlich (`libfuse2t64` unter Ubuntu 24.04). Nutze das DEB-Paket, wenn AppImage für dein System ungeeignet ist. Deaktiviere die Anwendungssandbox nicht, um Installationsprobleme zu umgehen.

Updates werden manuell von der Merkzeug-Website geladen. Prüfe Downloads anhand der veröffentlichten SHA-256-Prüfsummen. Sie erkennen veränderte Dateien, ersetzen aber kein Herausgeber-Zertifikat. Notizen und Einstellungen liegen außerhalb des Anwendungspakets.

Der gemeinsame Desktop-Editor bietet visuelles Bearbeiten, Mermaid, Lese-/Navigationsmodus, Frontmatter, Dateinamen aus Überschriften, Begleitordner für Bilder und Link-Anpassungen beim Verschieben/Umbenennen, PDF-Vorlagen, zusammengefassten PDF-Export, Drucken und Agent-Prompts. Für die integrierten Git-Aktionen muss Git separat installiert sein; richte die Authentifizierung über deine üblichen Git-Werkzeuge ein.

Meeting-Notizen unter Linux nutzen ICS-Dateien oder HTTPS/Webcal-Kalenderabos. Eine direkte GNOME-/KDE-Systemkalender-Anbindung gibt es nicht. Zum Speichern privater Abo-URLs ist ein System-Schlüsselbund erforderlich; lokale ICS-Importe funktionieren auch ohne diesen. Standardmäßig verwendet Linux einen lokalen zentralen Vorlagenordner oder einen von dir gewählten Ordner. Vault-Vorlagen in `.merkzeug/` reisen mit dem Repository; eingebundene Sync-Ordner funktionieren ebenfalls. Eine automatische Apple-iCloud-Erkennung gibt es nicht. Drucken setzt eingerichtete Systemdrucker und Treiber voraus.

## Meeting-Notizen und Kalender

**Meeting-Notizen aus dem Kalender:** **⌃⌘N / Strg+Alt+Shift+N** (Menü „Ablage → Neue
  Meeting-Notiz…“ oder der Kalender-Button in der Fußleiste) zeigt laufende
  und kommende Termine der nächsten 14 Tage aus den lokal eingebundenen
  Kalendern — unter macOS alle Konten der Kalender-App (iCloud,
  Exchange/Microsoft 365, Google, …), unter Windows alle Kalender des
  **klassischen Outlook** (über dessen Objektmodell; das „neue Outlook“
  bietet keines), ganz ohne Cloud-API. Ganztägige
  Termine (Urlaube, Geburtstage, …) sind standardmäßig ausgeblendet und
  lassen sich über die Checkbox über der Liste einblenden. **„Frühere
  anzeigen“** blendet vergangene Termine ein, **„Suchen“** durchsucht Titel,
  Personen und Orte im Zeitraum ±90 Tage. Ein Klick auf einen Termin erzeugt
  eine fertig benannte Notiz: Die Termin-Daten (Datum, Uhrzeit, Ort,
  Organisator, Teilnehmer, erkannter Teams/Zoom/Meet/Webex-Link) landen im
  Frontmatter; im Text stehen Datum/Uhrzeit unter der Überschrift, eine
  **abhakbare Teilnehmerliste** (wer war wirklich dabei?) sowie die
  Abschnitte Agenda, Notizen und Aufgaben. Beim
  ersten Mal fragt macOS nach der Erlaubnis für den Kalender-Zugriff. Unter
  Windows startet Outlook bei Bedarf im Hintergrund; zeigt Outlook eine
  Sicherheitsabfrage („Ein Programm versucht, auf … zuzugreifen“), erlaube
  den Zugriff für ein paar Minuten. Unter Linux und mit neuem Outlook importierst du unter **Kalenderquellen** ICS-Dateien oder abonnierst HTTPS/Webcal-Feeds.

Öffne **Ablage → Neue Meeting-Notiz…** oder nutze den Kalender-Button unter dem Dateibaum. Erlaube am Mac den Kalenderzugriff; die eingerichteten Konten der Apple-Kalender-App liefern die Termine. Unter Linux öffnest du **Kalenderquellen**, importierst eine `.ics`-Datei oder fügst eine HTTPS/Webcal-Abo-URL hinzu. Lade die Termine neu: importierte Dateien sind Momentaufnahmen, Abos lassen sich aktualisieren. Private Abo-URLs werden im System-Schlüsselbund gespeichert und gehören nicht ins Git-Repository.

Wähle einen Termin, um im gewählten Ordner eine Markdown-Meeting-Notiz anzulegen. Bearbeite die Agenda, protokolliere Ergebnisse und hake Teilnehmer und Aufgaben ab. Bei automatischer Benennung folgt der Dateiname der ersten Überschrift; manuell vergebene Namen bleiben erhalten. Der Kalendertermin wird nicht verändert.

Wenn die Liste leer bleibt, prüfe Datum, Ganztagsfilter, Kalenderberechtigung am Mac und die Kalenderquellen unter Linux. Linux hat keine direkte GNOME-/KDE-Kalenderanbindung. Die beschriebene Windows-/Outlook-Anbindung gehört zur kommenden Windows-Version.

## Über Merkzeug

Merkzeug ist Open Source unter der MIT-Lizenz. Über Merkzeug zeigt Version, Herausgeber und Produktwebsite. Am Desktop im Merkzeug-Menü, auf iPhone/iPad in der Hilfe und in IntelliJ im **…**-Menü des Editors erreichbar.
