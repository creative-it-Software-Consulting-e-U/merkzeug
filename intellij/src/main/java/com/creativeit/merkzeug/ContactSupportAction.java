package com.creativeit.merkzeug;

import com.intellij.ide.BrowserUtil;
import com.intellij.ide.plugins.PluginManagerCore;
import com.intellij.openapi.extensions.PluginId;
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
        var plugin = PluginManagerCore.getPlugin(PluginId.getId("com.creativeit.merkzeug"));
        String language = "de".equals(Locale.getDefault().getLanguage()) ? "de" : "en";
        String url = "https://support.apps.creative-it.com/?app=merkzeug&lang=" + language + "&environment=IntelliJ";
        if (plugin != null) url += "&appVersion=" + URLEncoder.encode(plugin.getVersion(), StandardCharsets.UTF_8);
        BrowserUtil.browse(url);
    }
}
