# Merkzeug – Hilfe

Auf einem deutschen System erscheinen Oberfläche und Hilfe auf Deutsch, andernfalls auf Englisch. Die Sprache dieser Hilfe lässt sich unabhängig umschalten.

Merkzeug ist ein Editor für Markdown-Notizen im Stil von Notion – diese Version
läuft auf **macOS und Windows**. Du bearbeitest deine Notizen **WYSIWYG**
(formatiert, ohne sichtbare Markdown-Syntax), gespeichert wird aber immer
sauberes, portables Markdown. Alle Notizen liegen als `.md`-Dateien in einem
gewöhnlichen Ordner – dem **Vault**.

Alle Kürzel gelten mit **⌘** auf dem Mac; unter Windows entspricht ⌘ der
**Strg**-Taste und ⌥ der **Alt**-Taste.

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
[11. Tastaturkürzel](#11.-tastaturkürzel)

---

## 1. Erste Schritte

- Beim ersten Start wählst du einen **Vault-Ordner** (einen beliebigen Ordner mit
  Markdown-Dateien). Die Auswahl wird gemerkt.
- Über **Ablage → Vault öffnen…** (⌘O) wechselst du den Vault des aktuellen Fensters.
- **Ablage → Zuletzt geöffnete Vaults** listet die letzten zehn Vaults zum schnellen
  Wechsel.
- **Autosave:** Änderungen werden eine Sekunde nach der letzten Eingabe automatisch
  gespeichert, außerdem beim Schließen von Tabs und beim Beenden der App.
  Manuell: **⌘S** (aktive Notiz) bzw. **⌥⌘S** (alle offenen Notizen).
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
  blendet die **Ressourcen-Ordner** ein/aus (⇧⌘R).
- **Meeting-Notizen aus dem Kalender:** **⌃⌘N** (Menü „Ablage → Neue
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

- Jede Notiz öffnet in einem eigenen **Tab**; **⌘W** schließt den aktiven Tab,
  **⇧⌘W** das Fenster.
- **Zwei Sektionen** nebeneinander: **⌘\** teilt den Editor-Bereich. Tabs lassen sich
  per Drag & Drop auf die andere Tab-Leiste ziehen oder mit **⇧⌘\** verschieben.
- **Mehrere Fenster:** **⌥⌘N** öffnet ein neues Fenster (übernimmt zunächst den Vault
  des aktuellen Fensters; per ⌘O kann jedes Fenster einen anderen Vault anzeigen).

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
- **Zeichenformate:** fett (⌘B), kursiv (⌘I), Inline-Code (⌘E),
  durchgestrichen (⌥⌘X).
- **Absatzformate:** normaler Text (⌥⌘0), Überschriften 1–6 (⌥⌘1–⌥⌘6),
  Zitat (⇧⌘B), Codeblock (⌥⌘C).
- **Listen:** Aufzählung (⌥⌘8), nummerierte Liste (⌥⌘7) und Aufgabenlisten;
  verschachteln mit Tab/⇧Tab, automatische Fortführung beim Enter und
  automatische Neunummerierung.
- **Auto-Formatierung beim Tippen:** `# `, `## `, `- `, `1. `, `> ` am Zeilenanfang
  sowie ` ``` ` erzeugen das jeweilige Format sofort; `->` wird zu einem
  Pfeil „→“.
- **Tabellen:** Einfügen über ⌥⌘T, das Slash-Menü oder Menü „Bearbeiten“. Mit Tab
  von Zelle zu Zelle springen; Zeilen/Spalten über die Tabellen-Steuerung direkt
  an der Tabelle oder das Menü **Tabelle** einfügen und löschen.
- **Bilder:** per Einfügen aus der Zwischenablage, Drag & Drop, Slash-Menü oder
  Menü „Bearbeiten → Bild einfügen…“.
- **Undo/Redo** wie gewohnt (⌘Z / ⇧⌘Z).
- **Suchen & Ersetzen:** **⌘F** öffnet die Suchleiste rechts oben im Editor,
  **⌥⌘F** zusätzlich die Ersetzen-Zeile (auch über **Bearbeiten → Suchen…**).
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

## 5. Links

- **⌘K** öffnet den Link-Dialog zum Einfügen eines formatierten Links; bestehende
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
umschaltbar mit **⌘R**, über **Ansicht → Navigationsmodus** oder das Buch-Symbol
in der Toolbar.

- Im Navigationsmodus ist die Notiz **schreibgeschützt**; Klicks auf Vault-Links
  laden das Ziel **im selben Tab** (statt einen neuen Tab zu öffnen).
- Auch **Ordner-Links** bleiben im selben Tab: Der Tab zeigt die Ordnerübersicht,
  und Klicks auf deren Einträge navigieren im selben Tab weiter.
- **Zurück/Vorwärts:** Pfeil-Buttons in der Toolbar, **⌘[** / **⌘]**, die
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
- Ressourcen-Ordner sind im Dateibaum standardmäßig ausgeblendet (⇧⌘R zeigt sie).

## 9. PDF-Export

- **Ablage → Als PDF exportieren…** (⌘P) exportiert die aktive Notiz als PDF;
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

- Verwaltet werden Vorlagen unter **Merkzeug → Einstellungen…** (⌘,). Dort wird
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

| Kürzel | Funktion |
| --- | --- |
| ⌘N | Neue Notiz |
| ⌃⌘N | Neue Meeting-Notiz |
| ⇧⌘N | Neuer Ordner |
| ⌥⌘N | Neues Fenster |
| ⌘O | Vault öffnen |
| ⌘W / ⇧⌘W | Tab schließen / Fenster schließen |
| ⌘S / ⌥⌘S | Sichern / Alle sichern |
| ⌘P | Als PDF exportieren |
| ⌘, | Einstellungen (PDF-Vorlagen) |
| ⌘B / ⌘I / ⌥⌘X / ⌘E | Fett / Kursiv / Durchgestrichen / Inline-Code |
| ⌥⌘0 … ⌥⌘6 | Text / Überschrift 1–6 |
| ⌥⌘8 / ⌥⌘7 | Aufzählung / Nummerierte Liste |
| ⇧⌘B / ⌥⌘C | Zitat / Codeblock |
| ⌘K | Link einfügen |
| ⌥⌘T | Tabelle einfügen |
| ⌘F / ⌥⌘F | Suchen / Suchen und Ersetzen |
| ⌘R | Navigationsmodus ein/aus |
| ⌘[ / ⌘] | Zurück / Vorwärts |
| ⌘\ | Zweite Sektion ein-/ausblenden |
| ⇧⌘\ | Tab in andere Sektion verschieben |
| ⇧⌘R | Ressourcen ein-/ausblenden |
| ⌘? | Diese Hilfe |

*(Windows: ⌘ = Strg, ⌥ = Alt, ⇧ = Umschalt)*

## Gemeinsamer Editor und Speicherkonflikte

Desktop, iOS und IntelliJ verwenden denselben Merkzeug-Editor. Frontmatter bleibt beim Bearbeiten erhalten und kann im Editor geöffnet werden. Scheitert das Speichern, bleibt die Änderung als ungespeichert markiert. Bei gleichzeitigen externen Änderungen kannst du die externe Fassung neu laden oder ausdrücklich deine eigene Version behalten.

## Mac-App-Store-Testversionen

Experimentelle Mac-App-Store-Versionen merken sich die Zugriffsberechtigung beim Auswählen eines Vaults oder PDF-Vorlagenordners. Wenn macOS den Zugriff entzieht oder der Ordner verschoben wird, wähle ihn erneut aus. Die Sandbox-Prüfung dieser Versionen ist noch nicht abgeschlossen.


## Support und Rückmeldungen

Wähle **Hilfe → Support kontaktieren…**, um das Supportformular mit Merkzeug, Sprache, Variante und App-Version zu öffnen. Die App-Informationen kannst du vor dem Senden abwählen. Notizinhalte und Dateipfade werden nicht automatisch angehängt.

[Merkzeug App Support kontaktieren](https://support.apps.creative-it.com/?app=merkzeug&lang=de). Nenne App-Version, Betriebssystem und Schritte zum Nachstellen des Problems. Verwende fiktive Beispiele und sende keine vertraulichen Notizen.

## PDF-Startvorlage

Merkzeug enthält die fertige PDF-Vorlage **Merkzeug**: ein Deckblatt in warmem Papierweiß, Serifenschrift für Überschriften, blaue Akzente, Kopfzeilen und nummerierte Fußzeilen. Wähle sie unter **Einstellungen → Vorlage für diesen Vault** aus. Bestehende Vaults behalten ihre Auswahl, auch **Keine Vorlage**. **Erstellen** legt eine bearbeitbare Kopie unter einem neuen Namen an; **Bearbeiten** öffnet ihren Ordner. App-Updates überschreiben deine Anpassungen nicht. Auch in einem neu gewählten Vorlagenordner wird die Standardvorlage bereitgestellt, sofern er beschreibbar ist.

Entferne `deckblatt.html` oder benenne die Datei um, wenn du kein Deckblatt möchtest. Passe `stil.css` für Dokumentstile sowie `kopfzeile.html` / `fusszeile.html` für Inline-Stile der Kopf- und Fußzeilen an. Die Seitenränder stehen in `vorlage.json`. Die deutschen Dateinamen und Platzhalter `{{titel}}` / `{{datum}}` gehören zum gemeinsamen Dateiformat. Lege Logos im Vorlagenordner ab und verwende relative Bildpfade. Die Vorlage funktioniert auch in IntelliJ: **PDF-Vorlage…** öffnet zunächst den mitgelieferten Vorlagenordner, wenn keine andere Vorlage ausgewählt ist. Auf iOS ist PDF-Export noch nicht verfügbar.

### Vorlage mit einem Agenten anpassen

Erstelle zuerst eine Kopie und übergib dem Agenten diesen Ordner mit folgendem Prompt:

> Lies README.md und alle fünf Vorlagendateien in diesem Ordner. Passe diese Kopie an meinen Stil an: [FARBEN], [SCHRIFTEN] und [LOKALER LOGO-PFAD]. Behalte Dateinamen, Titel-/Datumsplatzhalter und Chromium-Seitennummern bei. Verwende Inline-CSS für Kopf-/Fußzeilen und begrenze Dokumentstile auf PDF-Selektoren. Nutze lokale Dateien, keine Skripte oder Netzwerkabhängigkeiten. Unterstütze A4 im Hoch- und Querformat ohne abgeschnittene Inhalte. Dokumentiere Änderungen in README.md. Exportiere zur Prüfung Notizen mit langem Titel, Überschriften, Links, Code, einer Tabelle und einem Diagramm und kontrolliere jede PDF-Seite.

Die README der Vorlage enthält das Dateiformat und einen wiederverwendbaren Prompt. Prüfe das Ergebnis durch einen Export in Merkzeug: Eine Browser-Vorschau allein prüft keine Seitenumbrüche. **Vorlagen-Anleitung und Agenten-Prompt** in den Einstellungen öffnet diesen Abschnitt der Online-Hilfe; dieselbe Anleitung findest du auch in der Offline-Hilfe der App.

## Darstellung, Tour und Agentenhinweise

Wähle **System**, **Hell** oder **Dunkel** für die Darstellung. System folgt dem Betriebssystem (in IntelliJ der IDE); deine Auswahl wird gespeichert. Die **Geführte Tour** startet erst nach deiner Zustimmung zur Einladung beim ersten Start und lässt sich jederzeit wieder öffnen.

Beim Öffnen eines Vaults kann Merkzeug Hinweise in den Stammdateien `AGENTS.md` / `CLAUDE.md` für `Notiz.md` und `Notiz.assets/` vorschlagen. Prüfe den einmal angezeigten Ergänzungstext und die vollständigen Inhalte beider Hinweisdateien. Wähle vor **Hinzufügen** ausdrücklich die Zieldateien aus; keine ist vorausgewählt. Verweist `CLAUDE.md` nur auf `AGENTS.md`, kannst du sie unverändert lassen. Fehlende Dateien werden nur bei Auswahl angelegt. **Später** verschiebt den Hinweis für diese Sitzung; **Für diesen Vault nicht mehr vorschlagen** unterdrückt weitere Hinweise für diesen Vault. Widersprüchliche oder unklare Bilderordner-Regeln müssen manuell geprüft werden. Gleichzeitige externe Änderungen bleiben erhalten und erfordern eine neue Vorschau. Bestehende gemeinsame `assets/`-Verweise bleiben lesbar.

## Kalenderquellen

**Neue Meeting-Notiz** öffnet die Terminauswahl. Unter **Kalenderquellen** kannst du eine `.ics`-Datei importieren oder ein benanntes privates HTTPS/Webcal-Abonnement hinzufügen. Abonnements werden auf diesem Gerät gespeichert, niemals im Vault. **Kalender aktualisieren** lädt Änderungen; bei Fehlern bleibt der vorherige Stand mit Zeitangabe verfügbar. Der erneute Import einer gleichnamigen ICS-Datei aktualisiert die Quelle, ohne Notizen zu duplizieren. Ein Termin erstellt oder öffnet seine Meeting-Notiz; bestehender Notiztext wird nicht ersetzt. CalDAV und das Zurückschreiben in Kalender werden nicht unterstützt.

Wähle unter **Einstellungen** die PDF-Vorlage für diesen Vault. Aktiviere unten **PDF-Vorlage beim Bearbeiten verwenden**, um Textformatierung und Farben anzuzeigen. Deaktiviere die Option für das normale Editor-Design. Es werden nur `.pdf-content`-Inhaltsregeln übernommen; Deckblatt, Kopf-/Fußzeilen, Drucklayout und globale App-Regeln sind ausgenommen. Die Vorschau zeigt Formatierung, keinen seitengetreuen PDF-Proof. Der PDF-Export behält die vollständige Originalvorlage und Druckfarben. Linux benötigt für private Abonnements einen System-Schlüsselbund; ICS-Dateien lassen sich ohne ihn importieren.

Mermaid-Diagramme wechseln bei aktiver PDF-Vorlagenvorschau zum hellen PDF-Theme. Nach dem Ausschalten folgen sie wieder der Darstellung der Anwendung.
