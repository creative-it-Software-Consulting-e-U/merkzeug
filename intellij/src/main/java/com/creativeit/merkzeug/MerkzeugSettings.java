package com.creativeit.merkzeug;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.options.Configurable;
import com.intellij.openapi.options.ConfigurationException;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.TextFieldWithBrowseButton;
import javax.swing.*;
import java.awt.BorderLayout;
import java.nio.file.*;
import java.io.*;

/** Project-local PDF settings, rendered with the IDE's own theme-aware controls. */
public final class MerkzeugSettings implements Configurable {
    private final Project project;
    private TextFieldWithBrowseButton folder;
    public MerkzeugSettings(Project project) { this.project = project; }
    @Override public String getDisplayName() { return "Merkzeug"; }
    @Override public JComponent createComponent() {
        folder = new TextFieldWithBrowseButton();
        folder.addBrowseFolderListener(project, FileChooserDescriptorFactory.createSingleFolderDescriptor()
            .withTitle(Messages.text("Merkzeug: PDF template folder")));
        JPanel row = new JPanel(new BorderLayout(8, 8));
        JLabel label = new JLabel(Messages.text("PDF template folder (empty: no template)"));
        label.setLabelFor(folder.getTextField());
        row.add(label, BorderLayout.NORTH);
        row.add(folder, BorderLayout.CENTER);
        JButton starter = new JButton(Messages.text("Use bundled PDF template"));
        starter.addActionListener(event -> {
            try {
                Path directory = Paths.get(com.intellij.openapi.application.PathManager.getConfigPath(), "merkzeug", "pdf-templates", "Merkzeug");
                Files.createDirectories(directory);
                for (String name : new String[]{"kopfzeile.html", "fusszeile.html", "deckblatt.html", "stil.css", "vorlage.json", "README.md"}) {
                    Path target = directory.resolve(name);
                    if (!Files.exists(target)) try (InputStream source = getClass().getResourceAsStream("/pdf-templates/Merkzeug/" + name)) {
                        if (source == null) throw new IOException(Messages.text("Bundled PDF template is missing"));
                        Files.copy(source, target);
                    }
                }
                folder.setText(directory.toString());
            } catch (IOException error) { com.intellij.openapi.ui.Messages.showErrorDialog(project, error.getMessage(), "Merkzeug"); }
        });
        row.add(starter, BorderLayout.SOUTH);
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(row, BorderLayout.NORTH);
        reset();
        return panel;
    }
    private String stored() { return PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory", ""); }
    @Override public boolean isModified() { return folder != null && !folder.getText().trim().equals(stored()); }
    @Override public void reset() { if (folder != null) folder.setText(stored()); }
    @Override public void apply() throws ConfigurationException {
        String value = folder.getText().trim();
        try {
            if (!value.isEmpty() && !Files.isDirectory(Path.of(value))) throw new IllegalArgumentException();
        } catch (IllegalArgumentException error) { throw new ConfigurationException(Messages.text("Choose an existing template folder")); }
        PropertiesComponent.getInstance(project).setValue("merkzeug.templateDirectory", value.isEmpty() ? null : value);
    }
    @Override public void disposeUIResources() { if (folder != null) folder.dispose(); folder = null; }
}
