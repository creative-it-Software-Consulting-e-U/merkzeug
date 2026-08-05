import AppKit
import WebKit

/// Rendert Mermaid-Quelltext zu Bildern — offline über das gebündelte
/// mermaid.js in einem unsichtbaren WKWebView. Anfragen laufen seriell;
/// Ergebnisse werden pro Quelltext (und Hell/Dunkel-Modus) gecacht.
final class MermaidRenderer: NSObject, WKNavigationDelegate {

    static let shared = MermaidRenderer()

    private let webView: WKWebView
    private var ready = false
    private var busy = false
    private var queue: [(source: String, scale: CGFloat, completion: (NSImage?) -> Void)] = []
    private var cache: [String: NSImage] = [:]

    /// Standard-Skalierungsfaktor fürs Inline-Rendering (2 = Retina-scharf).
    static let inlineScale: CGFloat = 2
    /// Skalierungsfaktor für die Zoom-Vorschau (scharf bis 4-fache Vergrößerung).
    static let zoomScale: CGFloat = 4

    override private init() {
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1400, height: 1400))
        super.init()
        webView.navigationDelegate = self
        var script = ""
        if let url = Bundle.module.url(forResource: "mermaid.min", withExtension: "js"),
           let js = try? String(contentsOf: url, encoding: .utf8) {
            script = js
        }
        let html = """
        <!doctype html><html><head><meta charset="utf-8">
        <style>body { margin: 0; padding: 8px; } #out svg { max-width: none !important; }</style>
        <script>\(script)</script>
        </head><body><div id="out"></div></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        ready = true
        pump()
    }

    /// `completion` läuft auf dem Main-Thread; nil bei Renderfehler
    /// (z. B. Syntaxfehler im Diagramm). `scale` bestimmt die Pixeldichte
    /// des Ergebnisses; die logische Bildgröße bleibt davon unberührt.
    func render(_ source: String, scale: CGFloat = MermaidRenderer.inlineScale,
                completion: @escaping (NSImage?) -> Void) {
        let key = cacheKey(for: source, scale: scale)
        if let image = cache[key] {
            completion(image)
            return
        }
        queue.append((source, scale, completion))
        pump()
    }

    // MARK: - Intern

    private var isDarkAppearance: Bool {
        NSApplication.shared.effectiveAppearance
            .bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
    }

    private func cacheKey(for source: String, scale: CGFloat) -> String {
        (isDarkAppearance ? "dark|" : "light|") + "\(scale)|" + source
    }

    private func pump() {
        guard ready, !busy, !queue.isEmpty else { return }
        busy = true
        let (source, scale, completion) = queue.removeFirst()
        let key = cacheKey(for: source, scale: scale)
        let js = """
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default' });
        document.body.style.background = bg;
        window.__mnCount = (window.__mnCount || 0) + 1;
        const { svg } = await mermaid.render('mnDiagram' + window.__mnCount, src);
        const out = document.getElementById('out');
        out.innerHTML = svg;
        const el = out.querySelector('svg');
        if (el) {
            // mermaid liefert width=100% + max-width — auf natürliche Größe fixieren
            el.style.maxWidth = 'none';
            const vb = el.viewBox && el.viewBox.baseVal;
            if (vb && vb.width > 0 && vb.height > 0) {
                el.setAttribute('width', vb.width);
                el.setAttribute('height', vb.height);
                el.style.width = vb.width + 'px';
                el.style.height = vb.height + 'px';
            }
        }
        const rect = el ? el.getBoundingClientRect() : { width: 0, height: 0 };
        return [Math.ceil(rect.width), Math.ceil(rect.height)];
        """
        webView.pageZoom = scale
        webView.callAsyncJavaScript(
            js,
            arguments: ["src": source, "dark": isDarkAppearance, "bg": Self.cssColor(.textBackgroundColor)],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case let .success(value):
                guard let dims = value as? [Any],
                      let w = (dims.first as? NSNumber)?.doubleValue,
                      let h = (dims.last as? NSNumber)?.doubleValue,
                      w > 1, h > 1 else {
                    self.finish(key: key, image: nil, completion: completion)
                    return
                }
                self.snapshot(cssWidth: w, cssHeight: h, scale: scale) { image in
                    self.finish(key: key, image: image, completion: completion)
                }
            case .failure:
                self.finish(key: key, image: nil, completion: completion)
            }
        }
    }

    private func snapshot(cssWidth: CGFloat, cssHeight: CGFloat, scale: CGFloat,
                          completion: @escaping (NSImage?) -> Void) {
        // 8 px Body-Padding auf jeder Seite, alles mal Zoomfaktor
        let width = (cssWidth + 16) * scale
        let height = (cssHeight + 16) * scale
        var frame = webView.frame
        frame.size.width = max(frame.width, width)
        frame.size.height = max(frame.height, height)
        webView.frame = frame

        let config = WKSnapshotConfiguration()
        config.rect = NSRect(x: 0, y: 0, width: width, height: height)
        DispatchQueue.main.async {
            self.webView.takeSnapshot(with: config) { image, _ in
                if let image {
                    // Logische Größe durch den Zoomfaktor teilen → scharfe Darstellung
                    image.size = NSSize(width: width / scale, height: height / scale)
                }
                completion(image)
            }
        }
    }

    private func finish(key: String, image: NSImage?, completion: (NSImage?) -> Void) {
        if let image { cache[key] = image }
        completion(image)
        busy = false
        pump()
    }

    private static func cssColor(_ color: NSColor) -> String {
        var result = "rgb(255, 255, 255)"
        NSApplication.shared.effectiveAppearance.performAsCurrentDrawingAppearance {
            if let c = color.usingColorSpace(.sRGB) {
                result = String(format: "rgb(%d, %d, %d)",
                                Int(round(c.redComponent * 255)),
                                Int(round(c.greenComponent * 255)),
                                Int(round(c.blueComponent * 255)))
            }
        }
        return result
    }
}
