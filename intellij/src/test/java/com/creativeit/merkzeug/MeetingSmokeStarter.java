package com.creativeit.merkzeug;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.actionSystem.impl.SimpleDataContext;
import com.intellij.openapi.application.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.vfs.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

/** Test-only headless starter: New-menu action and meeting bridge in JCEF, without windows or keychain access. */
public final class MeetingSmokeStarter implements ApplicationStarter {
    private static final Path root = Paths.get(System.getProperty("merkzeug.smoke.root"));
    private static void log(String m) { try { Files.writeString(root.resolve("probe.log"), m + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND); } catch (Exception ignored) { } }
    private static void check(boolean ok, String what) { log((ok ? "PASS " : "FAIL ") + what); if (!ok) System.exit(3); }
    @Override public boolean isHeadless() { return true; }
    @Override public int getRequiredModality() { return NOT_IN_EDT; }
    @Override public void main(List<String> args) {
        try {
            Path project0 = root.resolve("vault");
            com.intellij.ide.trustedProjects.TrustedProjects.setProjectTrusted(project0, true);
            Project project = com.intellij.openapi.project.ex.ProjectManagerEx.getInstanceEx().openProject(project0, com.intellij.ide.impl.OpenProjectTask.build().asNewProject());
            ApplicationManager.getApplication().invokeAndWait(() -> {
                try { run(project, project0); } catch (Throwable t) { log("ERROR " + t); for (var s : t.getStackTrace()) log("  " + s); System.exit(1); }
            }, ModalityState.any());
        } catch (Throwable t) { log("ERROR " + t); System.exit(1); }
    }
    private static void run(Project project, Path vault) throws Exception {
        AnAction action = ActionManager.getInstance().getAction("Merkzeug.NewMeetingNote");
        check(action != null, "action registered");
        var newGroup = (DefaultActionGroup) ActionManager.getInstance().getAction("NewGroup");
        check(Arrays.asList(newGroup.getChildActionsOrStubs()).stream().anyMatch(a -> a == action || ActionManager.getInstance().getId(a) != null && ActionManager.getInstance().getId(a).equals("Merkzeug.NewMeetingNote")), "action in New group");
        Path folder = vault.resolve("Projekte/Kunde A");
        VirtualFile vFolder = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(folder);
        VirtualFile vNote = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(folder.resolve("Plan.md"));
        for (var entry : List.of(Map.entry(vFolder, true), Map.entry(vNote, true))) {
            DataContext context = SimpleDataContext.builder().add(CommonDataKeys.PROJECT, project).add(CommonDataKeys.VIRTUAL_FILE, entry.getKey()).build();
            AnActionEvent event = AnActionEvent.createFromDataContext("ProjectViewPopup", null, context);
            action.update(event);
            check(event.getPresentation().isEnabledAndVisible() == entry.getValue(), "enabled for " + entry.getKey().getName() + " text=" + event.getPresentation().getText());
        }
        AnActionEvent none = AnActionEvent.createFromDataContext("MainMenu", null, SimpleDataContext.getProjectContext(project));
        action.update(none);
        check(!none.getPresentation().isEnabledAndVisible(), "hidden without folder");

        AtomicReference<Path> opened = new AtomicReference<>();
        boolean[] closed = {false};
        MeetingPanel panel = new MeetingPanel(project, folder, opened::set, () -> closed[0] = true);
        var browser = panel.browser();
        browser.getComponent().setSize(560, 640);
        browser.getCefBrowser().getUIComponent().setSize(560, 640);
        browser.getCefBrowser().createImmediately();
        browser.getJBCefClient().getCefClient().addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
            @Override public boolean onConsoleMessage(org.cef.browser.CefBrowser b, org.cef.CefSettings.LogSeverity level, String message, String source, int line) {
                if (message.startsWith("PROBE") || level == org.cef.CefSettings.LogSeverity.LOGSEVERITY_ERROR) log("JS " + message); return false;
            }
        });
        long now = System.currentTimeMillis() + 3600_000L;
        String stamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd'T'HH0000'Z'").withZone(java.time.ZoneOffset.UTC).format(java.time.Instant.ofEpochMilli(now));
        String ics = "BEGIN:VCALENDAR\\r\\nVERSION:2.0\\r\\nBEGIN:VEVENT\\r\\nUID:ij-fixture\\r\\nDTSTART:" + stamp + "\\r\\nDURATION:PT1H\\r\\nSUMMARY:Fixture Abstimmung\\r\\nORGANIZER;CN=Ada:mailto:ada@example.com\\r\\nEND:VEVENT\\r\\nEND:VCALENDAR\\r\\n";
        int[] step = {0};
        String[] stage = {"load"};
        new javax.swing.Timer(500, ev -> {
            step[0]++;
            if (step[0] > 120) { log("FAIL timeout in stage " + stage[0]); System.exit(2); }
            if (opened.get() != null && stage[0].equals("click")) {
                Path note = opened.get();
                try {
                    check(note.getParent().equals(folder.toRealPath()), "note created in chosen folder: " + vault.relativize(note));
                    String text = Files.readString(note);
                    check(text.contains("calendar-event") && text.contains("# Fixture Abstimmung"), "note content from event");
                } catch (Exception e) { log("FAIL " + e); System.exit(3); }
                opened.set(null);
                stage[0] = "again";
                browser.getCefBrowser().executeJavaScript("document.querySelector('.meeting-events button').click()", "", 0);
                return;
            }
            if (opened.get() != null && stage[0].equals("again")) {
                try (var files = Files.list(folder)) {
                    check(files.filter(p -> p.getFileName().toString().startsWith("Fixture")).count() == 1, "same event reopens the existing note");
                } catch (Exception e) { System.exit(3); }
                stage[0] = "escape";
                browser.getCefBrowser().executeJavaScript("""
                  (async () => {
                    const outside = await new Promise(r => { const id = 990001; window.__merkzeugReplyOrig = window.__merkzeugReply; window.__merkzeugReply = (i, v, e) => { if (i === id) r(e); else window.__merkzeugReplyOrig(i, v, e) }; window.__merkzeugSend(JSON.stringify({ id, method: 'meetingCreate', path: '/tmp/merkzeug-escape.md', content: 'x' })) })
                    console.log('PROBE escape ' + (outside ? 'rejected' : 'ALLOWED'))
                    const list = await new Promise(r => { const id = 990002; window.__merkzeugReply = (i, v, e) => { if (i === id) r(v); else window.__merkzeugReplyOrig(i, v, e) }; window.__merkzeugSend(JSON.stringify({ id, method: 'calendarList', from: Date.now(), to: Date.now() + 1e9 })) })
                    console.log('PROBE calendarList ' + JSON.stringify(list))
                    document.querySelector('.meeting-sheet header button').click()
                  })()""", "", 0);
                return;
            }
            if (stage[0].equals("escape")) {
                if (closed[0]) { check(!Files.exists(Paths.get("/tmp/merkzeug-escape.md")), "no file outside project"); log("DONE"); System.exit(0); }
                return;
            }
            String js = switch (stage[0]) {
                case "load" -> "(() => { const input = document.querySelector('input[type=file]'); if (!input || window.imported) return; window.imported = true; console.log('PROBE ready ' + document.querySelector('.meeting-sheet header button').textContent);"
                    + " document.querySelector('.meeting-sheet summary')?.click();"
                    + " const dt = new DataTransfer(); dt.items.add(new File(['" + ics + "'], 'fixture.ics', { type: 'text/calendar' })); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()";
                case "imported" -> "(() => { const b = [...document.querySelectorAll('.meeting-events button')].find(b => b.textContent.includes('Fixture Abstimmung')); if (!b || window.clicked) return; window.clicked = true; b.click(); })()";
                default -> "";
            };
            browser.getCefBrowser().executeJavaScript(js, "", 0);
            if (stage[0].equals("load") && step[0] > 6) stage[0] = "imported";
            else if (stage[0].equals("imported")) stage[0] = "click";
        }).start();
    }
}
