# Merkzeug für iOS & iPadOS

Auf einem deutschen System erscheinen Oberfläche und Hilfe auf Deutsch, andernfalls auf Englisch. Die Sprache dieser Hilfe lässt sich unabhängig umschalten.

Merkzeug zeigt und bearbeitet einen **Vault** – einen Ordner voller
Markdown-Notizen. Auf dem iPhone und iPad übernimmt die App bewusst kein
Git: Das Klonen, Committen, Pushen und Pullen erledigt die App
**Working Copy**, Merkzeug arbeitet direkt auf deren Ordner.

## Vault öffnen

1. In **Working Copy** das gewünschte Repository klonen.
2. In Merkzeug auf **„Vault-Ordner öffnen"** tippen.
3. Im Datei-Picker *Durchsuchen → Working Copy → \<Repository\>* wählen.

Merkzeug merkt sich die Freigabe dauerhaft – auch nach einem Neustart der
App ist der Vault sofort wieder da. Über die Schaltfläche **⌂** kannst du
jederzeit einen anderen Ordner wählen. Statt eines Working-Copy-Repos
funktioniert auch jeder andere Ordner aus der Dateien-App.

## Navigieren

- Die Ordneransicht zeigt Unterordner und Notizen als Liste; Antippen
  öffnet den Eintrag. Langes Drücken öffnet **Umbenennen** und **Löschen**. Dateinamen und Menübeschriftungen sind nicht als Text auswählbar; Notiztext bleibt auswählbar.
- Links in Notizen führen direkt zur verlinkten Notiz oder zum Ordner.
- **Zurück und vorwärts**: mit den Pfeiltasten ‹ › oben links – oder per
  Wischgeste von der linken bzw. rechten Bildschirmkante.
- **Suche 🔍**: durchsucht Dateinamen und Inhalte aller Notizen; ein
  Tippen auf einen Treffer öffnet die Notiz.

Schließe die Suche mit **Fertig** über den Ergebnissen oder **Fertig** auf der Tastatur, auch bei leerem Suchfeld. Mit einer externen Tastatur funktioniert außerdem Escape.

## Lesen und Bearbeiten

Notizen öffnen sich **schreibgeschützt** – ideal zum Nachschlagen ohne
versehentliche Änderungen. Das Stift-Symbol **✎** schaltet in den
Bearbeitungsmodus:

- Gespeichert wird automatisch (kurz nach der letzten Eingabe sowie beim
  Verlassen der Notiz und beim Wechsel in eine andere App). Ein Punkt •
  neben dem Titel zeigt ungespeicherte Änderungen.
- „/" am Zeilenanfang öffnet das Einfüge-Menü (Überschriften, Listen,
  Tabellen, Bilder, Codeblöcke …).
- Bilder aus der Foto-Mediathek werden beim Einfügen automatisch im
  Ordner `Notizname.assets/` neben `Notizname.md` abgelegt.
- Mermaid-Codeblöcke zeigen eine Diagramm-Vorschau.

## Anlegen, Umbenennen, Löschen

- **＋** in der Ordneransicht legt eine neue Notiz oder einen neuen
  Ordner an. Neue Notizen öffnen sich direkt im Bearbeitungsmodus.
- **Eintrag gedrückt halten** öffnet das Menü mit *Umbenennen* und
  *Löschen*. Beim Löschen eines Ordners verschwindet sein gesamter
  Inhalt – in Working Copy lässt sich das bis zum nächsten Commit
  rückgängig machen.

## Synchronisieren mit Working Copy

- Nach einem **Pull** in Working Copy reicht der Wechsel zurück zu
  Merkzeug – die Ordnerliste und geöffnete (unveränderte) Notizen laden
  den neuen Stand automatisch. **↻** liest den Vault jederzeit manuell
  neu ein.
- **Commit und Push** passieren in Working Copy; Merkzeug zeigt dort
  geänderte Dateien nicht selbst an.
- Wurde eine Notiz gleichzeitig in Merkzeug bearbeitet **und** extern
  geändert, fragt Merkzeug beim Speichern nach, ob deine Version den
  externen Stand überschreiben soll oder verworfen wird – es geht also
  nichts stillschweigend verloren.

## Grenzen gegenüber der Desktop-App

- Keine Tabs und keine geteilten Ansichten – eine Notiz zur Zeit.
- Kein Git in der App (siehe oben – das ist Absicht).
- Sehr große Bilder können die Anzeige verlangsamen.

## Gemeinsamer Editor und Speicherkonflikte

Desktop, iOS und IntelliJ verwenden denselben Merkzeug-Editor. Frontmatter bleibt beim Bearbeiten erhalten und kann im Editor geöffnet werden. Scheitert das Speichern, bleibt die Änderung als ungespeichert markiert. Bei gleichzeitigen externen Änderungen kannst du die externe Fassung neu laden oder ausdrücklich deine eigene Version behalten.


## Support und Rückmeldungen

Öffne **Hilfe** und wähle **Support kontaktieren…**, um das Supportformular mit Merkzeug, Sprache, Variante und App-Version zu öffnen. Die App-Informationen kannst du vor dem Senden abwählen. Notizinhalte und Dateipfade werden nicht automatisch angehängt.

[Merkzeug App Support kontaktieren](https://support.apps.creative-it.com/?app=merkzeug&lang=de). Nenne App-Version, Betriebssystem und Schritte zum Nachstellen des Problems. Verwende fiktive Beispiele und sende keine vertraulichen Notizen.

## PDF-Vorlagen am Desktop

Desktop-App und IntelliJ enthalten die PDF-Startvorlage Merkzeug mit Deckblatt, gestalteten Überschriften und Seitennummern. Eine Kopie lässt sich mit einem Agenten anpassen. Siehe die [Vorlagen-Anleitung](https://merkzeug.creative-it.com/help-de.html#pdf-startvorlage). iOS verwendet Vorlagen für Editor-Styles und AirPrint; PDF-Dateiexport ist eine Desktop- und IntelliJ-Funktion.

## Darstellung, Tour und Agentenhinweise

Wähle **System**, **Hell** oder **Dunkel** für die Darstellung. System folgt dem Betriebssystem (in IntelliJ der IDE); deine Auswahl wird gespeichert. Die **Geführte Tour** startet erst nach deiner Zustimmung zur Einladung beim ersten Start und lässt sich jederzeit wieder öffnen.

Beim Öffnen eines Vaults kann Merkzeug Hinweise in den Stammdateien `AGENTS.md` / `CLAUDE.md` für `Notiz.md` und `Notiz.assets/` vorschlagen. Prüfe den einmal angezeigten Ergänzungstext und die vollständigen Inhalte beider Hinweisdateien. Wähle vor **Hinzufügen** ausdrücklich die Zieldateien aus; keine ist vorausgewählt. Verweist `CLAUDE.md` nur auf `AGENTS.md`, kannst du sie unverändert lassen. Fehlende Dateien werden nur bei Auswahl angelegt. **Später** verschiebt den Hinweis für diese Sitzung; **Für diesen Vault nicht mehr vorschlagen** unterdrückt weitere Hinweise für diesen Vault. Widersprüchliche oder unklare Bilderordner-Regeln müssen manuell geprüft werden. Gleichzeitige externe Änderungen bleiben erhalten und erfordern eine neue Vorschau. Bestehende gemeinsame `assets/`-Verweise bleiben lesbar.

## Kalenderquellen

Meeting-Notizen werden im aktuellen Vault-Ordner angelegt, bei einer geöffneten Notiz im selben Ordner wie diese. Das gilt auch für den Stammordner eines über Dateien gewählten Vaults.

**Neue Meeting-Notiz** öffnet die Terminauswahl. Unter **Kalenderquellen** kannst du eine `.ics`-Datei importieren oder ein benanntes privates HTTPS/Webcal-Abonnement hinzufügen. Abonnements werden auf diesem Gerät gespeichert, niemals im Vault. **Kalender aktualisieren** lädt Änderungen; bei Fehlern bleibt der vorherige Stand mit Zeitangabe verfügbar. Der erneute Import einer gleichnamigen ICS-Datei aktualisiert die Quelle, ohne Notizen zu duplizieren. Ein Termin erstellt oder öffnet seine Meeting-Notiz; bestehender Notiztext wird nicht ersetzt. CalDAV und das Zurückschreiben in Kalender werden nicht unterstützt.

Auf iPhone und iPad stehen auch die nativen iOS-Kalender zur Verfügung. Zugriff wird erst beim Öffnen der Meeting-Notizen angefragt. Falls du ihn abgelehnt hast, aktiviere den Kalenderzugriff für Merkzeug in den iOS-Einstellungen. Die App liest Termine, ohne den Kalender zu ändern. Neue Bilder verwenden `Notiz.assets/`; beim Verschieben/Umbenennen durch Merkzeug wird der Begleitordner mitgenommen und die Verweise werden angepasst. Bestehende gemeinsame `assets/`-Ordner bleiben erhalten.

Öffne **Working Copy** und gib den genauen Repository-Namen bzw. die Remote-URL und den Callback-Schlüssel ein. Der Schlüssel bleibt im Schlüsselbund dieses Geräts. Vor **Pull**, **Commit** oder **Push** werden ausstehende Änderungen gespeichert. Commit öffnet die Änderungsprüfung und Nachrichteneingabe von Working Copy für das Repository. Push benötigt dessen freigeschaltete Push-Funktion. Konflikte und Zugangsdaten werden in Working Copy geklärt. Das Öffnen der App ist noch kein Erfolg: Warte auf ihren Rückruf. Bei Unterbrechungen oder fehlendem Rückruf prüfe dort das Ergebnis, bevor du es bestätigst und einen weiteren Vorgang startest.

### Vorlagen-Styling-Prompt

In den Desktop-Einstellungen gibt es bei jeder Vorlage **Vorlagen-Styling-Prompt** zum Aufklappen, Prüfen und Kopieren, einschließlich des Vorlagenpfads. IntelliJ bietet dieselbe Aktion unter **Einstellungen → Tools → Merkzeug** mit dem aktuell im Einstellungsfeld angezeigten Ordner. Auf iOS findest du sie unter **Hilfe → Vorlagen-Styling-Prompt**; ergänze dort den Ordnerpfad auf dem Computer des Agenten. Derselbe Prompt ist auch unter **PDF-Vorlagen** verfügbar. iOS kann die Inhalts-Styles einer Vorlage beim Bearbeiten anzeigen; einen separaten PDF-Dateiexport gibt es nicht.

Ersetze den neuen Vorlagennamen sowie Farben, Schriften, Logo und Gestaltungswünsche vor der Übergabe. Der Prompt ist auf Englisch und enthält die vollständige technische Anleitung offline, auch für ältere Vorlagen ohne Hinweisdateien. Beim Kopieren werden keine Notizinhalte gelesen oder bestehende Vorlagen verändert. Falls die Webansicht keinen Zugriff auf die Zwischenablage hat, markiere und kopiere den angezeigten Text manuell.

Neue Startvorlagen enthalten `AGENTS.md` mit Dateiformat, CSS-Beispielen, Platzhaltern, Vorschau-Grenzen und Prüfhinweisen sowie `STYLING-PROMPT.md` als wiederverwendbaren Arbeitsauftrag. Gestaltungsentscheidungen für die jeweilige Vorlage gehören in `README.md`. Der Auftrag verlangt eine separate Kopie und den Erhalt vorhandener Anweisungen. Bestehende Desktop-Vorlagen werden nicht aktualisiert oder überschrieben. Für die manuelle Nutzung STYLING-PROMPT.md und AGENTS.md zusammenfügen und den Platzhalter für den Vorlagenpfad ersetzen.


### Lizenz

Merkzeug ist proprietäre Software für private und interne geschäftliche Nutzung. Die vollständige Endnutzerlizenz steht am Ende der In-App-Hilfe sowie auf der [Website](https://merkzeug.creative-it.com/license-de.html). Drittanbieter-Komponenten behalten ihre eigenen Lizenzen.


## Drucken

Öffne eine Notiz und tippe auf **Drucken…**. Sobald die Vorschau fertig ist, öffnet **Drucken…** den AirPrint-Dialog mit Drucker, Seitenbereich und Kopien. Ausstehende Änderungen werden zuvor gespeichert. Gedruckt wird die aktuelle Notiz samt Mermaid-Diagrammen und Bildern. Eine ausgewählte Vorlage liefert Inhalts-Styles und Deckblatt. AirPrint berücksichtigt auch Seitenkopf, Seitenfuß, Seitennummern und eigene Seitenränder. Diese erscheinen in der nativen AirPrint-Vorschau; die vorherige Inhaltsvorschau ist nicht in Seiten aufgeteilt. Das Drucken verlinkter Dokumente wird auf iOS nicht unterstützt. Mit Abbrechen gelangst du zur Vorschau zurück; **Schließen** öffnet wieder deine Notiz.

## PDF-Vorlagen auf iOS

Öffne **PDF-Vorlagen → Ändern…** und wähle in Dateien den Ordner mit den Vorlagen-Unterordnern, etwa einen vorhandenen Ordner in iCloud Drive. Wähle **Vorlage für diesen Vault**. Die Auswahl wird in `.merkzeug/settings.json` gespeichert und reist mit dem Vault; den Vorlagenordner merkt sich dieses Gerät separat. **Keine Vorlage** verwendet das Standardlayout.

**PDF-Vorlage beim Bearbeiten verwenden** übernimmt die Inhalts-Styles einschließlich heller Mermaid-Diagramme. Die Einstellung wird pro Vault auf diesem Gerät gespeichert. **Neu einlesen** lädt Änderungen; auch bei der Rückkehr zur App werden Vorlagen aktualisiert. Cloud-Dateien müssen über ihren Anbieter verfügbar sein. Bei nicht verfügbaren Vorlagen erscheint ein Fehler; beim Drucken wird keine andere Vorlage stillschweigend eingesetzt.

Standardmäßig verwendet Merkzeug **iCloud Drive → Merkzeug → Templates** und installiert dort die Startvorlage, falls sie fehlt. Melde dich bei iCloud an und aktiviere iCloud Drive. Verwende auf deinen Geräten denselben Apple-Account. **Merkzeug-iCloud-Vorlagen verwenden** wechselt von einem selbst gewählten Ordner zurück zur gemeinsamen Ablage. Ohne iCloud kannst du weiterhin über Dateien einen vorhandenen Ordner wählen; nicht verfügbare Vorlagen werden gemeldet und nicht stillschweigend ersetzt.

### Dateinamen von Meeting-Notizen

Eine Meeting-Notiz verwendet ihre erste Überschrift als Dateinamen. Großschreibung, Leerzeichen und Umlaute bleiben erhalten; unzulässige Dateinamen-Zeichen werden ersetzt. Bei Namenskollisionen kommt ein Zusatz hinzu, ohne eine andere Notiz oder deren Bildordner zu überschreiben. Nach dem Speichern einer geänderten Überschrift benennt Merkzeug die Notiz und ihren `.assets/`-Ordner um. Die Kalenderzuordnung bleibt im Frontmatter: Derselbe Termin öffnet im gewählten Ordner seine vorhandene Notiz, auch bei älteren `meeting-…`-Namen. Diese Namen werden beim Bearbeiten und Speichern der Überschrift aktualisiert. Behalte die Kalender-Identitätsfelder für diese Zuordnung bei.

## Links beim Umbenennen und Verschieben

Beim Umbenennen einer Notiz oder eines Ordners durch Merkzeug werden lokale Markdown-Verweise darauf in anderen Markdown-Dateien desselben Vaults aktualisiert. Das gilt auch, wenn eine gespeicherte Überschrift automatisch den Dateinamen ändert. Der zugehörige `.assets/`-Ordner und Bildverweise folgen der Notiz. Beim Verschieben werden zusätzlich ihre ausgehenden relativen Links angepasst; gemeinsame Bilderordner bleiben an ihrem Ort.

Unterstützt werden direkte Links, Bilder und Referenz-Linkdefinitionen, auch mit URL-kodierten Namen und `#abschnitt`-Anhängen. Linktexte und Linktitel bleiben erhalten. Abschnittsanhänge werden beibehalten, bei Änderungen einer Überschrift aber nicht neu berechnet. Codebeispiele, Frontmatter, externe URLs und gewöhnlicher Text werden nicht verändert. HTML-Links und Wiki-Link-Syntax sind nicht enthalten.

Berücksichtigt werden reguläre Markdown-Dateien im Vault; versteckte/ignorierte Ordner und symbolische Links werden nicht verfolgt. Umbenennungen außerhalb von Merkzeug werden nicht als Refactoring erkannt. Namenskollisionen oder zwischenzeitlich geänderte Inhalte stoppen den Vorgang. Offene Dokumente ohne eigene Änderungen werden neu geladen; ungespeicherte konkurrierende Änderungen bleiben zur Prüfung erhalten.
