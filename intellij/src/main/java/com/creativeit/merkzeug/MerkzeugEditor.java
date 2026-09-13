package com.creativeit.merkzeug;

import com.google.gson.*;
import com.intellij.ide.BrowserUtil;
import com.intellij.ide.ui.LafManagerListener;
import com.intellij.util.ui.UIUtil;
import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.command.undo.*;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.event.DocumentEvent;
import com.intellij.openapi.editor.event.DocumentListener;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.util.UserDataHolderBase;
import com.intellij.openapi.vfs.*;
import com.intellij.ui.jcef.*;
import org.cef.browser.*;
import org.cef.handler.*;
import org.cef.callback.*;
import org.cef.misc.*;
import org.cef.network.*;
import org.jetbrains.annotations.NotNull;
import javax.swing.*;
import java.awt.BorderLayout;
import java.beans.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** A native IntelliJ Document with a shared Merkzeug web editor. */
public final class MerkzeugEditor extends UserDataHolderBase implements FileEditor, DocumentReferenceProvider {
    private static final Gson JSON = new Gson();
    private final Project project;
    private final VirtualFile file;
    private final Document document;
    private final JBCefBrowser browser;
    private final JBCefJSQuery query;
    private final JPanel panel = new JPanel(new BorderLayout());
    private final PropertyChangeSupport changes = new PropertyChangeSupport(this);
    private final String origin = "https://merkzeug-" + UUID.randomUUID() + ".local/";
    private boolean disposed;
    private boolean ownChange;
    private JsonObject pdfPayload;
    private Path pdfTarget;
    private boolean printRequested;
    private Path templateDirectory;

    public MerkzeugEditor(Project project, VirtualFile file) {
        this.project = project;
        this.file = file;
        UndoManager.getInstance(project);
        this.document = Objects.requireNonNull(FileDocumentManager.getInstance().getDocument(file));
        browser = new JBCefBrowser();
        Disposer.register(this, browser);
        query = JBCefJSQuery.create((JBCefBrowserBase) browser);
        Disposer.register(this, query);
        query.addHandler(json -> {
            try {
                JsonObject message = JsonParser.parseString(json).getAsJsonObject();
                ApplicationManager.getApplication().invokeLater(() -> dispatch(message));
            } catch (RuntimeException ignored) { }
            return null;
        });
        browser.getJBCefClient().getCefClient().addRequestHandler(new CefRequestHandlerAdapter() {
            @Override public boolean onBeforeBrowse(CefBrowser b, CefFrame f, CefRequest r, boolean gesture, boolean redirect) {
                return !r.getURL().startsWith(origin);
            }
            @Override public CefResourceRequestHandler getResourceRequestHandler(CefBrowser b, CefFrame f, CefRequest r, boolean navigation, boolean download, String initiator, BoolRef disable) {
                return new CefResourceRequestHandlerAdapter() {
                    @Override public CefResourceHandler getResourceHandler(CefBrowser b2, CefFrame f2, CefRequest request) {
                        if (!request.getURL().startsWith(origin)) return null;
                        return resource(request.getURL());
                    }
                };
            }
        });
        browser.getJBCefClient().getCefClient().addLoadHandler(new CefLoadHandlerAdapter() {
            @Override public void onLoadEnd(CefBrowser b, CefFrame frame, int status) {
                if (!frame.isMain() || !frame.getURL().startsWith(origin)) return;
                script("window.__merkzeugSend = function(message) {" + query.inject("message") + "}; window.dispatchEvent(new Event('merkzeug-ready')); ");
            }
        });
        document.addDocumentListener(new DocumentListener() {
            @Override public void documentChanged(@NotNull DocumentEvent event) {
                changes.firePropertyChange(FileEditor.getPropModified(), null, isModified());
                if (!ownChange) script("window.__merkzeugChanged?.()");
            }
        }, this);
        ApplicationManager.getApplication().getMessageBus().connect(this).subscribe(LafManagerListener.TOPIC, manager -> {
            browser.getComponent().setBackground(UIUtil.getPanelBackground());
            script("window.__merkzeugTheme?.(" + JSON.toJson(theme()) + ")");
        });
        project.getMessageBus().connect(this).subscribe(VirtualFileManager.VFS_CHANGES, new com.intellij.openapi.vfs.newvfs.BulkFileListener() {
            @Override public void after(java.util.List<? extends com.intellij.openapi.vfs.newvfs.events.VFileEvent> events) {
                boolean pathChanged = events.stream().anyMatch(event ->
                    (event instanceof com.intellij.openapi.vfs.newvfs.events.VFileMoveEvent ||
                     event instanceof com.intellij.openapi.vfs.newvfs.events.VFilePropertyChangeEvent property && VirtualFile.PROP_NAME.equals(property.getPropertyName())) &&
                    event.getFile() != null && VfsUtilCore.isAncestor(event.getFile(), file, false));
                if (pathChanged) ApplicationManager.getApplication().invokeLater(() -> {
                    if (!disposed && file.isValid() && pdfPayload == null) browser.loadURL(origin + "index.html");
                });
            }
        });
        browser.getComponent().setBackground(UIUtil.getPanelBackground());
        panel.add(browser.getComponent());
        browser.loadURL(origin + "index.html");
    }

    private static String color(java.awt.Color value) { return String.format("#%02x%02x%02x", value.getRed(), value.getGreen(), value.getBlue()); }
    private static Map<String, Object> theme() {
        java.awt.Color bg = UIUtil.getPanelBackground();
        return Map.of("choice", "system", "dark", (bg.getRed() * 299 + bg.getGreen() * 587 + bg.getBlue() * 114) < 128000,
            "colors", Map.of("bg", color(bg), "bg-sidebar", color(bg), "text", color(UIUtil.getLabelForeground()),
                "text-dim", color(UIUtil.getContextHelpForeground())));
    }

    private void script(String code) {
        if (!disposed) browser.getCefBrowser().executeJavaScript(code, origin, 0);
    }
    private void reply(int id, Object value, String error) {
        script("window.__merkzeugReply?.(" + id + "," + JSON.toJson(value) + "," + JSON.toJson(error) + ")");
    }
    private String arg(JsonObject m, String key) { return m.has(key) ? m.get(key).getAsString() : ""; }

    private void dispatch(JsonObject m) {
        int id = m.get("id").getAsInt();
        if (disposed || project.isDisposed()) return;
        try {
            Object result = switch (arg(m, "method")) {
                case "init" -> Map.of("path", file.getPath(), "vault", root().toString().replace('\\', '/'), "readonly", !file.isWritable(), "locale", Locale.getDefault().toLanguageTag(), "theme", theme(), "themeChoice", "system", "tourSeen", PropertiesComponent.getInstance().getBoolean("merkzeug.tour.seen", false));
                case "tourSeen" -> { PropertiesComponent.getInstance().setValue("merkzeug.tour.seen", true); yield true; }
                case "settings" -> { com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(project, MerkzeugSettings.class); yield true; }
                case "guidanceSuppressed" -> guidanceDismissed.contains(root().toString()) || PropertiesComponent.getInstance().getBoolean("merkzeug.guidance." + root(), false);
                case "guidanceSuppress" -> {
                    guidanceDismissed.add(root().toString());
                    if (m.get("never").getAsBoolean()) PropertiesComponent.getInstance().setValue("merkzeug.guidance." + root(), true);
                    yield true;
                }
                case "guidanceRead" -> guidanceRead(arg(m, "name"));
                case "guidanceAppend" -> { guidanceAppend(m); yield true; }
                case "read" -> read(arg(m, "path"));
                case "exists" -> Files.isRegularFile(allowed(arg(m, "path")));
                case "write" -> write(m);
                case "save" -> { FileDocumentManager.getInstance().saveDocument(document); yield true; }
                case "undo" -> { if (UndoManager.getInstance(project).isUndoAvailable(this)) UndoManager.getInstance(project).undo(this); yield true; }
                case "redo" -> { if (UndoManager.getInstance(project).isRedoAvailable(this)) UndoManager.getInstance(project).redo(this); yield true; }
                case "open" -> { open(arg(m, "href")); yield true; }
                case "image" -> saveImage(m);
                case "templatePreview" -> {
                    var preferences = PropertiesComponent.getInstance(project);
                    if (m.has("enabled")) preferences.setValue("merkzeug.templatePreview", m.get("enabled").getAsBoolean());
                    yield preferences.getBoolean("merkzeug.templatePreview", false);
                }
                case "template" -> loadTemplate();
                case "exportScope" -> chooseExportScope(m);
                case "export" -> beginExport(m);
                case "pdfPayload" -> pdfPayload;
                case "pdfReady" -> { printPdf(m.get("landscape").getAsBoolean()); yield true; }
                case "pdfError" -> { finishPdf(arg(m, "message")); yield true; }
                case "editor" -> { browser.loadURL(origin + "index.html"); yield true; }
                default -> throw new IllegalArgumentException(Messages.text("Unknown action"));
            };
            if (!arg(m, "method").equals("calendarFetch")) reply(id, result, null);
        } catch (Exception error) {
            reply(id, null, Objects.toString(error.getMessage(), error.toString()));
        }
    }

    private Path root() throws IOException {
        Path parent = Paths.get(file.getPath()).toRealPath().getParent();
        if (project.getBasePath() != null) {
            Path projectRoot = Paths.get(project.getBasePath()).toRealPath();
            if (parent.startsWith(projectRoot)) return projectRoot;
        }
        return parent;
    }
    private Path allowed(String value) throws IOException {
        Path candidate = Paths.get(value).toAbsolutePath().normalize();
        Path real = Files.exists(candidate) ? candidate.toRealPath() : candidate.getParent().toRealPath().resolve(candidate.getFileName());
        if (!real.startsWith(root())) throw new IOException(Messages.text("File is outside the open project: ") + candidate.getFileName());
        return real;
    }
    private static final Set<String> guidanceDismissed = java.util.concurrent.ConcurrentHashMap.newKeySet();

    private Path guidancePath(String name) throws IOException {
        if (!Set.of("AGENTS.md", "CLAUDE.md").contains(name)) throw new IOException("Invalid instruction file");
        Path path = root().resolve(name);
        if (Files.isSymbolicLink(path)) throw new IOException("Review symbolic links manually");
        return path;
    }
    private String guidanceRead(String name) throws IOException {
        Path path = guidancePath(name);
        if (!Files.exists(path)) return null;
        return ((Map<?, ?>) read(path.toString())).get("text").toString();
    }
    private void guidanceAppend(JsonObject m) throws IOException {
        String name = arg(m, "name"), addition = arg(m, "addition");
        String expected = m.has("expected") && !m.get("expected").isJsonNull() ? arg(m, "expected") : null;
        Path path = guidancePath(name);
        if (!Objects.equals(guidanceRead(name), expected)) throw new IOException("Instructions changed externally. Review the refreshed preview.");
        if (expected == null) {
            Files.writeString(path, addition, StandardOpenOption.CREATE_NEW);
            LocalFileSystem.getInstance().refreshAndFindFileByNioFile(path);
        } else {
            VirtualFile virtual = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(path);
            if (virtual == null || ReadonlyStatusHandler.getInstance(project).ensureFilesWritable(java.util.List.of(virtual)).hasReadonlyFiles()) throw new IOException("File is read-only");
            Document target = FileDocumentManager.getInstance().getDocument(virtual);
            if (target == null) throw new IOException("Cannot open instructions");
            WriteCommandAction.runWriteCommandAction(project, () -> {
                if (!target.getText().equals(expected)) throw new IllegalStateException("Instructions changed externally.");
                target.insertString(target.getTextLength(), addition);
            });
            FileDocumentManager.getInstance().saveDocument(target);
        }
    }

    private Object read(String path) throws IOException {
        Path resolved = allowed(path);
        VirtualFile virtual = LocalFileSystem.getInstance().findFileByNioFile(resolved);
        Document open = virtual == null ? null : FileDocumentManager.getInstance().getCachedDocument(virtual);
        return Map.of("text", open != null ? open.getText() : Files.readString(resolved), "revision", Long.toString(open != null ? open.getModificationStamp() : Files.getLastModifiedTime(resolved).toMillis()));
    }
    private Object write(JsonObject m) throws IOException {
        if (!allowed(arg(m, "path")).equals(Paths.get(file.getPath()).toRealPath())) throw new IOException(Messages.text("Wrong document"));
        if (!Long.toString(document.getModificationStamp()).equals(arg(m, "revision"))) throw new IOException(Messages.text("CONFLICT: The document has changed since it was read."));
        if (ReadonlyStatusHandler.getInstance(project).ensureFilesWritable(java.util.List.of(file)).hasReadonlyFiles()) throw new IOException(Messages.text("File is read-only"));
        String text = arg(m, "text").replace("\r\n", "\n");
        if (!text.equals(document.getText())) {
            ownChange = true;
            try {
                WriteCommandAction.runWriteCommandAction(project, Messages.text("Edit with Merkzeug"), "merkzeug:" + file.getUrl(), () -> {
                    // Minimal edit keeps IntelliJ range markers and other views intact.
                    String previous = document.getText();
                    int start = 0;
                    while (start < previous.length() && start < text.length() && previous.charAt(start) == text.charAt(start)) start++;
                    int oldEnd = previous.length(), newEnd = text.length();
                    while (oldEnd > start && newEnd > start && previous.charAt(oldEnd - 1) == text.charAt(newEnd - 1)) { oldEnd--; newEnd--; }
                    document.replaceString(start, oldEnd, text.substring(start, newEnd));
                });
            } finally { ownChange = false; }
        }
        return Map.of("revision", Long.toString(document.getModificationStamp()));
    }
    private void open(String href) throws IOException {
        if (href.matches("(?i)^(https?://|mailto:).*")) { BrowserUtil.browse(href); return; }
        String path = URLDecoder.decode(href.split("[#?]", 2)[0], StandardCharsets.UTF_8);
        Path target = path.startsWith("/") ? root().resolve(path.substring(1)) : Paths.get(file.getPath()).getParent().resolve(path);
        if (!Files.exists(target) && !path.endsWith(".md")) target = Paths.get(target + ".md");
        VirtualFile virtual = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(allowed(target.toString()));
        if (virtual != null) FileEditorManager.getInstance(project).openFile(virtual, true);
    }
    private String saveImage(JsonObject m) throws IOException {
        String extension = arg(m, "extension").toLowerCase(Locale.ROOT);
        if (!Set.of("png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif").contains(extension)) throw new IOException(Messages.text("Unsupported image format"));
        Path note = allowed(file.getPath());
        String folder = file.getNameWithoutExtension() + ".assets";
        Path directory = note.getParent().resolve(folder);
        if (Files.exists(directory)) allowed(directory.toString());
        Files.createDirectories(directory);
        String name = "image-" + UUID.randomUUID() + "." + extension;
        Files.write(directory.resolve(name), Base64.getDecoder().decode(arg(m, "base64")), StandardOpenOption.CREATE_NEW);
        LocalFileSystem.getInstance().refreshAndFindFileByNioFile(directory);
        return folder + "/" + name;
    }
    private Object loadTemplate() throws IOException {
        PropertiesComponent settings = PropertiesComponent.getInstance(project);
        String stored = settings.getValue("merkzeug.templateDirectory");
        if (stored == null) return null;
        templateDirectory = Paths.get(stored).toRealPath();
        Map<String, Object> result = new HashMap<>();
        result.put("name", templateDirectory.getFileName().toString());
        for (String[] part : new String[][]{{"header", "kopfzeile.html"}, {"footer", "fusszeile.html"}, {"cover", "deckblatt.html"}, {"css", "stil.css"}}) {
            Path path = templateDirectory.resolve(part[1]);
            if (Files.exists(path)) {
                if (!path.toRealPath().startsWith(templateDirectory)) throw new IOException(Messages.text("Template file is outside the template folder"));
                result.put(part[0], inlineImages(Files.readString(path)));
            }
        }
        Map<String, Double> margins = new HashMap<>(Map.of("top",24.0,"bottom",18.0,"left",10.0,"right",10.0));
        Path config = templateDirectory.resolve("vorlage.json");
        if (Files.exists(config)) {
            JsonObject obj = JsonParser.parseString(Files.readString(config)).getAsJsonObject();
            if (obj.has("margins")) for (String side : List.of("top","bottom","left","right")) {
                JsonObject values = obj.getAsJsonObject("margins");
                if (values.has(side)) { double value = values.get(side).getAsDouble(); if (Double.isFinite(value) && value >= 0) margins.put(side, value); }
            }
        }
        if (Files.exists(config) || result.containsKey("header") || result.containsKey("footer")) result.put("margins", margins);
        return result;
    }
    private String inlineImages(String html) throws IOException {
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(?i)(src=[\"']|url\\([\"']?)([^\"')]+)");
        var matcher = pattern.matcher(html);
        StringBuffer output = new StringBuffer();
        while (matcher.find()) {
            String ref = matcher.group(2).trim();
            if (ref.matches("(?i)^(data:|https?:).*")) continue;
            Path image = templateDirectory.resolve(URLDecoder.decode(ref, StandardCharsets.UTF_8)).normalize().toRealPath();
            if (!image.startsWith(templateDirectory)) throw new IOException(Messages.text("Template image is outside the template folder"));
            String mime = mime(image.toString());
            if (!mime.startsWith("image/")) throw new IOException(Messages.text("Template resource is not an image"));
            matcher.appendReplacement(output, java.util.regex.Matcher.quoteReplacement(matcher.group(1) + "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(Files.readAllBytes(image))));
        }
        matcher.appendTail(output);
        return output.toString();
    }
    private int chooseExportScope(JsonObject message) throws IOException {
        var names = new ArrayList<String>();
        for (JsonElement item : message.getAsJsonArray("paths")) {
            Path linked = allowed(item.getAsString());
            names.add(root().relativize(linked).toString());
        }
        String description = Messages.text("Choose which documents to include in the PDF.")
            + "\n\n" + Messages.text("Linked documents:") + "\n" + String.join("\n", names);
        return com.intellij.openapi.ui.Messages.showDialog(project, description, Messages.text("Merkzeug: Export PDF"),
            new String[]{Messages.text("Only this document"), Messages.text("Include linked documents"), Messages.text("Cancel")},
            0, com.intellij.openapi.ui.Messages.getQuestionIcon());
    }
    public void requestPrint() {
        if (!disposed && pdfPayload == null) script("window.dispatchEvent(new Event('merkzeug-print'))");
    }
    private boolean beginExport(JsonObject m) throws IOException {
        if (pdfPayload != null) throw new IllegalStateException(Messages.text("A PDF export is already running"));
        printRequested = m.has("print") && m.get("print").getAsBoolean();
        if (printRequested) {
            pdfTarget = Files.createTempFile("merkzeug-print-", ".pdf");
            pdfPayload = m.getAsJsonObject("payload");
            browser.loadURL(origin + "index.html?pdf");
            return true;
        }
        var descriptor = new com.intellij.openapi.fileChooser.FileSaverDescriptor(Messages.text("Merkzeug: Export PDF"), "", "pdf");
        var chosen = com.intellij.openapi.fileChooser.FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
            .save(file.getParent(), file.getNameWithoutExtension() + ".pdf");
        if (chosen == null) return false;
        Path target = chosen.getFile().toPath().toAbsolutePath();
        if (!target.toString().toLowerCase(Locale.ROOT).endsWith(".pdf")) target = Paths.get(target + ".pdf");
        if (Files.exists(target) && JOptionPane.showConfirmDialog(panel, Messages.text("Replace the existing PDF?"), "Merkzeug", JOptionPane.YES_NO_OPTION) != JOptionPane.YES_OPTION) return false;
        pdfTarget = target;
        pdfPayload = m.getAsJsonObject("payload");
        browser.loadURL(origin + "index.html?pdf");
        return true;
    }
    private void printPdf(boolean landscape) {
        if (pdfPayload == null || pdfTarget == null) return;
        CefPdfPrintSettings settings = new CefPdfPrintSettings();
        settings.landscape = landscape;
        settings.print_background = true;
        settings.paper_width = 210.0 / 25.4;
        settings.paper_height = 297.0 / 25.4;
        settings.generate_document_outline = true;
        JsonElement template = pdfPayload.get("template");
        if (template != null && template.isJsonObject()) {
            JsonObject t = template.getAsJsonObject();
            if (t.has("header") || t.has("footer")) {
                settings.display_header_footer = true;
                settings.header_template = t.has("header") ? t.get("header").getAsString() : "<span></span>";
                settings.footer_template = t.has("footer") ? t.get("footer").getAsString() : "<span></span>";
            }
            if (t.has("margins")) {
                JsonObject margins = t.getAsJsonObject("margins");
                settings.margin_type = CefPdfPrintSettings.MarginType.CUSTOM;
                settings.margin_top = margins.get("top").getAsDouble() / 25.4;
                settings.margin_bottom = margins.get("bottom").getAsDouble() / 25.4;
                settings.margin_left = margins.get("left").getAsDouble() / 25.4;
                settings.margin_right = margins.get("right").getAsDouble() / 25.4;
            }
        }
        browser.getCefBrowser().printToPDF(pdfTarget.toString(), settings, (path, ok) -> ApplicationManager.getApplication().invokeLater(() -> finishPdf(ok ? null : Messages.text("Could not generate PDF"))));
    }
    private void finishPdf(String error) {
        Path printedFile = pdfTarget;
        boolean printing = printRequested;
        printRequested = false;
        String target = pdfTarget == null ? "" : pdfTarget.toString();
        pdfPayload = null;
        pdfTarget = null;
        browser.loadURL(origin + "index.html");
        if (error != null) {
            if (printing && printedFile != null) try { Files.deleteIfExists(printedFile); } catch (IOException ignored) { printedFile.toFile().deleteOnExit(); }
            JOptionPane.showMessageDialog(panel, error, "Merkzeug PDF", JOptionPane.ERROR_MESSAGE);
        }
        else if (printing) new PrintPreview(project, printedFile).show();
        else JOptionPane.showMessageDialog(panel, "PDF saved:\n" + target, "Merkzeug PDF", JOptionPane.INFORMATION_MESSAGE);
    }

    private CefResourceHandler resource(String url) {
        byte[] bytes;
        String type;
        int status = 200;
        try {
            URI uri = URI.create(url);
            String path = uri.getPath();
            if (path.equals("/image")) {
                String value = URLDecoder.decode(uri.getRawQuery().substring("path=".length()), StandardCharsets.UTF_8);
                Path image = allowed(value);
                type = mime(image.toString());
                if (!type.startsWith("image/")) throw new IOException(Messages.text("Not an image file"));
                bytes = Files.readAllBytes(image);
            } else {
                if (path.contains("..")) throw new IOException(Messages.text("Invalid resource path"));
                try (InputStream input = getClass().getResourceAsStream("/web" + path)) {
                    if (input == null) throw new FileNotFoundException(path);
                    bytes = input.readAllBytes();
                }
                if (path.equals("/index.html") && !"pdf".equals(uri.getQuery())) {
                    var initialTheme = theme();
                    String choice = initialTheme.get("choice").toString();
                    boolean dark = choice.equals("dark") || (choice.equals("system") && Boolean.TRUE.equals(initialTheme.get("dark")));
                    String meta = Base64.getEncoder().encodeToString(JSON.toJson(initialTheme).getBytes(StandardCharsets.UTF_8));
                    String html = new String(bytes, StandardCharsets.UTF_8).replace("<html>", "<html data-theme=\"" + (dark ? "dark" : "light") + "\">")
                        .replace("<head>", "<head><meta name=\"merkzeug-host-theme\" content=\"" + meta + "\">");
                    bytes = html.getBytes(StandardCharsets.UTF_8);
                }
                type = mime(path);
            }
        } catch (Exception e) { bytes = "Not found".getBytes(StandardCharsets.UTF_8); type = "text/plain"; status = 404; }
        final byte[] data = bytes;
        final String contentType = type;
        final int responseStatus = status;
        return new CefResourceHandlerAdapter() {
            private int offset;
            @Override public boolean processRequest(CefRequest request, CefCallback callback) { callback.Continue(); return true; }
            @Override public boolean open(CefRequest request, BoolRef handle, CefCallback callback) { handle.set(true); return true; }
            @Override public void getResponseHeaders(CefResponse response, IntRef length, StringRef redirect) {
                response.setStatus(responseStatus); response.setMimeType(contentType); length.set(data.length);
                response.setHeaderMap(Map.of("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'"));
            }
            private boolean copy(byte[] out, int count, IntRef read) {
                int size = Math.min(count, data.length - offset);
                if (size <= 0) { read.set(0); return false; }
                System.arraycopy(data, offset, out, 0, size); offset += size; read.set(size); return true;
            }
            @Override public boolean readResponse(byte[] out, int count, IntRef read, CefCallback callback) { return copy(out, count, read); }
            @Override public boolean read(byte[] out, int count, IntRef read, CefResourceReadCallback callback) { return copy(out, count, read); }
        };
    }
    private static String mime(String path) {
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "mp4" -> "video/mp4"; case "html" -> "text/html"; case "js" -> "application/javascript"; case "css" -> "text/css";
            case "svg" -> "image/svg+xml"; case "png" -> "image/png"; case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif"; case "webp" -> "image/webp"; case "bmp" -> "image/bmp"; case "avif" -> "image/avif";
            case "woff2" -> "font/woff2"; case "woff" -> "font/woff"; default -> "application/octet-stream";
        };
    }
    @Override public @NotNull JComponent getComponent() { return panel; }
    @Override public JComponent getPreferredFocusedComponent() { return browser.getComponent(); }
    @Override public @NotNull String getName() { return "Merkzeug"; }
    @Override public void setState(@NotNull FileEditorState state) { }
    @Override public boolean isModified() { return FileDocumentManager.getInstance().isDocumentUnsaved(document); }
    @Override public boolean isValid() { return !disposed && file.isValid(); }
    @Override public Collection<DocumentReference> getDocumentReferences() { return List.of(DocumentReferenceManager.getInstance().create(document)); }
    @Override public VirtualFile getFile() { return file; }
    @Override public void addPropertyChangeListener(@NotNull PropertyChangeListener listener) { changes.addPropertyChangeListener(listener); }
    @Override public void removePropertyChangeListener(@NotNull PropertyChangeListener listener) { changes.removePropertyChangeListener(listener); }
    @Override public void dispose() { disposed = true; }
}
