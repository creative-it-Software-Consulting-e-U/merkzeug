package com.creativeit.merkzeug;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ApplicationStarter;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.ui.jcef.JBCefBrowser;
import java.nio.file.*;
import java.util.List;
import javax.swing.*;
import com.google.gson.JsonParser;

/** Isolated real IDE showcase. Commands and screenshots contain only synthetic fixture data. */
public final class MarketplaceCaptureStarter implements ApplicationStarter {
    private static void clickButton(java.awt.Container parent, String label) {
        for(var child:parent.getComponents()) { if(child instanceof javax.swing.AbstractButton button && label.equals(button.getText())) { button.doClick(); return; } if(child instanceof java.awt.Container container) clickButton(container,label); }
    }
    @Override public boolean isHeadless() { return false; }
    @Override public int getRequiredModality() { return NOT_IN_EDT; }
    @Override public void main(List<String> args) {
        java.util.Locale.setDefault(java.util.Locale.ENGLISH);
        Path root = Path.of(System.getProperty("merkzeug.capture.root"));
        Path output = Path.of(System.getProperty("merkzeug.capture.output"));
        com.intellij.ide.trustedProjects.TrustedProjects.setProjectTrusted(root, true);
        var project = com.intellij.openapi.project.ex.ProjectManagerEx.getInstanceEx().openProject(root,
            com.intellij.ide.impl.OpenProjectTask.build().asNewProject().withForceOpenInNewFrame(true));
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                var laf = com.intellij.ide.ui.LafManager.getInstance();
                laf.setAutodetect(false);
                laf.setCurrentLookAndFeel(laf.getDefaultDarkLaf(), false); laf.updateUI();
                System.out.println("CAPTURE_THEME " + laf.getCurrentUIThemeLookAndFeel().getName());
                var file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(root.resolve("Project plan.md"));
                if (project == null || file == null) throw new AssertionError("Capture fixture unavailable");
                ApplicationManager.getApplication().runWriteAction(() -> {
                    var module = com.intellij.openapi.module.ModuleManager.getInstance(project).newModule(root.resolve("Showcase.iml"), "EMPTY_MODULE");
                    var model = com.intellij.openapi.roots.ModuleRootManager.getInstance(module).getModifiableModel();
                    model.addContentEntry(file.getParent()); model.commit();
                });
                var properties = com.intellij.ide.util.PropertiesComponent.getInstance(project);
                properties.setValue("merkzeug.templateDirectory", root.resolve("Template").toString());
                var manager = FileEditorManager.getInstance(project);
                manager.openFile(file, true);
                manager.setSelectedEditor(file, "merkzeug-editor");
                MerkzeugEditor editor = null;
                for (var candidate : manager.getEditors(file)) if (candidate instanceof MerkzeugEditor m) editor = m;
                if (editor == null) throw new AssertionError("Merkzeug editor unavailable");
                final var capturedEditor = editor;
                var browserField = MerkzeugEditor.class.getDeclaredField("browser"); browserField.setAccessible(true);
                var browser = (JBCefBrowser) browserField.get(editor);
                var frame = com.intellij.openapi.wm.WindowManager.getInstance().getFrame(project);
                frame.setSize(1440, 960); frame.setLocation(30, 30);
                var projectWindow = com.intellij.openapi.wm.ToolWindowManager.getInstance(project).getToolWindow("Project");
                projectWindow.show(() -> ((com.intellij.openapi.wm.ex.ToolWindowEx)projectWindow).stretchWidth(260-projectWindow.getComponent().getWidth()));
                browser.getJBCefClient().getCefClient().addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
                    @Override public boolean onConsoleMessage(org.cef.browser.CefBrowser b, org.cef.CefSettings.LogSeverity severity, String message, String source, int line) {
                        if (message.startsWith("CAPTURE")) System.out.println(message);
                        return false;
                    }
                });
                Files.deleteIfExists(output.resolve("command.json"));
                Files.writeString(output.resolve("ready.txt"), "ready");
                new Timer(500, e -> {
                    try {
                        Path command = output.resolve("command.json");
                        if (!Files.exists(command)) return;
                        var c = JsonParser.parseString(Files.readString(command)).getAsJsonObject(); Files.delete(command);
                        String action = c.get("action").getAsString();
                        switch (action) {
                            case "js" -> browser.getCefBrowser().executeJavaScript(c.get("script").getAsString(), browser.getCefBrowser().getURL(), 0);
                            case "capture" -> {
                                frame.setTitle("Merkzeug Showcase");
                                for (var window : java.awt.Window.getWindows()) if (window instanceof java.awt.Dialog dialog && dialog.isVisible()) dialog.setTitle("Merkzeug Showcase");
                                var process = new ProcessBuilder(System.getProperty("merkzeug.capture.helper"), Long.toString(ProcessHandle.current().pid()), output.resolve(c.get("name").getAsString()).toString()).inheritIO().start();
                                if (process.waitFor()!=0) throw new AssertionError("Window capture failed");
                            }
                            case "source" -> {
                                for (var provider : com.intellij.openapi.fileEditor.ex.FileEditorManagerEx.getInstanceEx(project).getEditorsWithProviders(file).second) {
                                    if (!provider.getEditorTypeId().equals("merkzeug-editor")) { manager.setSelectedEditor(file, provider.getEditorTypeId()); System.out.println("CAPTURE_SOURCE "+provider.getEditorTypeId());break; }
                                }
                            }
                            case "visual" -> manager.setSelectedEditor(file, "merkzeug-editor");
                            case "rename" -> {
                                com.intellij.openapi.application.WriteIntentReadAction.run(() -> {
                                    var psi = com.intellij.psi.PsiManager.getInstance(project).findFile(file);
                                    new com.intellij.refactoring.rename.RenameProcessor(project, psi, "Release plan.md", false, false).run();
                                });
                            }
                            case "click" -> ApplicationManager.getApplication().invokeLater(() -> { for (var window : java.awt.Window.getWindows()) if (window.isVisible()) clickButton(window,c.get("label").getAsString()); });
                            case "settings" -> com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(project,"Merkzeug");
                            case "pdf" -> {
                                var payloadField = MerkzeugEditor.class.getDeclaredField("pdfPayload");payloadField.setAccessible(true);payloadField.set(capturedEditor,c.getAsJsonObject("payload"));
                                var targetField = MerkzeugEditor.class.getDeclaredField("pdfTarget");targetField.setAccessible(true);targetField.set(capturedEditor, output.resolve("Project plan.pdf"));
                                var originField = MerkzeugEditor.class.getDeclaredField("origin");originField.setAccessible(true);
                                browser.loadURL(originField.get(capturedEditor)+"index.html?pdf");
                            }
                            case "tree" -> {
                                var view = com.intellij.ide.projectView.ProjectView.getInstance(project);
                                view.select(file, file, false);
                            }
                            case "stop" -> System.exit(0);
                        }
                        Files.writeString(output.resolve("done.txt"),action);
                    } catch (Throwable error) { error.printStackTrace(); System.exit(1); }
                }).start();
            } catch (Throwable error) { error.printStackTrace(); System.exit(1); }
        });
    }
}
