package com.creativeit.merkzeug;

import com.intellij.psi.*;
import com.intellij.refactoring.rename.RenamePsiFileProcessor;
import com.intellij.refactoring.listeners.RefactoringElementListener;
import com.intellij.usageView.UsageInfo;
import java.util.Map;

/** Add the companion directory to IntelliJ's native rename transaction. */
public final class CompanionRenameProcessor extends RenamePsiFileProcessor {
    private final Map<com.intellij.openapi.vfs.VirtualFile, java.util.List<MarkdownLinkRefactoring.Edit>> pending = new java.util.WeakHashMap<>();
    @Override public boolean canProcessElement(PsiElement element) { return element instanceof PsiFile file && file.getName().toLowerCase(java.util.Locale.ROOT).endsWith(".md"); }
    @Override public void prepareRenaming(PsiElement element, String newName, Map<PsiElement, String> renames) {
        var file = (PsiFile) element;
        CompanionAssets.checkRename(file, newName);
        pending.put(file.getVirtualFile(), MarkdownLinkRefactoring.prepare(element.getProject(), MarkdownLinkRefactoring.renameMoves(file, newName)));
        PsiDirectory directory = CompanionAssets.companion(element);
        String name = CompanionAssets.stem(newName) + ".assets";
        if (directory != null && !directory.getName().equals(name)) renames.put(directory, name);
    }
    @Override public void renameElement(PsiElement element, String newName, UsageInfo[] usages, RefactoringElementListener listener) {
        CompanionAssets.checkRename((PsiFile) element, newName);
        var edits = pending.remove(((PsiFile) element).getVirtualFile());
        if (edits == null) edits = MarkdownLinkRefactoring.prepare(element.getProject(), MarkdownLinkRefactoring.renameMoves((PsiFile) element, newName));
        super.renameElement(element, newName, MarkdownLinkRefactoring.linkUsages(usages), listener);
        MarkdownLinkRefactoring.apply(element.getProject(), edits);
    }
    @Override public boolean isInplaceRenameSupported() { return false; }
}
