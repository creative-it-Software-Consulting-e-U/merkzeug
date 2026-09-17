package com.creativeit.merkzeug;

import java.util.Locale;
import java.util.Map;

/** English source messages with a German OS-locale translation. */
final class Messages {
    private static final Map<String, String> GERMAN = Map.ofEntries(
        Map.entry("Cannot read Markdown file: ", "Markdown-Datei kann nicht gelesen werden: "),
        Map.entry("Markdown changed during refactoring", "Markdown wurde während des Refactorings geändert"),
        Map.entry("Move note and attachments", "Notiz und Begleitordner verschieben"),
        Map.entry("Move", "Verschieben"),
        Map.entry("Destination folder", "Zielordner"),
        Map.entry("Choose an existing destination folder", "Wähle einen vorhandenen Zielordner"),
        Map.entry("Close", "Schließen"),
        Map.entry("Template styling prompt", "Vorlagen-Styling-Prompt"),
        Map.entry("Copy styling prompt", "Styling-Prompt kopieren"),

        Map.entry("Refactoring symbolic-link attachments requires manual review.", "Refactoring von Begleitordnern mit symbolischen Links muss manuell geprüft werden."),
        Map.entry("Attachment refactoring stopped: destination already exists: ", "Refactoring mit Begleitordner gestoppt: Das Ziel existiert bereits: "),
        Map.entry("Choose a desktop template…", "Desktop-Vorlage auswählen…"),
        Map.entry("Desktop templates", "Desktop-Vorlagen"),
        Map.entry("Refresh", "Aktualisieren"),
        Map.entry("Looking for desktop templates…", "Desktop-Vorlagen werden gesucht…"),
        Map.entry("Some desktop locations could not be read. You can choose a folder manually.", "Einige Desktop-Verzeichnisse konnten nicht gelesen werden. Du kannst einen Ordner manuell auswählen."),
        Map.entry("No desktop templates found. You can choose a folder manually.", "Keine Desktop-Vorlagen gefunden. Du kannst einen Ordner manuell auswählen."),
        Map.entry("Select a template to use its existing folder. No files are copied.", "Wähle eine Vorlage, um ihren vorhandenen Ordner zu verwenden. Es werden keine Dateien kopiert."),

        Map.entry("Choose which documents to include in the PDF.", "Welche Dokumente sollen in das PDF aufgenommen werden?"),
        Map.entry("Linked documents:", "Verlinkte Dokumente:"),
        Map.entry("Only this document", "Nur dieses Dokument"),
        Map.entry("Include linked documents", "Mit verlinkten Dokumenten"),
        Map.entry("Cancel", "Abbrechen"),
        Map.entry("PDF template folder (empty: no template)", "PDF-Vorlagenordner (leer: keine Vorlage)"),
        Map.entry("Use bundled PDF template", "Mitgelieferte PDF-Vorlage verwenden"),
        Map.entry("Choose an existing template folder", "Bitte einen vorhandenen Vorlagenordner auswählen"),
        Map.entry("Bundled PDF template is missing", "Die mitgelieferte PDF-Vorlage fehlt"),
        Map.entry("Unknown action", "Unbekannte Aktion"),
        Map.entry("File is outside the open project: ", "Datei liegt außerhalb des geöffneten Projekts: "),
        Map.entry("Wrong document", "Falsches Dokument"),
        Map.entry("CONFLICT: The document has changed since it was read.", "CONFLICT: Das Dokument wurde zwischenzeitlich geändert."),
        Map.entry("File is read-only", "Datei ist schreibgeschützt"),
        Map.entry("Edit with Merkzeug", "Merkzeug bearbeiten"),
        Map.entry("Unsupported image format", "Bildformat nicht unterstützt"),
        Map.entry("Merkzeug: PDF template folder", "Merkzeug: PDF-Vorlage (Ordner mit kopfzeile.html usw.)"),
        Map.entry("Template file is outside the template folder", "Vorlagendatei liegt außerhalb des Vorlagenordners"),
        Map.entry("Template image is outside the template folder", "Vorlagenbild liegt außerhalb des Vorlagenordners"),
        Map.entry("Template resource is not an image", "Vorlagenressource ist kein Bild"),
        Map.entry("A PDF export is already running", "Ein PDF-Export läuft bereits"),
        Map.entry("Print", "Drucken"),
        Map.entry("Print…", "Drucken…"),
        Map.entry("Merkzeug: Export PDF", "Merkzeug: PDF exportieren"),
        Map.entry("Replace the existing PDF?", "Vorhandene PDF ersetzen?"),
        Map.entry("Could not generate PDF", "PDF konnte nicht erzeugt werden"),
        Map.entry("Invalid resource path", "Ungültiger Ressourcenpfad"),
        Map.entry("Not an image file", "Keine Bilddatei")
    );
    static String text(String english) {
        return "de".equals(Locale.getDefault().getLanguage()) ? GERMAN.getOrDefault(english, english) : english;
    }
}
