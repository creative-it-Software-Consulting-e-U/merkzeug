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
        new MoveFilesOrDirectoriesDialog(project, expanded, MoveFilesOrDirectoriesUtil.getInitialTargetDirectory(destination, expanded)) {
            @Override protected void performMove(PsiDirectory directory) {
                try {
                    CompanionAssets.checkMove(expanded, directory);
                    processor(project, expanded, directory, callback, this::closeOKAction).run();
                } catch (IncorrectOperationException error) {
                    com.intellij.openapi.ui.Messages.showErrorDialog(project, error.getMessage(), "Merkzeug");
                }
            }
        }.show();
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
