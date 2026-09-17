package com.creativeit.merkzeug;

import com.intellij.psi.*;
import com.intellij.refactoring.rename.RenamePsiElementProcessor;
import com.intellij.refactoring.listeners.RefactoringElementListener;
import com.intellij.usageView.UsageInfo;
import java.util.*;

/** Keep Markdown paths valid when a containing directory is renamed. */
public final class MarkdownDirectoryRenameProcessor extends RenamePsiElementProcessor {
    private final Map<com.intellij.openapi.vfs.VirtualFile, List<MarkdownLinkRefactoring.Edit>> pending = new WeakHashMap<>();
    @Override public boolean canProcessElement(PsiElement element) {
        return element instanceof PsiDirectory dir && dir.getParentDirectory() != null
            && !com.intellij.openapi.roots.ProjectRootManager.getInstance(element.getProject()).getFileIndex().isInSourceContent(dir.getVirtualFile());
    }
    private List<MarkdownLinkRefactoring.Edit> prepare(PsiElement element, String name) {
        var dir = (PsiDirectory)element;
        return MarkdownLinkRefactoring.prepare(element.getProject(), List.of(new MarkdownLinkRefactoring.Move(dir.getVirtualFile().getPath(), dir.getParentDirectory().getVirtualFile().getPath() + "/" + name)));
    }
    @Override public void prepareRenaming(PsiElement element, String name, Map<PsiElement, String> renames) {
        super.prepareRenaming(element, name, renames);
        pending.put(((PsiDirectory)element).getVirtualFile(), prepare(element, name));
    }
    @Override public void renameElement(PsiElement element, String name, UsageInfo[] usages, RefactoringElementListener listener) {
        var edits = pending.remove(((PsiDirectory)element).getVirtualFile());
        if (edits == null) edits = prepare(element, name);
        super.renameElement(element, name, MarkdownLinkRefactoring.linkUsages(usages), listener);
        MarkdownLinkRefactoring.apply(element.getProject(), edits);
    }
}
