package com.creativeit.merkzeug;

import com.intellij.openapi.editor.Document;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.roots.ProjectRootManager;
import com.intellij.openapi.vfs.*;
import com.intellij.psi.PsiDocumentManager;
import com.intellij.util.IncorrectOperationException;
import org.intellij.markdown.MarkdownElementTypes;
import org.intellij.markdown.ast.ASTNode;
import org.intellij.markdown.flavours.commonmark.CommonMarkFlavourDescriptor;
import org.intellij.markdown.parser.MarkdownParser;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Markdown-aware fallback independent of the optional Markdown editor plugin. */
final class MarkdownLinkRefactoring {
    record Move(String from, String to) {}
    record Span(int start, int end, String value) {}
    record Edit(Document document, String before, String after) {}
    static String mapped(String path, List<Move> moves) {
        return moves.stream().sorted(Comparator.comparingInt((Move m) -> m.from.length()).reversed())
            .filter(m -> path.equals(m.from) || path.startsWith(m.from + "/"))
            .findFirst().map(m -> m.to + path.substring(m.from.length())).orElse(path);
    }
    static List<Span> spans(String text) {
        String input = text;
        var front = java.util.regex.Pattern.compile("\\A---\\r?\\n[\\s\\S]*?\\r?\\n(?:---|\\.\\.\\.)(?:\\r?\\n|$)").matcher(text);
        if (front.find()) {
            char[] masked = text.toCharArray();
            for (int i = 0; i < front.end(); i++) if (masked[i] != '\r' && masked[i] != '\n') masked[i] = ' ';
            input = new String(masked);
        }
        var tree = new MarkdownParser(new CommonMarkFlavourDescriptor()).buildMarkdownTreeFromString(input);
        var result = new ArrayList<Span>(); collect(tree, text, result);
        return result;
    }
    private static void collect(ASTNode node, String text, List<Span> spans) {
        if (node.getType() == MarkdownElementTypes.CODE_FENCE || node.getType() == MarkdownElementTypes.CODE_BLOCK || node.getType() == MarkdownElementTypes.CODE_SPAN || node.getType() == MarkdownElementTypes.HTML_BLOCK) return;
        if (node.getType() == MarkdownElementTypes.LINK_DESTINATION) {
            int start = node.getStartOffset(), end = node.getEndOffset();
            if (start < end && text.charAt(start) == '<' && text.charAt(end - 1) == '>') { start++; end--; }
            spans.add(new Span(start, end, text.substring(start, end))); return;
        }
        for (var child : node.getChildren()) collect(child, text, spans);
    }
    static String destination(String raw, String source, List<Move> moves, String root) {
        String url = raw.replaceAll("\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\^_`{|}~\\\\])", "$1");
        if (url.isEmpty() || url.matches("(?is)^(?:[a-z][a-z0-9+.-]*:|#|\\?|//).*$")) return raw;
        int cut = url.length();
        for (char c : new char[]{'#', '?'}) { int index = url.indexOf(c); if (index >= 0) cut = Math.min(cut, index); }
        String path = url.substring(0, cut), suffix = url.substring(cut);
        String decoded;
        try { decoded = java.net.URLDecoder.decode(path.replace("+", "%2B"), StandardCharsets.UTF_8); }
        catch (IllegalArgumentException error) { return raw; }
        Path vault = Path.of(root), oldSource = Path.of(source);
        Path absolute = (path.startsWith("/") ? vault.resolve(decoded.substring(1)) : oldSource.getParent().resolve(decoded)).normalize();
        if (!absolute.startsWith(vault)) return raw;
        Path target = Path.of(mapped(absolute.toString().replace('\\', '/'), moves));
        Path newSource = Path.of(mapped(source, moves));
        if (absolute.equals(target) && oldSource.getParent().equals(newSource.getParent())) return raw;
        String relative = (path.startsWith("/") ? vault : newSource.getParent()).relativize(target).toString().replace('\\', '/');
        String result = Arrays.stream(relative.split("/", -1)).map(s -> java.net.URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20").replace("*", "%2A").replace("%7E", "~")).collect(java.util.stream.Collectors.joining("/"));
        if (path.startsWith("/")) result = "/" + result;
        else if (path.startsWith("./") && !result.startsWith(".")) result = "./" + result;
        return result + suffix;
    }
    static String rewrite(String text, String source, List<Move> moves, String root) {
        var edits = spans(text); var result = new StringBuilder(text);
        for (int i = edits.size() - 1; i >= 0; i--) {
            var span = edits.get(i); String value = destination(span.value, source, moves, root);
            if (!value.equals(span.value)) result.replace(span.start, span.end, value);
        }
        return result.toString();
    }
    static List<Edit> prepare(Project project, List<Move> moves) {
        var result = new ArrayList<Edit>();
        var roots = ProjectRootManager.getInstance(project).getContentRoots();
        ProjectRootManager.getInstance(project).getFileIndex().iterateContent(file -> {
            if (file.isDirectory() || file.is(VFileProperty.SYMLINK) || !file.getName().toLowerCase(Locale.ROOT).endsWith(".md")) return true;
            String root = Arrays.stream(roots).filter(r -> file.getPath().startsWith(r.getPath() + "/")).map(VirtualFile::getPath).max(Comparator.comparingInt(String::length)).orElse(project.getBasePath());
            String base = project.getBasePath();
            if (base != null && file.getPath().startsWith(base + "/")) root = base;
            if (root == null) return true;
            Document doc = FileDocumentManager.getInstance().getDocument(file);
            if (doc == null) throw new IncorrectOperationException(Messages.text("Cannot read Markdown file: ") + file.getPath());
            String before = doc.getText(), after = rewrite(before, file.getPath(), moves, root);
            if (!before.equals(after)) {
                if (!file.isWritable() || !doc.isWritable()) throw new IncorrectOperationException(Messages.text("File is read-only") + ": " + file.getPath());
                result.add(new Edit(doc, before, after));
            }
            return true;
        });
        return result;
    }
    static void apply(Project project, List<Edit> edits) {
        // Native Markdown references may already have been updated. Merge only link
        // destinations, retaining other native refactoring edits and the undo command.
        for (var edit : edits) {
            PsiDocumentManager.getInstance(project).doPostponedOperationsAndUnblockDocument(edit.document);
            String current = edit.document.getText();
            if (current.equals(edit.after)) continue;
            if (current.equals(edit.before)) edit.document.setText(edit.after);
            else {
                var before = spans(edit.before); var after = spans(edit.after); var now = spans(current);
                if (before.size() != after.size() || before.size() != now.size()) throw new IncorrectOperationException(Messages.text("Markdown changed during refactoring"));
                var merged = new StringBuilder(current);
                for (int i = now.size() - 1; i >= 0; i--) {
                    if (before.get(i).value.equals(after.get(i).value)) continue;
                    var span = now.get(i);
                    if (!span.value.equals(before.get(i).value) && !span.value.equals(after.get(i).value)) continue; // Native refactoring owns a more specific change.
                    merged.replace(span.start, span.end, after.get(i).value);
                }
                edit.document.setText(merged.toString());
            }
            PsiDocumentManager.getInstance(project).commitDocument(edit.document);
        }
    }
    static com.intellij.usageView.UsageInfo[] linkUsages(com.intellij.usageView.UsageInfo[] usages) {
        var cache = new java.util.HashMap<com.intellij.psi.PsiFile, List<Span>>();
        return Arrays.stream(usages).filter(usage -> {
            var file = usage.getFile();
            if (file == null || !file.getName().toLowerCase(Locale.ROOT).endsWith(".md")) return true;
            if (com.intellij.lang.injection.InjectedLanguageManager.getInstance(file.getProject()).isInjectedFragment(file)) return false;
            int offset = usage.getNavigationOffset();
            return cache.computeIfAbsent(file, f -> spans(f.getText())).stream().anyMatch(s -> offset >= s.start && offset < s.end);
        }).toArray(com.intellij.usageView.UsageInfo[]::new);
    }
    static List<Move> renameMoves(com.intellij.psi.PsiFile file, String name) {
        String source = file.getVirtualFile().getPath(), target = file.getContainingDirectory().getVirtualFile().getPath() + "/" + name;
        var moves = new ArrayList<Move>(); moves.add(new Move(source, target));
        var companion = CompanionAssets.companion(file);
        if (companion != null) moves.add(new Move(companion.getVirtualFile().getPath(), file.getContainingDirectory().getVirtualFile().getPath() + "/" + CompanionAssets.stem(name) + ".assets"));
        return moves;
    }
}
