package com.creativeit.merkzeug;

import com.intellij.ide.IdeView;
import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiDirectory;
import org.jetbrains.annotations.NotNull;
import java.io.IOException;
import java.nio.file.Paths;

/** File | New and the project view's New menu: a meeting note from a calendar event in the chosen folder. */
public final class NewMeetingNoteAction extends AnAction implements DumbAware {
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }

    @Override public void update(@NotNull AnActionEvent event) {
        event.getPresentation().setText(com.creativeit.merkzeug.Messages.text("Merkzeug Meeting Note…"));
        event.getPresentation().setEnabledAndVisible(event.getProject() != null && folder(event) != null);
    }

    @Override public void actionPerformed(@NotNull AnActionEvent event) {
        Project project = event.getProject();
        VirtualFile folder = folder(event);
        if (project == null || folder == null) return;
        try { new MeetingDialog(project, Paths.get(folder.getPath())).show(); }
        catch (IOException error) { Messages.showErrorDialog(project, error.getMessage(), "Merkzeug"); }
    }

    private static VirtualFile folder(AnActionEvent event) {
        IdeView view = event.getData(LangDataKeys.IDE_VIEW);
        if (view != null) {
            PsiDirectory[] directories = view.getDirectories();
            if (directories.length == 1) return local(directories[0].getVirtualFile());
        }
        VirtualFile file = event.getData(CommonDataKeys.VIRTUAL_FILE);
        if (file == null) return null;
        return local(file.isDirectory() ? file : file.getParent());
    }
    private static VirtualFile local(VirtualFile file) { return file != null && file.isInLocalFileSystem() && file.isDirectory() ? file : null; }
}
