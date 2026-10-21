package com.creativeit.merkzeug;

import com.google.gson.Gson;
import com.intellij.ui.jcef.JBCefBrowser;
import com.intellij.util.ui.UIUtil;
import org.cef.browser.*;
import org.cef.callback.*;
import org.cef.handler.*;
import org.cef.misc.*;
import org.cef.network.*;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;

/** Serves the bundled web shell to a JCEF browser under a private origin. */
final class WebAssets {
    private static final Gson JSON = new Gson();
    private WebAssets() { }

    /** Restricts navigation to {@code origin}; {@code extra} may answer dynamic paths before bundled files. */
    static void install(JBCefBrowser browser, String origin, Function<URI, CefResourceHandler> extra) {
        browser.getJBCefClient().getCefClient().addRequestHandler(new CefRequestHandlerAdapter() {
            @Override public boolean onBeforeBrowse(CefBrowser b, CefFrame f, CefRequest r, boolean gesture, boolean redirect) {
                return !r.getURL().startsWith(origin);
            }
            @Override public CefResourceRequestHandler getResourceRequestHandler(CefBrowser b, CefFrame f, CefRequest r, boolean navigation, boolean download, String initiator, BoolRef disable) {
                return new CefResourceRequestHandlerAdapter() {
                    @Override public CefResourceHandler getResourceHandler(CefBrowser b2, CefFrame f2, CefRequest request) {
                        if (!request.getURL().startsWith(origin)) return null;
                        URI uri = URI.create(request.getURL());
                        CefResourceHandler handler = extra == null ? null : extra.apply(uri);
                        return handler != null ? handler : bundled(uri);
                    }
                };
            }
        });
    }

    private static String color(java.awt.Color value) { return String.format("#%02x%02x%02x", value.getRed(), value.getGreen(), value.getBlue()); }
    static Map<String, Object> theme() {
        java.awt.Color bg = UIUtil.getPanelBackground();
        return Map.of("choice", "system", "dark", (bg.getRed() * 299 + bg.getGreen() * 587 + bg.getBlue() * 114) < 128000,
            "colors", Map.of("bg", color(bg), "bg-sidebar", color(bg), "text", color(UIUtil.getLabelForeground()),
                "text-dim", color(UIUtil.getContextHelpForeground())));
    }

    private static CefResourceHandler bundled(URI uri) {
        String path = uri.getPath();
        try {
            if (path.contains("..")) throw new IOException(Messages.text("Invalid resource path"));
            byte[] bytes;
            try (InputStream input = WebAssets.class.getResourceAsStream("/web" + path)) {
                if (input == null) throw new FileNotFoundException(path);
                bytes = input.readAllBytes();
            }
            if (path.equals("/index.html") && !"pdf".equals(uri.getQuery())) {
                var initialTheme = theme();
                boolean dark = Boolean.TRUE.equals(initialTheme.get("dark"));
                String meta = Base64.getEncoder().encodeToString(JSON.toJson(initialTheme).getBytes(StandardCharsets.UTF_8));
                String html = new String(bytes, StandardCharsets.UTF_8).replace("<html>", "<html data-theme=\"" + (dark ? "dark" : "light") + "\">")
                    .replace("<head>", "<head><meta name=\"merkzeug-host-theme\" content=\"" + meta + "\">");
                bytes = html.getBytes(StandardCharsets.UTF_8);
            }
            return response(bytes, mime(path), 200);
        } catch (Exception e) { return notFound(); }
    }

    static CefResourceHandler notFound() { return response("Not found".getBytes(StandardCharsets.UTF_8), "text/plain", 404); }

    static CefResourceHandler response(byte[] data, String contentType, int status) {
        return new CefResourceHandlerAdapter() {
            private int offset;
            @Override public boolean processRequest(CefRequest request, CefCallback callback) { callback.Continue(); return true; }
            @Override public boolean open(CefRequest request, BoolRef handle, CefCallback callback) { handle.set(true); return true; }
            @Override public void getResponseHeaders(CefResponse response, IntRef length, StringRef redirect) {
                response.setStatus(status); response.setMimeType(contentType); length.set(data.length);
                response.setHeaderMap(Map.of("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'"));
            }
            private boolean copy(byte[] out, int count, IntRef read) {
                int size = Math.min(count, data.length - offset);
                if (size <= 0) { read.set(0); return false; }
                System.arraycopy(data, offset, out, 0, size); offset += size; read.set(size); return true;
            }
            @Override public boolean readResponse(byte[] out, int count, IntRef read, CefCallback callback) { return copy(out, count, read); }
            @Override public boolean read(byte[] out, int count, IntRef read, CefResourceReadCallback callback) { return copy(out, count, read); }
        };
    }

    static String mime(String path) {
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "mp4" -> "video/mp4"; case "html" -> "text/html"; case "js" -> "application/javascript"; case "css" -> "text/css";
            case "svg" -> "image/svg+xml"; case "png" -> "image/png"; case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif"; case "webp" -> "image/webp"; case "bmp" -> "image/bmp"; case "avif" -> "image/avif";
            case "woff2" -> "font/woff2"; case "woff" -> "font/woff"; default -> "application/octet-stream";
        };
    }
}
