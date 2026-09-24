# Merkzeug für IntelliJ IDEA

## Voraussetzungen und Installation

Version 1.2 unterstützt IntelliJ IDEA **ab 2026.2.2 innerhalb der 2026.2-Reihe, Builds 262.10315.125–262.***, mit aktiviertem JCEF-Plugin. Die Kompatibilität wurde mit 2026.2.2 und 2026.2.3 geprüft; 2026.3 EAP ist nicht eingeschlossen. Andere IDE-Produkte und Build-Reihen wurden nicht geprüft.

Version **1.2.0** wurde am 24. September 2026 im Standardkanal **Stable** eingereicht und wartet auf die JetBrains-Freigabe. Nach der Freigabe kannst du unter **Settings → Plugins → Marketplace** nach **Merkzeug** suchen und es ohne zusätzliches Repository installieren. Der [Marketplace-Eintrag (ID 34221)](https://plugins.jetbrains.com/plugin/34221-merkzeug) behält auch den Beta-Kanal; dort bleibt während der Prüfung die freigegebene Version 1.0.1 verfügbar.

So installierst du die Beta und erhältst Updates:

1. Öffne **Settings → Plugins → Zahnrad → Manage Plugin Repositories…**.
2. Ergänze `https://plugins.jetbrains.com/plugins/beta/34221`.
3. Suche im Marketplace-Tab nach **Merkzeug**, installiere die kompatible Version und starte IntelliJ bei Bedarf neu.
4. Öffne eine lokale `.md`-Datei und wähle den Editor-Tab **Merkzeug**.

Beta-Kanäle sind eigene Repositories; die Suche im Standard-Marketplace allein zeigt ihre Versionen möglicherweise nicht. Siehe auch die [JetBrains-Dokumentation zu Kanälen](https://plugins.jetbrains.com/docs/marketplace/custom-release-channels.html).

Für eine vom Entwickler bereitgestellte Beta-ZIP:

1. Öffne **Settings → Plugins → Zahnrad → Install Plugin from Disk…**.
2. Wähle `merkzeug-VERSION.zip` und starte IntelliJ neu, falls verlangt.
3. Öffne eine lokale `.md`-Datei und wähle unten den Editor-Tab **Merkzeug**.

Marketplace-Updates erhältst du über die Plugin-Verwaltung; Beta-ZIPs installierst du erneut über denselben Dialog. Zum Entfernen deinstalliere Merkzeug unter **Settings → Plugins**. Die Notizen bleiben normale Markdown-Dateien.

## Gemeinsam mit anderen Markdown-Editoren

Merkzeug ergänzt einen eigenen Editor-Tab. Der mitgelieferte Markdown-Editor kann parallel installiert bleiben: Über die Tabs am unteren Rand wechselst du zwischen Quelltext-/Split-Ansicht und Merkzeug. Beide verwenden dasselbe IntelliJ-Dokument. Merkzeug ersetzt das Markdown-Plugin nicht und benötigt es auch nicht. Das Zusammenspiel mit weiteren Markdown-Plugins hängt von deren Editor-Registrierung ab und ist nicht pauschal zugesichert.

## Bearbeiten und Speichern

Die Werkzeugleiste bietet Absatzformate, Fett, Kursiv, Durchstreichen, Inline-Code, Listen, Zitate, Codeblöcke, Links, Bilder, Tabellen und Trennlinien. Außerdem stehen Slash-Menü, Frontmatter und Mermaid-Diagramme zur Verfügung. Mermaid-Code lässt sich direkt am Diagramm bearbeiten.

Suchen (**⌘F / Ctrl+F**), Rückgängig und Wiederherstellen bleiben über Tastenkürzel erreichbar. IntelliJ verwaltet Dokument, Speichern, Git und Rückgängig-Verlauf. **⌘S / Ctrl+S** speichert ausdrücklich. Neue Dateien erzeugst du über IntelliJs Projektwerkzeuge; Kalender und Meeting-Notizen gehören zu den eigenständigen Apps.

Ändert ein anderer Editor das Dokument, lädt Merkzeug es neu, sofern keine lokalen Änderungen vorliegen. Andernfalls kannst du im Konflikthinweis die andere Version laden oder bewusst deine eigenen Änderungen behalten.

## Lese- und Navigationsmodus (geplant)

Aktuell richtet sich der Modus nach den Schreibrechten der Datei; ein manueller Schalter Lesen/Bearbeiten ist noch nicht verfügbar. Das folgende Verhalten ist für diesen Schalter vorgesehen.

Jeder Merkzeug-Editor bleibt seiner IntelliJ-Datei zugeordnet. Ein interner Link wird die Zieldatei über IntelliJ in einem eigenen Editor-Tab öffnen oder ihren bereits offenen Tab aktivieren. Der Inhalt des ursprünglichen Editors wird dabei nicht durch eine andere Datei ersetzt.

- Der Schalter Lesen/Bearbeiten wird für den aktuellen Tab gelten. Schreibgeschützte Dateien bleiben schreibgeschützt.
- Im Lesemodus wird ein einfacher Klick einem Link folgen.
- Im Editiermodus wird der Linktext bearbeitbar sein; ⌘Klick unter macOS beziehungsweise Strg+Klick unter Windows/Linux wird den Link öffnen.
- Überschriftenlinks werden zur entsprechenden Überschrift im Zieldokument springen. Dokumentübergreifende Überschriftensprünge sind aktuell noch unvollständig.
- Navigationssprünge werden in IntelliJs Verlauf für **Navigate → Back/Forward** integriert, sodass du zur ursprünglichen Stelle zurückkehren kannst.


## Bilder und zugehörige Ordner

Bilder, die du in `Plan.md` einfügst oder hineinkopierst, werden in einem benachbarten Ordner `Plan.assets/` gespeichert. Markdown verweist relativ darauf, zum Beispiel `![Diagramm](Plan.assets/image-….png)`. Desktop- und iOS-Version verwenden dasselbe Muster. Nimm beim Committen oder Teilen sowohl die Notiz als auch ihren Bildordner mit.

Vorhandene Verweise auf gemeinsame `assets/`-Ordner bleiben gültig. Diese Ordner werden keiner einzelnen Notiz zugeordnet und nicht automatisch migriert.

### IntelliJ übernimmt die Refactoring-Regeln

Verwende **Refactor → Rename** oder **Refactor → Move** für die Markdown-Datei. Gibt es neben `Plan.md` den Ordner `Plan.assets/`, nimmt Merkzeug ihn in das Refactoring auf. Beim Umbenennen zu `Draft.md` wird daraus `Draft.assets/`; die Verweise in der Notiz werden angepasst. Beim Verschieben bleibt der Ordner neben der Notiz. Der Move-Dialog zeigt beide Einträge; eine eigene Auswahl beider Einträge führt nicht zur doppelten Ausführung. Rückgängig/Wiederherstellen gilt für das Paar.

Vorhandene Zieldateien oder Zielordner verhindern die Aktion; Ordner werden nicht zusammengeführt. Gemeinsame `assets/`-Ordner und Notizen ohne eigenen Bildordner behalten IntelliJs Standardverhalten. Symbolische Verknüpfungen erfordern manuelle Behandlung. Die Integration gilt für IntelliJ-Refactorings, nicht für externe Dateisystemoperationen, Kopieren oder Löschen.

## PDF-Vorlagen und Export

1. Öffne **Settings → Tools → Merkzeug** und wähle den PDF-Vorlagenordner für dieses Projekt. Ohne Auswahl wird ohne Vorlage exportiert.
2. Klicke **PDF exportieren**.
3. Bei verlinkten Dokumenten wähle **Nur dieses Dokument** oder **Verlinkte Dokumente einschließen**. Abbrechen beendet den Export.
4. Wähle Dateinamen und Speicherort.

Der Export verwendet den aktuellen IntelliJ-Dokumentinhalt. Die Auswahl der Vorlage gilt pro Projekt. **Use bundled PDF template** legt eine bearbeitbare Startvorlage unter `merkzeug/pdf-templates/Merkzeug` im IDE-Konfigurationsordner an; vorhandene Dateien werden nicht überschrieben.

Die Auswahl **Desktop templates** erkennt Standard-Vorlagenordner der Desktop-App auf macOS, Windows und Linux, einschließlich eines angepassten `templatesRoot` und einer geerbten Umgebungsvariable `MERKZEUG_TEMPLATES_ROOT`. Wähle eine Vorlage und übernimm die Einstellungen. **Refresh** sucht erneut. Dabei werden keine Dateien kopiert und die aktuelle Auswahl wird nicht automatisch geändert. Alternativ wähle den konkreten Unterordner mit `stil.css` und `vorlage.json` manuell. Beide Editionen können dieselben Dateien verwenden.

## PDF-Styles beim Bearbeiten

Aktiviere im **⋯**-Menü **PDF-Vorlage beim Bearbeiten verwenden**. Merkzeug merkt sich die Einstellung pro Projekt. Schrift und Inhaltsfarben stammen dann aus der Vorlage; Frontmatter und Mermaid-Diagramme passen sich an. Werkzeugleiste, Dialoge und IDE behalten das IntelliJ-Theme. Ohne diese Option folgt der Editor dem aktiven IDE-Theme einschließlich laufender Änderungen.

Die Vorschau zeigt Inhaltsformatierung, nicht Seitenumbrüche, Deckblatt oder Kopf-/Fußzeilen des PDFs. Sie aktualisiert sich nach geänderten PDF-Einstellungen und wenn das Editorfenster wieder den Fokus erhält.

## Drucken

Bei aktivem Merkzeug-Editor verwendet **File → Print** dessen PDF-Aufbereitung. Auch die Werkzeugleiste bietet **Drucken…**. In der PDF-Vorschau öffnet **Drucken…** den Druckdialog. Vorlagen, Kopf-/Fußzeilen, Bilder, Diagramme und optional verlinkte Dokumente werden wie beim PDF-Export aufbereitet. Ein Speicherort ist nicht erforderlich; beim Schließen wird das temporäre PDF entfernt. Ein anderer Markdown-Editor-Tab behält seinen eigenen Druckbefehl.

## Hinweise für Coding-Agenten

Im **⋯**-Menü kannst du Hinweise zur Paarung von `Note.md` und `Note.assets/` prüfen. Merkzeug zeigt den vorgeschlagenen Text einmal und den vollständigen Inhalt vorhandener `AGENTS.md` und `CLAUDE.md`. Wähle ausdrücklich, in welche Dateien er eingefügt werden soll; keine ist vorgewählt. Verweist `CLAUDE.md` nur auf `AGENTS.md`, kannst du sie unverändert lassen.

Fehlende Dateien werden nur bei Auswahl angelegt. **Später** verschiebt den Hinweis; **Für diesen Vault nicht mehr vorschlagen** unterdrückt ihn. Widersprüche und externe Änderungen erfordern erneute Prüfung. Bestehende Anweisungen werden nicht stillschweigend ersetzt.

### Vorlagen mit einem Agenten gestalten

**Template styling prompt** unter **Settings → Tools → Merkzeug** liefert einen kopierbaren englischen Auftrag mit Vorlagenpfad und technischer Offline-Referenz. Ergänze Namen, Farben, Schriften, Logo und Gestaltungswünsche. Der Auftrag sieht eine separate Kopie vor, damit die bestehende Vorlage erhalten bleibt. Notizinhalte werden dabei nicht gelesen; das Kopieren ändert keine Dateien. Neue Startvorlagen enthalten zusätzlich `AGENTS.md` und `STYLING-PROMPT.md`.

## Grenzen, Lizenz und Support

Dateien und Bilder außerhalb des aktuellen Projektstamms sind nicht zugänglich. Links öffnen andere Dateien; die Navigation zu Überschriften in anderen Dokumenten ist noch unvollständig. Beim PDF-Export wird der Editor vorübergehend verlassen und anschließend neu geladen. Desktop-Vault-Einstellungen, native Kalender und Massenexport gehören nicht zum Plugin. Die Marketplace-Ausgabe enthält die noch unveröffentlichte Tour und das Video nicht.

Merkzeug ist proprietäre Software für private und interne geschäftliche Nutzung gemäß der [Endbenutzer-Lizenzvereinbarung](../../resources/legal/EULA.de.md). Lizenz und Hinweise zu Drittanbietern liegen auch dem Plugin bei.

Über **Help → Merkzeug: Contact Support…** öffnest du das Supportformular mit App, Sprache, Plattform und Plugin-Version. Notizinhalte und Repository-Pfade werden nicht übertragen. Nach einem Plugin-Update ist gegebenenfalls ein IntelliJ-Neustart notwendig.

## Links zwischen Markdown-Dateien

**Refactor → Rename/Move** aktualisiert auch eingehende Markdown-Links im Projekt, einschließlich Notizen ohne `.assets/`-Ordner. Beim Verschieben werden ausgehende relative Links und Verweise auf Begleitbilder angepasst. Das Markdown-Editor-Plugin ist dafür optional: Merkzeug erkennt Markdown-Linkziele selbst und integriert die Änderungen in das native Refactoring, einschließlich offener ungespeicherter Dokumente und Rückgängig/Wiederherstellen.

Unterstützt werden direkte Links, Bilder und Referenz-Linkdefinitionen. URL-Kodierung, Linktexte, Linktitel und `#abschnitt`-Anhänge bleiben erhalten; das Umbenennen von Überschriftenankern ist ein eigener Vorgang. Codebeispiele, Frontmatter, externe URLs und gewöhnlicher Text bleiben unverändert. HTML- und Wiki-Links sind nicht enthalten. Der Suchbereich umfasst Projektinhalte, keine ausgeschlossenen Ordner, symbolischen Links oder externen Dateien. Sprachspezifische Ordner-/Package-Refactorings bleiben beim jeweiligen Sprach-Plugin. Allgemeine Datei-Refactorings von Ordnern aktualisieren ebenfalls Markdown-Pfade. Änderungen außerhalb von IntelliJ lösen diesen Vorgang nicht aus.


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
