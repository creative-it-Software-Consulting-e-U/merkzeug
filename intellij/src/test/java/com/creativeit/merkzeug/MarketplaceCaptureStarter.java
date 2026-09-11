package com.creativeit.merkzeug;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ApplicationStarter;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.ui.jcef.JBCefBrowser;
import java.nio.file.*;
import java.util.List;
import javax.swing.*;

/** Capture actual JCEF editor pixels from a synthetic notebook in an isolated IDE. */
public final class MarketplaceCaptureStarter implements ApplicationStarter {
    @Override public boolean isHeadless() { return false; }
    @Override public int getRequiredModality() { return NOT_IN_EDT; }
    @Override public void main(List<String> args) {
        java.util.Locale.setDefault(java.util.Locale.ENGLISH);
        Path root = Path.of(System.getProperty("merkzeug.capture.root"));
        com.intellij.ide.trustedProjects.TrustedProjects.setProjectTrusted(root, true);
        var project = com.intellij.openapi.project.ex.ProjectManagerEx.getInstanceEx().openProject(root,
            com.intellij.ide.impl.OpenProjectTask.build().asNewProject().withForceOpenInNewFrame(true));
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                var file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(root.resolve("Project plan.md"));
                if (project == null || file == null) throw new AssertionError("Capture fixture unavailable");
                com.intellij.ide.util.PropertiesComponent.getInstance(project).setValue("merkzeug.templateDirectory", root.resolve("Template").toString());
                com.intellij.ide.util.PropertiesComponent.getInstance().setValue("merkzeug.guidance." + root, true);
                var editor = new MerkzeugEditor(project, file);
                var browserField = MerkzeugEditor.class.getDeclaredField("browser"); browserField.setAccessible(true);
                var browser = (JBCefBrowser) browserField.get(editor);
                var frame = new JFrame("Project plan.md — Merkzeug (IntelliJ IDEA)");
                frame.setContentPane(editor.getComponent()); frame.getContentPane().setPreferredSize(new java.awt.Dimension(1280,800)); frame.pack(); frame.setVisible(true);
                var stage = new java.util.concurrent.atomic.AtomicInteger(0);
                browser.getJBCefClient().getCefClient().addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
                    @Override public boolean onConsoleMessage(org.cef.browser.CefBrowser b, org.cef.CefSettings.LogSeverity severity, String message, String source, int line) {
                        if (message.startsWith("CAPTURE")) System.out.println(message);
                        if (message.equals("CAPTURE_DARK_READY") && stage.compareAndSet(0,1)) capture(browser, root, "01-editor.png", () -> stage.set(2));
                        if (message.equals("CAPTURE_PAPER_READY") && stage.compareAndSet(2,3)) capture(browser, root, "02-template-preview.png", () -> { System.out.println("CAPTURE_PASSED"); System.exit(0); });
                        if (severity == org.cef.CefSettings.LogSeverity.LOGSEVERITY_ERROR) System.err.println(message);
                        return false;
                    }
                });
                new Timer(500, e -> {
                    browser.getCefBrowser().executeJavaScript("""
                        (() => {
                          const svg = document.querySelector('.mermaid-preview svg');
                          const host = document.querySelector('.editor-host');
                          if (!svg || !host) return;
                          if (!window.captureDark) {
                            localStorage.setItem('merkzeug.theme','dark');
                            window.dispatchEvent(new StorageEvent('storage',{key:'merkzeug.theme'}));
                            window.captureDark=true; window.beforeDark=svg.id; return;
                          }
                          if (!window.paperRequested) {
                            if (document.documentElement.dataset.theme!=='dark' || (window.darkWait=(window.darkWait||0)+1)<4) return;
                            host.scrollTop=0; console.log('CAPTURE_DARK_READY'); return;
                          }
                          if (!window.paperToggled) {
                            if (!document.querySelector('.template-preview-toggle')) { document.querySelector('button[aria-label=Merkzeug]').click(); return; }
                            const toggle=document.querySelector('.template-preview-toggle input');
                            window.beforePaper=svg.id; window.paperToggled=true;
                            if (!toggle.checked) toggle.click(); return;
                          }
                          if (!document.querySelector('.template-live') || svg.id===window.beforePaper) return;
                          if (!document.querySelector('.editor-extras')) { document.querySelector('button[aria-label=Merkzeug]').click(); return; }
                          if (!document.querySelector('.template-preview-toggle input')?.checked) return;
                          if ((window.paperWait=(window.paperWait||0)+1)<3) return;
                          host.scrollTop=0; console.log('CAPTURE_PAPER_READY');
                        })()
                        """, browser.getCefBrowser().getURL(), 0);
                    if (stage.get()==2) browser.getCefBrowser().executeJavaScript("window.paperRequested=true",browser.getCefBrowser().getURL(),0);
                }).start();
            } catch (Throwable error) { error.printStackTrace(); System.exit(1); }
        });
    }
    private static void capture(JBCefBrowser browser, Path root, String name, Runnable done) {
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                var process = new ProcessBuilder(System.getProperty("merkzeug.capture.helper"),
                    Long.toString(ProcessHandle.current().pid()), root.resolve(name).toString()).inheritIO().start();
                if (process.waitFor() != 0) throw new AssertionError("Fixture window capture failed");
                done.run();
            } catch (Throwable failure) { failure.printStackTrace(); System.exit(1); }
        });
    }
}
