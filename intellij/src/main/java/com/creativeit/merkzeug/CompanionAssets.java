package com.creativeit.merkzeug;

import com.intellij.psi.*;
import com.intellij.openapi.vfs.VFileProperty;
import com.intellij.util.IncorrectOperationException;
import java.util.*;

/** Pair checks before native refactoring mutates either filesystem entry. */
final class CompanionAssets {
    static PsiDirectory companion(PsiElement element) {
        if (!(element instanceof PsiFile file) || !file.getName().toLowerCase(Locale.ROOT).endsWith(".md")) return null;
        PsiDirectory parent = file.getContainingDirectory();
        return parent == null ? null : parent.findSubdirectory(stem(file.getName()) + ".assets");
    }
    static String stem(String name) { int dot = name.lastIndexOf('.'); return dot < 0 ? name : name.substring(0, dot); }
    static void checkEntry(PsiFileSystemItem entry) {
        if (entry.getVirtualFile().is(VFileProperty.SYMLINK)) throw new IncorrectOperationException(Messages.text("Refactoring symbolic-link attachments requires manual review."));
        if (!entry.isWritable()) throw new IncorrectOperationException(Messages.text("File is read-only"));
    }
    static void checkTarget(PsiFileSystemItem source, PsiDirectory target, String name) {
        checkEntry(source);
        var existing = target.getVirtualFile().findChild(name);
        var targetPath = target.getVirtualFile().toNioPath().resolve(name);
        boolean physicalCollision = java.nio.file.Files.exists(targetPath, java.nio.file.LinkOption.NOFOLLOW_LINKS)
            && !targetPath.equals(source.getVirtualFile().toNioPath())
            && !(existing != null && existing.equals(source.getVirtualFile()));
        if (physicalCollision || existing != null && !existing.equals(source.getVirtualFile())) throw new IncorrectOperationException(Messages.text("Attachment refactoring stopped: destination already exists: ") + name);
    }
    static void checkRename(PsiFile file, String name) {
        PsiDirectory assets = companion(file);
        if (assets == null) return;
        checkTarget(file, file.getContainingDirectory(), name);
        checkTarget(assets, file.getContainingDirectory(), stem(name) + ".assets");
    }
    static PsiElement[] expand(PsiElement[] elements) {
        Set<PsiElement> expanded = new LinkedHashSet<>(Arrays.asList(elements));
        for (PsiElement element : elements) {
            PsiDirectory assets = companion(element);
            if (assets != null) expanded.add(assets);
        }
        return com.intellij.psi.util.PsiTreeUtil.filterAncestors(expanded.toArray(PsiElement.EMPTY_ARRAY));
    }
    static void checkMove(PsiElement[] elements, PsiDirectory target) {
        Set<String> names = new HashSet<>();
        for (PsiElement element : elements) {
            PsiFileSystemItem item = (PsiFileSystemItem) element;
            if (!names.add(target.getVirtualFile().getFileSystem().isCaseSensitive() ? item.getName() : item.getName().toLowerCase(Locale.ROOT))) throw new IncorrectOperationException(Messages.text("Attachment refactoring stopped: destination already exists: ") + item.getName());
            checkTarget(item, target, item.getName());
            com.intellij.refactoring.move.moveFilesOrDirectories.MoveFilesOrDirectoriesUtil.checkMove(element, target);
        }
    }
}
