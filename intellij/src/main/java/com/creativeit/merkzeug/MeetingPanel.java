package com.creativeit.merkzeug;

import com.google.gson.*;
import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.ide.passwordSafe.PasswordSafe;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.ui.jcef.*;
import org.cef.browser.*;
import org.cef.handler.*;
import javax.swing.JComponent;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** Shared meeting-note picker in JCEF: calendar sources, classic Outlook on Windows, notes inside the project. */
final class MeetingPanel implements Disposable {
    private static final Gson JSON = new Gson();
    private static final CredentialAttributes SOURCES = new CredentialAttributes("Merkzeug calendar sources");
    private final Path folder;
    private final Path root;
    private final JBCefBrowser browser;
    private final JBCefJSQuery query;
    private final String origin = "https://merkzeug-" + UUID.randomUUID() + ".local/";
    private final Consumer<Path> onOpen;
    private final Runnable onClose;
    private volatile boolean disposed;

    MeetingPanel(Project project, Path folder, Consumer<Path> onOpen, Runnable onClose) throws IOException {
        this.folder = folder.toRealPath();
        Path base = project.getBasePath() == null ? null : Paths.get(project.getBasePath()).toRealPath();
        this.root = base != null && this.folder.startsWith(base) ? base : this.folder;
        this.onOpen = onOpen;
        this.onClose = onClose;
        browser = new JBCefBrowser();
        Disposer.register(this, browser);
        query = JBCefJSQuery.create((JBCefBrowserBase) browser);
        Disposer.register(this, query);
        query.addHandler(json -> {
            try {
                JsonObject message = JsonParser.parseString(json).getAsJsonObject();
                ApplicationManager.getApplication().executeOnPooledThread(() -> dispatch(message));
            } catch (RuntimeException ignored) { }
            return null;
        });
        WebAssets.install(browser, origin, null);
        browser.getJBCefClient().getCefClient().addLoadHandler(new CefLoadHandlerAdapter() {
            @Override public void onLoadEnd(CefBrowser b, CefFrame frame, int status) {
                if (!frame.isMain() || !frame.getURL().startsWith(origin)) return;
                script("window.__merkzeugSend = function(message) {" + query.inject("message") + "}; window.dispatchEvent(new Event('merkzeug-ready')); ");
            }
        });
        browser.loadURL(origin + "index.html?meeting");
    }

    JComponent getComponent() { return browser.getComponent(); }
    JBCefBrowser browser() { return browser; }

    private void script(String code) {
        if (!disposed) browser.getCefBrowser().executeJavaScript(code, origin, 0);
    }
    private void reply(int id, Object value, String error) {
        script("window.__merkzeugReply?.(" + id + "," + JSON.toJson(value) + "," + JSON.toJson(error) + ")");
    }
    private static String arg(JsonObject m, String key) { return m.has(key) && !m.get(key).isJsonNull() ? m.get(key).getAsString() : ""; }
    private static String slashes(Path path) { return path.toString().replace('\\', '/'); }

    /** Runs on a pooled thread: calendar helpers, downloads and the credential store may block. */
    private void dispatch(JsonObject m) {
        int id = m.get("id").getAsInt();
        if (disposed) return;
        try {
            Object result = switch (arg(m, "method")) {
                case "init" -> Map.of("folder", slashes(folder), "locale", Locale.getDefault().toLanguageTag(), "theme", WebAssets.theme());
                case "calendarSourcesLoad" -> PasswordSafe.getInstance().getPassword(SOURCES);
                case "calendarSourcesSave" -> { PasswordSafe.getInstance().setPassword(SOURCES, arg(m, "value")); yield true; }
                case "calendarFetch" -> fetch(arg(m, "url"));
                case "calendarList" -> SystemInfo.isWindows ? outlook("list", Long.toString(m.get("from").getAsLong() / 1000), Long.toString((m.get("to").getAsLong() + 999) / 1000)) : null;
                case "calendarDetail" -> SystemInfo.isWindows ? outlook("detail", arg(m, "id"), arg(m, "start")) : null;
                case "meetingList" -> {
                    Path dir = inside(arg(m, "folder"));
                    try (var entries = Files.list(dir)) {
                        yield entries.filter(Files::isRegularFile).map(MeetingPanel::slashes).toList();
                    }
                }
                case "read" -> Files.readString(note(arg(m, "path")));
                case "exists" -> Files.exists(inside(arg(m, "path")), LinkOption.NOFOLLOW_LINKS);
                case "meetingCreate" -> {
                    Path target = note(arg(m, "path"));
                    Files.writeString(target, arg(m, "content"), StandardOpenOption.CREATE_NEW);
                    LocalFileSystem.getInstance().refreshAndFindFileByNioFile(target);
                    yield true;
                }
                case "meetingOpen" -> {
                    Path target = note(arg(m, "path"));
                    ApplicationManager.getApplication().invokeLater(() -> onOpen.accept(target));
                    yield true;
                }
                case "meetingClose" -> { ApplicationManager.getApplication().invokeLater(onClose); yield true; }
                default -> throw new IllegalArgumentException(Messages.text("Unknown action"));
            };
            reply(id, result, null);
        } catch (Exception error) {
            reply(id, null, Objects.toString(error.getMessage(), error.toString()));
        }
    }

    /** Paths below the project root (or the chosen folder outside a project); symbolic links are not followed out. */
    private Path inside(String value) throws IOException {
        Path candidate = Paths.get(value).toAbsolutePath().normalize();
        Path parent = candidate.getParent();
        if (parent == null) throw new IOException(Messages.text("File is outside the open project: ") + value);
        Path real = Files.exists(candidate) ? candidate.toRealPath() : parent.toRealPath().resolve(candidate.getFileName());
        if (!real.startsWith(root)) throw new IOException(Messages.text("File is outside the open project: ") + candidate.getFileName());
        return real;
    }
    private Path note(String value) throws IOException {
        Path path = inside(value);
        if (!path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".md")) throw new IOException(Messages.text("Unknown action"));
        return path;
    }

    private static String fetch(String raw) throws IOException {
        URI uri = URI.create(raw);
        if (!"https".equals(uri.getScheme()) || uri.getUserInfo() != null) throw new IOException("Use an HTTPS subscription URL");
        try {
            var client = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(20)).followRedirects(java.net.http.HttpClient.Redirect.NORMAL).build();
            var request = java.net.http.HttpRequest.newBuilder(uri).timeout(java.time.Duration.ofSeconds(20)).build();
            var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofInputStream());
            try (var input = response.body()) {
                byte[] bytes = input.readNBytes(2_000_001);
                if (response.statusCode() != 200 || bytes.length > 2_000_000) throw new IOException("Invalid calendar response");
                return new String(bytes, StandardCharsets.UTF_8);
            }
        } catch (Exception error) { throw new IOException(Messages.text("Calendar download failed. Check the subscription URL and network connection.")); }
    }

    private static Path outlookScript;
    /** Classic Outlook via the desktop app's PowerShell helper; returns its JSON for the shared parser. */
    private static String outlook(String... args) throws IOException, InterruptedException {
        synchronized (MeetingPanel.class) {
            if (outlookScript == null) {
                try (InputStream input = MeetingPanel.class.getResourceAsStream("/calendar/merkzeug-calendar.ps1")) {
                    if (input == null) throw new IOException(Messages.text("Calendar helper is missing."));
                    Path script = Files.createTempFile("merkzeug-calendar-", ".ps1");
                    script.toFile().deleteOnExit();
                    Files.write(script, input.readAllBytes());
                    outlookScript = script;
                }
            }
        }
        String powershell = Paths.get(Objects.requireNonNullElse(System.getenv("SystemRoot"), "C:\\Windows"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe").toString();
        List<String> command = new ArrayList<>(List.of(powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", outlookScript.toString()));
        command.addAll(List.of(args));
        Process process = new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.DISCARD).start();
        byte[] out;
        try (InputStream input = process.getInputStream()) { out = input.readAllBytes(); }
        // generous timeout: Outlook may need to start or show its security prompt
        if (!process.waitFor(180, TimeUnit.SECONDS)) { process.destroyForcibly(); throw new IOException(Messages.text("Could not load calendar events.")); }
        String stdout = new String(out, StandardCharsets.UTF_8).replaceFirst("^\uFEFF", "");
        if (stdout.isBlank()) throw new IOException(Messages.text("Could not load calendar events."));
        return stdout;
    }

    @Override public void dispose() { disposed = true; }
}
