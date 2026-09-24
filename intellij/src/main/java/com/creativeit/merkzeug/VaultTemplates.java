package com.creativeit.merkzeug;

import com.google.gson.*;
import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.project.Project;
import java.nio.file.*;
import java.io.IOException;
import java.util.*;

final class VaultTemplates {
    private static Path settings(Path root) throws IOException {
        Path dir = root.resolve(".merkzeug");
        if (Files.exists(dir) && !dir.toRealPath().startsWith(root.toRealPath())) throw new IOException("Vault settings are outside the vault");
        return dir.resolve("settings.json");
    }
    private static JsonObject read(Path root) throws IOException {
        Path file = settings(root);
        if (!Files.exists(file)) return new JsonObject();
        if (!file.toRealPath().startsWith(root.toRealPath())) throw new IOException("Vault settings are outside the vault");
        return JsonParser.parseString(Files.readString(file)).getAsJsonObject();
    }
    static List<Path> central(Project project) {
        List<Path> paths = new ArrayList<>();
        String explicit = PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory");
        if (explicit != null) paths.add(Path.of(explicit));
        var found = DesktopTemplates.discover(DesktopTemplates.profiles(System.getProperty("os.name"), Path.of(System.getProperty("user.home")), System.getenv()), System.getenv("MERKZEUG_TEMPLATES_ROOT"));
        found.templates().forEach(t -> paths.add(t.directory()));
        return paths;
    }
    static String selection(Path root, Project project) throws IOException {
        JsonObject config = read(root);
        if (!config.has("pdfTemplate")) {
            String explicit = PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory");
            return explicit == null ? null : Path.of(explicit).getFileName().toString();
        }
        JsonElement value = config.get("pdfTemplate");
        if (value.isJsonNull()) return null;
        if (value.isJsonPrimitive()) return value.getAsString();
        if (!"vault".equals(value.getAsJsonObject().get("source").getAsString())) throw new IOException("Invalid template location");
        return "vault:" + value.getAsJsonObject().get("path").getAsString();
    }
    static Path resolve(Path root, Project project, String selection) throws IOException {
        if (selection == null || selection.isEmpty()) return null;
        boolean vault = selection.startsWith("vault:");
        String relative = vault ? selection.substring(6) : selection;
        if (relative.isBlank() || relative.contains("\\") || relative.contains(":") || relative.startsWith("/") || Arrays.stream(relative.split("/", -1)).anyMatch(p -> p.isEmpty() || p.equals(".") || p.equals("..")) || (!vault && relative.contains("/"))) throw new IOException("Invalid template location");
        if (vault) {
            Path dir = root.resolve(relative).toRealPath();
            if (!dir.startsWith(root.toRealPath()) || !Files.isDirectory(dir)) throw new IOException("Template is outside the vault");
            return dir;
        }
        for (Path dir : central(project)) if (dir.getFileName().toString().equals(relative) && Files.isDirectory(dir)) return dir.toRealPath();
        throw new IOException("Template folder is missing: " + relative);
    }
    static Map<String, Object> state(Path root, Project project) throws IOException {
        Map<String, Object> state = new HashMap<>();
        state.put("assigned", selection(root, project));
        state.put("templates", central(project).stream().map(p -> p.getFileName().toString()).distinct().toList());
        return state;
    }
    static synchronized void assign(Path root, Project project, String selected) throws IOException {
        resolve(root, project, selected);
        JsonObject config = read(root);
        if (selected == null || selected.isEmpty()) config.add("pdfTemplate", JsonNull.INSTANCE);
        else if (selected.startsWith("vault:")) {
            JsonObject value = new JsonObject(); value.addProperty("source", "vault"); value.addProperty("path", selected.substring(6)); config.add("pdfTemplate", value);
        } else config.addProperty("pdfTemplate", selected);
        Path target = settings(root);
        var virtual = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(target.toString());
        if (virtual != null) {
            var document = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().getCachedDocument(virtual);
            if (document != null && com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().isDocumentUnsaved(document)) throw new IOException("Save vault settings before changing the template");
        }
        Files.createDirectories(target.getParent());
        Files.writeString(target, new GsonBuilder().setPrettyPrinting().create().toJson(config) + "\n");
        com.intellij.openapi.vfs.LocalFileSystem.getInstance().refreshAndFindFileByPath(target.toString());
    }
}
