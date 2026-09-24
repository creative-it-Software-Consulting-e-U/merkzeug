package com.creativeit.merkzeug;

import com.intellij.ide.util.PropertiesComponent;
import java.util.HashSet;
import java.util.Set;

/** One announcement per IDE session, shared by all projects and editor tabs. */
final class ReleaseNotes {
    private static final Set<String> claimed = new HashSet<>();
    static synchronized boolean claim(String version) {
        if (version.equals(PropertiesComponent.getInstance().getValue("merkzeug.releaseNotesSeen"))) return false;
        return claimed.add(version);
    }
}
