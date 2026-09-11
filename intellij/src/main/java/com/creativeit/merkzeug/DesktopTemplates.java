package com.creativeit.merkzeug;

import com.google.gson.JsonParser;
import java.nio.file.*;
import java.io.IOException;
import java.util.*;

/** Read-only discovery of Electron's desktop template locations. */
final class DesktopTemplates {
    record Template(Path directory) {
        @Override public String toString() { return directory.getFileName() + " — " + directory; }
    }
    record Result(List<Template> templates, boolean unreadable) { }
    static List<Path> profiles(String os, Path home, Map<String, String> env) {
        Path base;
        if (os.toLowerCase(Locale.ROOT).contains("mac")) base = home.resolve("Library/Application Support");
        else if (os.toLowerCase(Locale.ROOT).contains("win")) base = Path.of(env.getOrDefault("APPDATA", home.resolve("AppData/Roaming").toString()));
        else base = Path.of(env.getOrDefault("XDG_CONFIG_HOME", home.resolve(".config").toString()));
        return List.of(base.resolve("merkzeug"), base.resolve("Merkzeug"));
    }
    static Result discover(List<Path> profiles, String override) {
        Set<Path> roots = new LinkedHashSet<>();
        boolean unreadable = false;
        if (override != null && !override.isBlank()) {
            try { roots.add(Path.of(override)); } catch (InvalidPathException error) { unreadable = true; }
        }
        for (Path profile : profiles) {
            Path root = profile.resolve("PDF-Vorlagen");
            Path settings = profile.resolve("settings.json");
            if (Files.exists(settings)) {
                try {
                    var config = JsonParser.parseString(Files.readString(settings)).getAsJsonObject();
                    if (config.has("templatesRoot")) {
                        String configured = config.get("templatesRoot").getAsString();
                        if (!configured.isBlank()) root = Path.of(configured);
                    }
                } catch (IOException | RuntimeException error) { unreadable = true; }
            }
            roots.add(root);
        }
        Set<Path> found = new LinkedHashSet<>();
        for (Path root : roots) {
            if (!Files.exists(root)) continue;
            try (var entries = Files.list(root)) {
                for (Path directory : entries.filter(Files::isDirectory).toList()) {
                    if (directory.getFileName().toString().startsWith(".")) continue;
                    if (List.of("stil.css", "vorlage.json", "kopfzeile.html", "fusszeile.html", "deckblatt.html").stream().anyMatch(name -> Files.isRegularFile(directory.resolve(name)))) found.add(directory.toRealPath());
                }
            } catch (IOException | RuntimeException error) { unreadable = true; }
        }
        return new Result(found.stream().sorted(Comparator.comparing(Path::toString, String.CASE_INSENSITIVE_ORDER)).map(Template::new).toList(), unreadable);
    }
}
