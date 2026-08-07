# Merkzeug für iOS & iPadOS

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
  Unterordner `assets/` neben der Notiz abgelegt.
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
