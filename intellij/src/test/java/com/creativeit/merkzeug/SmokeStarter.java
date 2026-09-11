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
                var settings = new MerkzeugSettings(project);
                settings.createComponent();
                if (settings.isModified()) throw new AssertionError("Fresh settings are modified");
                var folderField = MerkzeugSettings.class.getDeclaredField("folder"); folderField.setAccessible(true);
                var folderInput = (com.intellij.openapi.ui.TextFieldWithBrowseButton) folderField.get(settings);
                folderInput.setText(test.toString());
                if (!settings.isModified()) throw new AssertionError("Settings edit not detected");
                settings.apply();
                if (!test.toString().equals(com.intellij.ide.util.PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory"))) throw new AssertionError("Project template not stored");
                folderInput.setText(test.resolve("missing-template-directory").toString());
                try { settings.apply(); throw new AssertionError("Missing template directory accepted"); }
                catch (com.intellij.openapi.options.ConfigurationException expected) { }
                settings.reset();
                if (!folderInput.getText().equals(test.toString())) throw new AssertionError("Settings reset failed");
                folderInput.setText("");
                settings.apply();
                if (com.intellij.ide.util.PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory") != null) throw new AssertionError("Template not cleared");
                settings.disposeUIResources();
                System.out.println("MERKZEUG_SMOKE project settings lifecycle passed");
                Files.writeString(test.resolve("AGENTS.md"), "# Project instructions\nFollow project conventions.\n");
                Files.writeString(test.resolve("CLAUDE.md"), "See AGENTS.md for all instructions.\n");
                for (String name : List.of("AGENTS.md", "CLAUDE.md")) {
                    var instructionFile = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(test.resolve(name));
                    com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider.allowWriting(List.of(instructionFile));
                }
                MerkzeugEditor editor = new MerkzeugEditor(project, file);
                var scopeMethod = MerkzeugEditor.class.getDeclaredMethod("chooseExportScope", JsonObject.class);
                scopeMethod.setAccessible(true);
                JsonObject scopeRequest = new JsonObject();
                var linkedPaths = new com.google.gson.JsonArray(); linkedPaths.add(file.getPath());
                scopeRequest.add("paths", linkedPaths);
                String[] scopeLabels = {"Only this document", "Include linked documents", "Cancel"};
                for (int choice = 0; choice < scopeLabels.length; choice++) {
                    String label = Messages.text(scopeLabels[choice]);
                    javax.swing.Timer click = new javax.swing.Timer(150, event -> {
                        for (java.awt.Window dialog : java.awt.Window.getWindows()) {
                            if (dialog instanceof javax.swing.JDialog && dialog.isShowing() && clickButton((java.awt.Container) dialog, label)) {
                                ((javax.swing.Timer) event.getSource()).stop(); break;
                            }
                        }
                    });
                    click.start();
                    int actual;
                    try { actual = (Integer) scopeMethod.invoke(editor, scopeRequest); }
                    finally { click.stop(); }
                    if (actual != choice) throw new AssertionError("Wrong PDF scope choice: " + actual);
                }
                System.out.println("MERKZEUG_SMOKE native PDF scope choices and cancellation passed");
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
                    browser.getCefBrowser().executeJavaScript("(() => { const status = document.querySelector('.status')?.textContent; if (document.querySelectorAll('.format-toolbar > button').length === 13 && document.querySelectorAll('.format-toolbar details').length === 2 && !document.querySelector('.theme-select, .meeting-notes') && document.querySelector('.ProseMirror') && ['Synced with IntelliJ', 'Mit IntelliJ synchronisiert'].includes(status)) { console.log('MERKZEUG_INITIAL_READY'); } })()", browser.getCefBrowser().getURL(), 0);
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
                        if (!Files.readString(test.resolve("AGENTS.md")).contains("## Merkzeug:")) {
                            browser.getCefBrowser().executeJavaScript("""
                                (() => {
                                  if (!document.querySelector('.editor-extras')) { document.querySelector('button[aria-label="Merkzeug"]').click(); return; }
                                  const actions = [...document.querySelectorAll('.editor-extra-actions > button, .editor-extra-actions .tour-tools > button')];
                                  if (actions.length !== 3 || actions.some(b => Math.abs(b.getBoundingClientRect().top - actions[0].getBoundingClientRect().top) > 1 || getComputedStyle(b).fontSize !== getComputedStyle(actions[0]).fontSize)) throw new Error('Extra actions are not aligned or use different font sizes');
                                  if (document.querySelector('.vault-guidance').getBoundingClientRect().top < actions[0].getBoundingClientRect().bottom) throw new Error('Guidance must occupy its own row');
                                  const dialog = document.querySelector('.guidance-dialog');
                                  if (!dialog) { document.querySelector('.vault-guidance > button')?.click(); return; }
                                  const boxes = dialog.querySelectorAll('input[type=checkbox]');
                                  const add = [...dialog.querySelectorAll('button')].find(b => ['Add', 'Hinzufügen'].includes(b.textContent));
                                  if (!window.guidanceTestSelected) {
                                    if (boxes.length !== 2 || [...boxes].some(b => b.checked) || !add.disabled || dialog.querySelectorAll('pre').length !== 3 || !dialog.textContent.includes('See AGENTS.md for all instructions.')) throw new Error('Guidance preview or defaults incorrect');
                                    boxes[0].click(); window.guidanceTestSelected = true; return;
                                  }
                                  if (boxes[0].checked && !boxes[1].checked && !add.disabled) add.click();
                                })()
                                """, browser.getCefBrowser().getURL(), 0);
                            return;
                        }
                        if (!Files.readString(test.resolve("CLAUDE.md")).equals("See AGENTS.md for all instructions.\n")) throw new AssertionError("Unselected CLAUDE.md was modified");
                        System.out.println("MERKZEUG_SMOKE guidance preview and explicit AGENTS-only selection passed");
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
    private static boolean clickButton(java.awt.Container container, String label) {
        for (java.awt.Component component : container.getComponents()) {
            if (component instanceof javax.swing.JButton button && label.equals(button.getText())) { button.doClick(); return true; }
            if (component instanceof java.awt.Container child && clickButton(child, label)) return true;
        }
        return false;
    }

}
