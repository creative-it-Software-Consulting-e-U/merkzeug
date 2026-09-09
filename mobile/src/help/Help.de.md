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

## Gemeinsamer Editor und Speicherkonflikte

Desktop, iOS und IntelliJ verwenden denselben Merkzeug-Editor. Frontmatter bleibt beim Bearbeiten erhalten und kann im Editor geöffnet werden. Scheitert das Speichern, bleibt die Änderung als ungespeichert markiert. Bei gleichzeitigen externen Änderungen kannst du die externe Fassung neu laden oder ausdrücklich deine eigene Version behalten.


## Support und Rückmeldungen

Öffne **Hilfe** und wähle **Support kontaktieren…**, um das Supportformular mit Merkzeug, Sprache, Variante und App-Version zu öffnen. Die App-Informationen kannst du vor dem Senden abwählen. Notizinhalte und Dateipfade werden nicht automatisch angehängt.

[Merkzeug App Support kontaktieren](https://support.apps.creative-it.com/?app=merkzeug&lang=de). Nenne App-Version, Betriebssystem und Schritte zum Nachstellen des Problems. Verwende fiktive Beispiele und sende keine vertraulichen Notizen.
