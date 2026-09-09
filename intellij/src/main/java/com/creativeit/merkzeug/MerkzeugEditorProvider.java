package com.creativeit.merkzeug;

import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.jcef.JBCefApp;
import org.jetbrains.annotations.NotNull;

public final class MerkzeugEditorProvider implements FileEditorProvider, DumbAware {
    @Override public boolean accept(@NotNull Project project, @NotNull VirtualFile file) {
        return "md".equalsIgnoreCase(file.getExtension()) && file.isInLocalFileSystem() && JBCefApp.isSupported();
    }
    @Override public @NotNull FileEditor createEditor(@NotNull Project project, @NotNull VirtualFile file) {
        return new MerkzeugEditor(project, file);
    }
    @Override public @NotNull String getEditorTypeId() { return "merkzeug-editor"; }
    @Override public @NotNull FileEditorPolicy getPolicy() { return FileEditorPolicy.PLACE_AFTER_DEFAULT_EDITOR; }
}
