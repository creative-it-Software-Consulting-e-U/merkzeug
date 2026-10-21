package com.creativeit.merkzeug;

import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import javax.swing.*;
import java.awt.Dimension;
import java.io.IOException;
import java.nio.file.Path;

/** Modal IDE dialog around {@link MeetingPanel}; opens the created note in the Merkzeug editor. */
final class MeetingDialog extends DialogWrapper {
    private final MeetingPanel panel;

    MeetingDialog(Project project, Path folder) throws IOException {
        super(project, false);
        panel = new MeetingPanel(project, folder, note -> {
            close(OK_EXIT_CODE);
            VirtualFile created = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(note);
            if (created == null) return;
            FileEditorManager editors = FileEditorManager.getInstance(project);
            editors.openFile(created, true);
            editors.setSelectedEditor(created, "merkzeug-editor");
        }, () -> close(CANCEL_EXIT_CODE));
        Disposer.register(getDisposable(), panel);
        setTitle(Messages.text("New meeting note"));
        init();
    }

    @Override protected JComponent createCenterPanel() {
        JComponent component = panel.getComponent();
        component.setPreferredSize(new Dimension(560, 640));
        return component;
    }
    @Override protected JComponent createSouthPanel() { return null; }
    @Override public JComponent getPreferredFocusedComponent() { return panel.getComponent(); }
}
