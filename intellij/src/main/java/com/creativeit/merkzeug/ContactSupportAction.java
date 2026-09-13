package com.creativeit.merkzeug;

import com.intellij.ide.BrowserUtil;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.jetbrains.annotations.NotNull;

public final class ContactSupportAction extends AnAction {
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
    @Override public void update(@NotNull AnActionEvent event) {
        event.getPresentation().setText("de".equals(Locale.getDefault().getLanguage())
            ? "Merkzeug: Support kontaktieren…" : "Merkzeug: Contact Support…");
    }
    @Override public void actionPerformed(@NotNull AnActionEvent event) {

        String language = "de".equals(Locale.getDefault().getLanguage()) ? "de" : "en";
        String url = "https://support.apps.creative-it.com/?app=merkzeug&lang=" + language + "&environment=IntelliJ";
        try (var resource = getClass().getResourceAsStream("/META-INF/merkzeug-version.txt")) {
            if (resource != null) url += "&appVersion=" + URLEncoder.encode(new String(resource.readAllBytes(), StandardCharsets.UTF_8).trim(), StandardCharsets.UTF_8);
        } catch (java.io.IOException ignored) { /* Support remains available without version metadata. */ }
        BrowserUtil.browse(url);
    }
}
