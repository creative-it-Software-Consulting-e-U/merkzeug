package com.creativeit.merkzeug;

import java.util.Locale;
import java.util.Map;

/** English source messages with a German OS-locale translation. */
final class Messages {
    private static final Map<String, String> GERMAN = Map.ofEntries(
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
