# Merkzeug für Visual Studio Code

Die VS-Code-Erweiterung bietet dieselben Funktionen wie das [IntelliJ-Plugin](intellij.de.md). Sie nutzt die VS-Code-eigenen Mechanismen für Einstellungen, Befehle, Speichern, Rückgängig-Verlauf und Datei-Refactoring.

## Voraussetzungen und Installation

Die Erweiterung benötigt Visual Studio Code 1.100 oder neuer und arbeitet mit lokalen Ordnern, auch in VS-Code-Remote-Arbeitsbereichen, in denen die Erweiterung auf dem entfernten Rechner läuft. Virtuelle Arbeitsbereiche (etwa reine Browser-Repositories) werden nicht unterstützt. Version 1.3 wurde mit VS Code 1.139 unter macOS geprüft.

PDF-Export und Drucken verwenden einen installierten Chromium-basierten Browser: Google Chrome, Microsoft Edge, Chromium oder Brave. Merkzeug findet Standardinstallationen automatisch; andernfalls gib unter **Merkzeug › Pdf: Browser Path** den Pfad an.

So installierst du eine vom Entwickler bereitgestellte VSIX-Datei:

1. Besorge `merkzeug-VERSION.vsix`.
2. Öffne die Ansicht **Erweiterungen**, wähle **… → Aus VSIX installieren…** und wähle die Datei.
3. Öffne eine lokale `.md`-Datei und wähle in der Titelleiste des Editors **In Merkzeug öffnen**.

Die Erweiterung ist noch nicht im Visual Studio Marketplace veröffentlicht. Zum Entfernen deinstallierst du sie in der Ansicht **Erweiterungen**. Die Notizen bleiben gewöhnliche Markdown-Dateien.

## Notizen öffnen

Merkzeug ist ein zusätzlicher Editor für `.md`-Dateien; der Texteditor von VS Code bleibt Standard. So öffnest du eine Notiz in Merkzeug:

- **In Merkzeug öffnen** in der Titelleiste einer Markdown-Datei oder im Kontextmenü des Explorers,
- **Öffnen mit… → Merkzeug** oder
- über die Befehlspalette: **Merkzeug: In Merkzeug öffnen**.

**Markdown-Quelltext anzeigen** in der Titelleiste wechselt zurück zum Texteditor. Damit Markdown-Dateien immer in Merkzeug öffnen, wähle **Öffnen mit… → Standard-Editor für „*.md“ konfigurieren…**.

## Bearbeiten und Speichern

Du nutzt den gemeinsamen visuellen Editor mit Slash-Menü, Formatierungswerkzeugen, Frontmatter-Bereich und Mermaid-Diagrammen. Die kompakte Werkzeugleiste bietet Absatzformate, Fett, Kursiv, Durchgestrichen, Inline-Code, Listen, Zitate, Codeblöcke, Links, Bilder, Tabellen und Trennlinien. Suche (⌘F / Strg+F), Rückgängig und Wiederholen erreichst du über Tastenkürzel. Änderungen landen im VS-Code-Dokument; VS Code verwaltet Speichern, Änderungsanzeige, Git-Integration, Hot Exit und den Rückgängig-Verlauf. **⌘S / Strg+S** speichert. Dieselbe Notiz kann gleichzeitig in Merkzeug und im Texteditor nebeneinander geöffnet sein.

Wenn eine ganze Tabellenzelle markiert ist, wird sie hervorgehoben; klicke in den Text, um den Cursor zu setzen und zu bearbeiten.

Ändert ein anderer Editor das Dokument, lädt Merkzeug es neu, sofern keine lokalen Änderungen vorliegen. Andernfalls kannst du im Konflikt-Hinweis die andere Fassung laden oder bewusst deine eigene behalten.

Merkzeug beachtet die Schreibrechte der Datei. Links auf andere Markdown-Dateien öffnen diese in einem eigenen Merkzeug-Tab oder aktivieren einen bereits geöffneten Tab; Web-Links öffnen sich im Browser. Die Navigation zu Überschriften in anderen Dokumenten ist wie in IntelliJ noch unvollständig.

## Bilder und Begleitordner

Bilder, die du über die Bildauswahl einfügst oder in `Plan.md` einsetzt, werden als eigene Dateien im benachbarten Ordner `Plan.assets/` gespeichert. Markdown verweist relativ darauf, etwa `![Diagramm](Plan.assets/image-….png)`. Desktop-, iOS- und IntelliJ-Edition verwenden dieselbe Struktur. Committe oder teile Notiz und Begleitordner gemeinsam. Bestehende Verweise auf gemeinsame `assets/`-Ordner bleiben lesbar.

### Umbenennen und Verschieben

Benenne eine Markdown-Datei im Explorer um (F2), ziehe sie in einen anderen Ordner oder nutze eine andere VS-Code-Umbenennung. Hat `Plan.md` einen Begleitordner `Plan.assets/`, bezieht Merkzeug ihn in denselben Vorgang ein: Beim Umbenennen zu `Draft.md` wird der Ordner zu `Draft.assets/`, beim Verschieben wandert er mit. Lokale Markdown-Links in allen Notizen des Arbeitsbereichs werden angepasst, auch ausgehende relative Links einer verschobenen Notiz und Notizen ohne Begleitordner. Auch beim Umbenennen eines Ordners werden Markdown-Pfade aktualisiert. Ordnerverschiebung und Link-Anpassungen werden als Teil der VS-Code-Umbenennung angewendet; speichere danach Notizen, die VS Code als geändert anzeigt.

Existiert der Ziel-Begleitordner bereits, zeigt Merkzeug eine Warnung und lässt den Ordner an seinem Platz; Ordner werden nie zusammengeführt oder überschrieben. Begleitordner mit symbolischen Links musst du manuell behandeln. Dateien, die über `files.exclude` oder `search.exclude` ausgeschlossen sind, symbolische Links und `node_modules` werden nicht durchsucht. Änderungen außerhalb von VS Code (etwa im Finder oder auf der Kommandozeile) lösen die Integration nicht aus. Zum Abschalten deaktivierst du **Merkzeug › Refactoring: Companion Folders**. Aktivierst du zusätzlich `markdown.updateLinksOnFileMove.enabled` von VS Code, schlagen womöglich beide Erweiterungen Link-Anpassungen vor.

Unterstützt werden Inline-Links, Bilder und Referenzdefinitionen. URL-Kodierung, Titel und `#abschnitt`-Anhänge bleiben erhalten. Codebeispiele, Frontmatter, externe URLs, HTML-Links und Wiki-Links bleiben unverändert.

## Einstellungen

Die Einstellungen findest du unter **Einstellungen → Erweiterungen → Merkzeug**. Arbeitsbereichseinstellungen gelten für den aktuellen Arbeitsbereich, wie die Projekteinstellungen in IntelliJ.

| Einstellung | Zweck |
| --- | --- |
| `merkzeug.pdf.templateFolder` | PDF-Vorlagenordner, wenn keine Vault-Zuweisung existiert. Leer: Export ohne Vorlage. |
| `merkzeug.editor.pdfTemplatePreview` | Inhaltsstile der PDF-Vorlage beim Bearbeiten verwenden. |
| `merkzeug.pdf.browserPath` | Chromium-basierter Browser für den PDF-Export (Geräteeinstellung). |
| `merkzeug.refactoring.companionFolders` | Begleitordner beim Umbenennen/Verschieben mitnehmen und Links anpassen. |

Im eingeschränkten Modus wird ein Vorlagenordner aus den Arbeitsbereichseinstellungen ignoriert; nur deine Benutzereinstellung gilt.

## PDF-Export

1. Wähle optional mit **Merkzeug: PDF-Vorlageneinstellungen…** (auch im **⋯**-Menü des Editors als **PDF-Vorlage …**) eine Vorlage.
2. Klicke in der Werkzeugleiste auf **PDF exportieren** oder wähle **Merkzeug: PDF exportieren** im Titelmenü des Editors oder in der Befehlspalette.
3. Werden verlinkte Dokumente gefunden, listet ein Dialog sie auf. Wähle **Nur dieses Dokument** oder **Verlinkte Dokumente einschließen**. **Abbrechen** beendet den Export.
4. Wähle Dateiname und Ziel. Eine Benachrichtigung bietet an, das PDF zu öffnen oder im Dateimanager anzuzeigen.

Das PDF verwendet den aktuellen Inhalt des VS-Code-Dokuments einschließlich ungespeicherter Änderungen. Vorlagendateien, Frontmatter und Dokumentauswahl beschreibt die [PDF-Anleitung](pdf.md).

## Drucken

Klicke in der Werkzeugleiste auf **Drucken…** oder wähle **Merkzeug: Drucken…**. Merkzeug erzeugt das Dokument mit denselben Vorlagen, Kopf- und Fußzeilen, Diagrammen, Bildern und optional verlinkten Dokumenten und öffnet das PDF im PDF-Programm deines Systems; von dort druckst du. Das temporäre PDF wird nach einem Tag automatisch entfernt.

## PDF-Vorlagen

**Merkzeug: PDF-Vorlageneinstellungen…** bietet:

- **PDF-Vorlagenordner auswählen…**: Wähle den eigentlichen Vorlagenordner (mit `stil.css`, `vorlage.json` usw.). Ein Desktop-Vorlagenordner kann direkt verwendet werden; es wird nichts kopiert.
- **Mitgelieferte PDF-Vorlage verwenden**: kopiert die Merkzeug-Startvorlage einmalig in den Erweiterungsspeicher von VS Code (`…/globalStorage/creative-it.merkzeug/pdf-templates/Merkzeug`) und wählt sie aus. Vorhandene Kopien werden nie überschrieben. Kopiere den Ordner, bevor du ihn mit einem Agenten anpasst.
- **Desktop-Vorlagen**: findet die Standardorte der Desktop-App unter macOS, Windows und Linux, einschließlich ihrer Einstellung `templatesRoot` und der Umgebungsvariable `MERKZEUG_TEMPLATES_ROOT`. Dabei werden keine Dateien kopiert.
- **Vorlagen-Styling-Prompt**: öffnet das vollständige Agenten-Briefing für den eingestellten Ordner und bietet **Styling-Prompt kopieren** an. Siehe [PDF-Vorlagen und Agenten-Prompt](pdf.md#pdf-template-starter).
- **Keine Vorlage** und **Einstellungen öffnen**.

Dieselben Aktionen gibt es als einzelne **Merkzeug:**-Befehle in der Befehlspalette.

### Vorlage für den Vault

Wähle im **⋯**-Menü des Editors **PDF-Vorlage für diesen Vault**. Wähle **Zentrale Vorlage** und einen Namen oder **Vorlage aus diesem Vault** mit einem relativen Ordner wie `.merkzeug/templates/Firma` und klicke **Übernehmen**. Die Auswahl wird in `.merkzeug/settings.json` gespeichert, gilt für Desktop, iPhone/iPad, IntelliJ und VS Code und hat Vorrang vor `merkzeug.pdf.templateFolder`. **Keine Vorlage** und **Übernehmen** entfernt die Zuweisung.

## PDF-Stile beim Bearbeiten

Aktiviere im **⋯**-Menü **PDF-Vorlage beim Bearbeiten verwenden** (gespeichert als `merkzeug.editor.pdfTemplatePreview`). Die Inhaltsstile der zugewiesenen Vorlage gelten dann im Editor; der Frontmatter-Bereich nutzt dieselbe helle Papierfläche; Werkzeugleiste und VS Code behalten das VS-Code-Design. Die Vorschau zeigt Typografie und Farben, keine Seitenumbrüche, Deckblätter oder Kopf- und Fußzeilen. Sie aktualisiert sich bei geänderten Einstellungen und wenn der Editor wieder den Fokus erhält.

## Darstellung, Tour und Agenten-Hinweise

Der Editor folgt automatisch dem aktiven VS-Code-Farbdesign, auch bei Wechseln im laufenden Betrieb und bei kontrastreichen Designs. Das **⋯**-Menü enthält Über Merkzeug, Release Notes, die PDF-Vorlagenaktionen, die geführte Tour (nicht in Marketplace-Builds) und die Hinweise für Begleitordner.

Merkzeug kann Anweisungen für `Note.md` und `Note.assets/` in `AGENTS.md` / `CLAUDE.md` im Stammordner vorschlagen. Prüfe den Vorschlag und den vollständigen Inhalt beider Dateien, wähle die Zieldateien ausdrücklich aus und klicke **Hinzufügen**; keine ist vorausgewählt. **Später** verschiebt den Hinweis für die laufende Sitzung; **Für diesen Vault nicht mehr vorschlagen** unterdrückt ihn für diesen Ordner dauerhaft.

## Sprache

Die Oberfläche ist Deutsch, wenn VS Code auf Deutsch eingestellt ist oder VS Code auf Englisch auf einem deutschen System läuft; sonst Englisch. Befehls- und Einstellungsnamen folgen der Anzeigesprache von VS Code.

## Release Notes, Über Merkzeug und Support

Beim ersten Start einer neuen Version öffnen sich ihre Release Notes; **Fertig** markiert sie als gelesen. Die vollständige Versionsgeschichte findest du unter **⋯ → Release Notes**, Version, Lizenz, Herausgeber und Website unter **⋯ → Über Merkzeug**.

Wähle in der Befehlspalette **Merkzeug: Support kontaktieren…**. Der Browser öffnet das Supportformular mit Merkzeug, deiner Sprache, VS Code und der Erweiterungsversion. Notizinhalte und Pfade werden nicht übertragen.

## Umfang und Einschränkungen

- Dateien und Bilder außerhalb des Arbeitsbereichsordners der Notiz sind im Editor nicht zugänglich. Bei einer ohne Arbeitsbereich geöffneten Datei ist ihr Ordner die Grenze.
- PDF-Export und Drucken benötigen einen Chromium-basierten Browser; Seitenumbrüche können je nach Browserversion leicht abweichen.
- Vault-Browser, Kalender des Betriebssystems, Meeting-Notizen und Sammel-PDF-Export gehören nicht zur Erweiterung. Neue Dateien legst du im Explorer von VS Code an.

Bei Problemen hilft die [Fehlerbehebung](troubleshooting.md). Für Entwickler gibt es die [Entwicklungsanleitung der Erweiterung](../../vscode/README.md).

## Lizenz

Merkzeug steht unter der [MIT-Lizenz](../../resources/legal/EULA.de.md). Das Erweiterungspaket enthält die Lizenz und die Lizenzhinweise von Drittanbietern.
