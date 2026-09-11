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
  öffnet den Eintrag.
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

Desktop-App und IntelliJ enthalten die PDF-Startvorlage Merkzeug mit Deckblatt, gestalteten Überschriften und Seitennummern. Eine Kopie lässt sich mit einem Agenten anpassen. Siehe die [Vorlagen-Anleitung](https://merkzeug.creative-it.com/help-de.html#pdf-startvorlage). Auf iOS ist PDF-Export noch nicht verfügbar.

## Darstellung, Tour und Agentenhinweise

Wähle **System**, **Hell** oder **Dunkel** für die Darstellung. System folgt dem Betriebssystem (in IntelliJ der IDE); deine Auswahl wird gespeichert. Die **Geführte Tour** startet erst nach deiner Zustimmung zur Einladung beim ersten Start und lässt sich jederzeit wieder öffnen.

Beim Öffnen eines Vaults kann Merkzeug Hinweise in den Stammdateien `AGENTS.md` / `CLAUDE.md` für `Notiz.md` und `Notiz.assets/` vorschlagen. Prüfe jede Ergänzung vor **Hinzufügen**. **Später** verschiebt den Hinweis für diese Sitzung; **Für diesen Vault nicht mehr vorschlagen** unterdrückt weitere Hinweise für diesen Vault. Widersprüchliche oder unklare Bilderordner-Regeln müssen manuell geprüft werden. Gleichzeitige externe Änderungen bleiben erhalten und erfordern eine neue Vorschau. Bestehende gemeinsame `assets/`-Verweise bleiben lesbar.

## Kalenderquellen

**Neue Meeting-Notiz** öffnet die Terminauswahl. Unter **Kalenderquellen** kannst du eine `.ics`-Datei importieren oder ein benanntes privates HTTPS/Webcal-Abonnement hinzufügen. Abonnements werden auf diesem Gerät gespeichert, niemals im Vault. **Kalender aktualisieren** lädt Änderungen; bei Fehlern bleibt der vorherige Stand mit Zeitangabe verfügbar. Der erneute Import einer gleichnamigen ICS-Datei aktualisiert die Quelle, ohne Notizen zu duplizieren. Ein Termin erstellt oder öffnet seine Meeting-Notiz; bestehender Notiztext wird nicht ersetzt. CalDAV und das Zurückschreiben in Kalender werden nicht unterstützt.

Auf iPhone und iPad stehen auch die nativen iOS-Kalender zur Verfügung. Zugriff wird erst beim Öffnen der Meeting-Notizen angefragt. Falls du ihn abgelehnt hast, aktiviere den Kalenderzugriff für Merkzeug in den iOS-Einstellungen. Die App liest Termine, ohne den Kalender zu ändern. Neue Bilder verwenden `Notiz.assets/`; beim Verschieben/Umbenennen durch Merkzeug wird der Begleitordner mitgenommen und die Verweise werden angepasst. Bestehende gemeinsame `assets/`-Ordner bleiben erhalten.

Öffne **Working Copy** und gib den genauen Repository-Namen bzw. die Remote-URL und den Callback-Schlüssel ein. Der Schlüssel bleibt im Schlüsselbund dieses Geräts. Vor **Pull**, **Commit** oder **Push** werden ausstehende Änderungen gespeichert. Commit öffnet die Änderungsprüfung und Nachrichteneingabe von Working Copy für das Repository. Push benötigt dessen freigeschaltete Push-Funktion. Konflikte und Zugangsdaten werden in Working Copy geklärt. Das Öffnen der App ist noch kein Erfolg: Warte auf ihren Rückruf. Bei Unterbrechungen oder fehlendem Rückruf prüfe dort das Ergebnis, bevor du es bestätigst und einen weiteren Vorgang startest.
