package com.creativeit.merkzeug;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.openapi.util.Disposer;
import com.intellij.ui.jcef.JBCefBrowser;
import javax.swing.*;
import java.awt.BorderLayout;
import java.nio.file.*;

/** Keep the generated PDF alive for the native Chromium PDF preview and print dialog. */
final class PrintPreview extends DialogWrapper {
    private final JBCefBrowser browser = new JBCefBrowser();
    private final Path pdf;
    PrintPreview(Project project, Path pdf) {
        super(project, false);
        this.pdf = pdf;
        setTitle(Messages.text("Print"));
        setModal(false);
        init();
        browser.loadURL(pdf.toUri().toASCIIString());
    }
    @Override protected JComponent createCenterPanel() {
        var panel = new JPanel(new BorderLayout());
        panel.setPreferredSize(new java.awt.Dimension(900, 700));
        panel.add(browser.getComponent(), BorderLayout.CENTER);
        return panel;
    }
    @Override protected Action[] createActions() {
        return new Action[]{new DialogWrapperAction(Messages.text("Print…")) {
            @Override protected void doAction(java.awt.event.ActionEvent event) { browser.getCefBrowser().print(); }
        }, getCancelAction()};
    }
    @Override protected void dispose() {
        Disposer.dispose(browser);
        try { Files.deleteIfExists(pdf); } catch (java.io.IOException ignored) { pdf.toFile().deleteOnExit(); }
        super.dispose();
    }
}
