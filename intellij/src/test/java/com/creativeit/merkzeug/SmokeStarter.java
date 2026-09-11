package com.creativeit.merkzeug;

import com.google.gson.*;
import com.intellij.openapi.application.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.vfs.*;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.editor.Document;
import com.intellij.ui.jcef.*;
import java.nio.file.*;
import java.util.*;
import javax.swing.*;

/** Test-only starter; never included in the distributable plugin. */
public final class SmokeStarter implements ApplicationStarter {
    @Override public boolean isHeadless() { return false; }
    @Override public int getRequiredModality() { return NOT_IN_EDT; }
    @Override public void main(List<String> args) {
        Path test = Paths.get(System.getProperty("merkzeug.smoke.root"));
        com.intellij.ide.trustedProjects.TrustedProjects.setProjectTrusted(test, true);
        Project project = com.intellij.openapi.project.ex.ProjectManagerEx.getInstanceEx().openProject(test,
            com.intellij.ide.impl.OpenProjectTask.build().asNewProject().withForceOpenInNewFrame(true));
        if (project == null) throw new AssertionError("Test project failed to open");
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(test.resolve("index.md"));
                if (file == null) throw new AssertionError("Fixture not found");
                MerkzeugEditor editor = new MerkzeugEditor(project, file);
                JFrame window = new JFrame("Merkzeug integration test");
                window.setContentPane(editor.getComponent()); window.setSize(1050, 900); window.setVisible(true);
                var browserField = MerkzeugEditor.class.getDeclaredField("browser"); browserField.setAccessible(true);
                JBCefBrowser browser = (JBCefBrowser) browserField.get(editor);
                var statusReady = new java.util.concurrent.atomic.AtomicBoolean(false);
                browser.getJBCefClient().getCefClient().addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
                    @Override public boolean onConsoleMessage(org.cef.browser.CefBrowser b, org.cef.CefSettings.LogSeverity level, String message, String source, int line) {
                        if ("MERKZEUG_INITIAL_READY".equals(message)) statusReady.set(true);
                        System.out.println("MERKZEUG_BROWSER " + level + " " + message); return false;
                    }
                });
                javax.swing.Timer statusTimer = new javax.swing.Timer(500, event -> {
                    browser.getCefBrowser().executeJavaScript("(() => { const status = document.querySelector('.status')?.textContent; if (document.querySelector('.ProseMirror') && ['Synced with IntelliJ', 'Mit IntelliJ synchronisiert'].includes(status)) { console.log('MERKZEUG_INITIAL_READY'); } })()", browser.getCefBrowser().getURL(), 0);
                    if (statusReady.get()) ((javax.swing.Timer) event.getSource()).stop();
                });
                statusTimer.start();
                var dispatch = MerkzeugEditor.class.getDeclaredMethod("dispatch", JsonObject.class); dispatch.setAccessible(true);
                Document document = FileDocumentManager.getInstance().getDocument(file);
                com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider.allowWriting(List.of(file));
                String original = document.getText();
                JsonObject write = new JsonObject(); write.addProperty("id", 9000); write.addProperty("method", "write"); write.addProperty("path", file.getPath()); write.addProperty("revision", Long.toString(document.getModificationStamp())); write.addProperty("text", original + "\nNative document synchronization verified.\n");
                dispatch.invoke(editor, write);
                if (!document.getText().contains("synchronization verified")) throw new AssertionError("Document write failed");
                String edited = document.getText();
                write.addProperty("text", "STALE DATA MUST NEVER WIN"); dispatch.invoke(editor, write);
                if (!document.getText().equals(edited)) throw new AssertionError("Stale edit overwrote document");
                var undo = com.intellij.openapi.command.undo.UndoManager.getInstance(project);
                if (!undo.isUndoAvailable(editor)) throw new AssertionError("Undo not available");
                undo.undo(editor);
                if (!document.getText().equals(original)) throw new AssertionError("Undo failed");
                if (!undo.isRedoAvailable(editor)) throw new AssertionError("Redo not available");
                undo.redo(editor);
                if (!document.getText().equals(edited)) throw new AssertionError("Redo failed");
                FileDocumentManager.getInstance().saveDocument(document);
                if (!Files.readString(test.resolve("index.md")).equals(edited)) throw new AssertionError("Save failed");
                System.out.println("MERKZEUG_SMOKE document-write, stale-revision, undo, redo and save passed");
                javax.swing.Timer timer = new javax.swing.Timer(500, e -> {
                    try {
                        if (!statusReady.get()) return;
                        ((javax.swing.Timer) e.getSource()).stop();
                        JsonObject payload = JsonParser.parseString(Files.readString(test.resolve("payload.json"))).getAsJsonObject();
                        var payloadField = MerkzeugEditor.class.getDeclaredField("pdfPayload"); payloadField.setAccessible(true); payloadField.set(editor, payload);
                        var targetField = MerkzeugEditor.class.getDeclaredField("pdfTarget"); targetField.setAccessible(true); targetField.set(editor, test.resolve("actual.pdf"));
                        var originField = MerkzeugEditor.class.getDeclaredField("origin"); originField.setAccessible(true);
                        browser.loadURL(originField.get(editor) + "index.html?pdf");
                    } catch (Exception error) { error.printStackTrace(); System.exit(1); }
                });
                timer.start();
                ApplicationManager.getApplication().executeOnPooledThread(() -> {
                    try {
                        for (int n = 0; n < 120; n++) {
                            Thread.sleep(1000);
                            Path pdf = test.resolve("actual.pdf");
                            if (Files.exists(pdf) && Files.size(pdf) > 1000) {
                                System.out.println("MERKZEUG_SMOKE PDF written: " + Files.size(pdf));
                                Files.writeString(test.resolve("passed.txt"), "Document write, stale revision rejection, undo, redo, JCEF PDF export passed\n");
                                System.exit(0);
                            }
                        }
                        System.err.println("MERKZEUG_SMOKE timeout"); System.exit(1);
                    } catch (Exception error) { error.printStackTrace(); System.exit(1); }
                });
            } catch (Throwable error) { error.printStackTrace(); System.exit(1); }
        });
    }
}
