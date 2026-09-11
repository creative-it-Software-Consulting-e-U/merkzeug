package com.creativeit.merkzeug;

import com.intellij.psi.*;
import com.intellij.refactoring.rename.RenamePsiFileProcessor;
import com.intellij.refactoring.listeners.RefactoringElementListener;
import com.intellij.usageView.UsageInfo;
import java.util.Map;

/** Add the companion directory to IntelliJ's native rename transaction. */
public final class CompanionRenameProcessor extends RenamePsiFileProcessor {
    @Override public boolean canProcessElement(PsiElement element) { return CompanionAssets.companion(element) != null; }
    @Override public void prepareRenaming(PsiElement element, String newName, Map<PsiElement, String> renames) {
        CompanionAssets.checkRename((PsiFile) element, newName);
        PsiDirectory directory = CompanionAssets.companion(element);
        String name = CompanionAssets.stem(newName) + ".assets";
        if (directory != null && !directory.getName().equals(name)) renames.put(directory, name);
    }
    @Override public void renameElement(PsiElement element, String newName, UsageInfo[] usages, RefactoringElementListener listener) {
        CompanionAssets.checkRename((PsiFile) element, newName);
        String oldStem = CompanionAssets.stem(((PsiFile) element).getName());
        var virtualFile = ((PsiFile) element).getVirtualFile();
        super.renameElement(element, newName, usages, listener);
        var document = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().getDocument(virtualFile);
        if (document != null) {
            String newStem = CompanionAssets.stem(newName);
            String content = document.getText();
            String updated = rewriteReferences(content, oldStem, newStem);
            if (!content.equals(updated)) {
                document.setText(updated);
                com.intellij.psi.PsiDocumentManager.getInstance(element.getProject()).commitDocument(document);
            }
        }
    }
    static String rewriteReferences(String text, String oldStem, String newStem) {
        String variants = java.util.regex.Pattern.quote(oldStem) + "|" + java.util.regex.Pattern.quote(encodePath(oldStem));
        var pattern = java.util.regex.Pattern.compile("(^|[\\s(\"'<])((?:\\./)?)(?:" + variants + ")\\.assets/");
        var matcher = pattern.matcher(text);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(matcher.group(1) + matcher.group(2) + encodePath(newStem) + ".assets/"));
        matcher.appendTail(result);
        return result.toString();
    }
    private static String encodePath(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }
    @Override public boolean isInplaceRenameSupported() { return false; }
}
