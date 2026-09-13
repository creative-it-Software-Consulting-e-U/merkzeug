package com.creativeit.merkzeug;

import com.intellij.openapi.project.Project;
import com.intellij.psi.*;
import com.intellij.refactoring.move.MoveCallback;
import com.intellij.refactoring.move.moveFilesOrDirectories.*;
import com.intellij.openapi.actionSystem.DataContext;
import com.intellij.openapi.editor.Editor;
import com.intellij.util.IncorrectOperationException;
import java.util.Arrays;

/** Preserve the native Move dialog and processor, including usage updates and undo. */
public final class CompanionMoveHandler extends MoveFilesOrDirectoriesHandler {
    @Override public boolean canMove(PsiElement[] elements, PsiElement target, PsiReference reference) {
        return Arrays.stream(elements).anyMatch(e -> CompanionAssets.companion(e) != null) && super.canMove(elements, target, reference);
    }
    @Override public boolean tryToMove(PsiElement element, Project project, DataContext context, PsiReference reference, Editor editor) {
        return CompanionAssets.companion(element) != null && super.tryToMove(element, project, context, reference, editor);
    }
    @Override public PsiElement[] adjustForMove(Project project, PsiElement[] elements, PsiElement target) { return CompanionAssets.expand(elements); }
    @Override public void doMove(Project project, PsiElement[] elements, PsiElement target, MoveCallback callback) {
        PsiElement[] expanded = CompanionAssets.expand(elements);
        PsiDirectory destination = MoveFilesOrDirectoriesUtil.resolveToDirectory(project, target);
        if (target != null && destination == null) return;
        new CompanionMoveDialog(project, expanded, MoveFilesOrDirectoriesUtil.getInitialTargetDirectory(destination, expanded), callback).show();
    }
    /** Uses supported DialogWrapper controls; the refactoring transaction stays native. */
    static final class CompanionMoveDialog extends com.intellij.openapi.ui.DialogWrapper {
        private final Project project;
        private final PsiElement[] elements;
        private final MoveCallback callback;
        private final com.intellij.openapi.ui.TextFieldWithBrowseButton folder = new com.intellij.openapi.ui.TextFieldWithBrowseButton();
        CompanionMoveDialog(Project project, PsiElement[] elements, PsiDirectory destination, MoveCallback callback) {
            super(project, true);
            this.project = project; this.elements = elements; this.callback = callback;
            setTitle(Messages.text("Move note and attachments"));
            setOKButtonText(Messages.text("Move"));
            folder.addBrowseFolderListener(project, com.intellij.openapi.fileChooser.FileChooserDescriptorFactory.createSingleFolderDescriptor()
                .withTitle(Messages.text("Destination folder")));
            if (destination != null) folder.setText(destination.getVirtualFile().getPath());
            com.intellij.openapi.util.Disposer.register(getDisposable(), folder);
            init();
        }
        @Override protected javax.swing.JComponent createCenterPanel() {
            var panel = new javax.swing.JPanel(new java.awt.BorderLayout(8, 8));
            var label = new javax.swing.JLabel(Messages.text("Destination folder"));
            label.setLabelFor(folder.getTextField());
            panel.add(label, java.awt.BorderLayout.NORTH); panel.add(folder, java.awt.BorderLayout.CENTER);
            var paths = new javax.swing.JTextArea(String.join("\n", Arrays.stream(elements)
                .map(e -> ((PsiFileSystemItem)e).getVirtualFile().getPath()).toList()));
            paths.setEditable(false); paths.setRows(Math.min(elements.length, 6)); paths.setColumns(55);
            panel.add(new javax.swing.JScrollPane(paths), java.awt.BorderLayout.SOUTH);
            return panel;
        }
        @Override public javax.swing.JComponent getPreferredFocusedComponent() { return folder.getTextField(); }
        @Override protected void doOKAction() {
            try {
                var virtual = com.intellij.openapi.vfs.LocalFileSystem.getInstance().refreshAndFindFileByPath(folder.getText().trim());
                var directory = virtual == null ? null : PsiManager.getInstance(project).findDirectory(virtual);
                if (directory == null) { setErrorText(Messages.text("Choose an existing destination folder")); return; }
                CompanionAssets.checkMove(elements, directory);
                processor(project, elements, directory, callback, () -> close(OK_EXIT_CODE)).run();
            } catch (IncorrectOperationException error) { setErrorText(error.getMessage()); }
        }
    }

    static MoveFilesOrDirectoriesProcessor processor(Project project, PsiElement[] elements, PsiDirectory destination, MoveCallback callback, Runnable done) {
        PsiElement[] expanded = CompanionAssets.expand(elements);
        CompanionAssets.checkMove(expanded, destination);
        return new MoveFilesOrDirectoriesProcessor(project, expanded, destination, true, false, false, callback, done) {
            @Override protected void performRefactoring(com.intellij.usageView.UsageInfo[] usages) {
                CompanionAssets.checkMove(myElementsToMove, destination);
                super.performRefactoring(usages);
            }
        };
    }
}
