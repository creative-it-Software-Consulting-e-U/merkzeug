import AppKit

/// Vorschau-Panel für Mermaid-Diagramme mit Zoom (Trackpad-Pinch,
/// +/−/0-Tasten). Wird über die Hover-Lupe, ⌘-Klick oder das Kontextmenü
/// eines Diagramms geöffnet — unabhängig vom Umschalten Diagramm ⇄ Code.
final class MermaidZoomPanel: NSPanel {

    static let shared = MermaidZoomPanel()

    private let scrollView = NSScrollView()
    private let imageView = NSImageView()
    private var currentSource: String?
    private var needsInitialLayout = false

    private init() {
        super.init(contentRect: NSRect(x: 0, y: 0, width: 640, height: 480),
                   styleMask: [.titled, .closable, .resizable, .utilityWindow],
                   backing: .buffered, defer: true)
        title = "Mermaid-Diagramm"
        isReleasedWhenClosed = false
        hidesOnDeactivate = false

        imageView.imageScaling = .scaleProportionallyUpOrDown
        scrollView.hasHorizontalScroller = true
        scrollView.hasVerticalScroller = true
        scrollView.allowsMagnification = true
        scrollView.minMagnification = 0.2
        scrollView.maxMagnification = 6
        scrollView.drawsBackground = true
        scrollView.backgroundColor = .textBackgroundColor
        scrollView.documentView = imageView
        contentView = scrollView
    }

    /// Zeigt das Panel für einen Mermaid-Quelltext. Zuerst erscheint die
    /// (meist schon gecachte) Inline-Auflösung, danach wird auf die
    /// hochauflösende Variante gewechselt — gleiche logische Größe,
    /// scharf bis zur vierfachen Vergrößerung.
    func show(source: String) {
        currentSource = source
        needsInitialLayout = true
        MermaidRenderer.shared.render(source) { [weak self] image in
            guard let self, self.currentSource == source else { return }
            if let image { self.display(image) }
            MermaidRenderer.shared.render(source, scale: MermaidRenderer.zoomScale) { [weak self] hiRes in
                guard let self, self.currentSource == source, let hiRes else { return }
                self.display(hiRes)
            }
        }
        makeKeyAndOrderFront(nil)
    }

    private func display(_ image: NSImage) {
        let size = image.size
        imageView.image = image
        imageView.frame = NSRect(origin: .zero, size: size)
        guard needsInitialLayout else { return }
        needsInitialLayout = false

        if let screen = screen ?? NSScreen.main {
            let maxSize = NSSize(width: screen.visibleFrame.width * 0.8,
                                 height: screen.visibleFrame.height * 0.8)
            setContentSize(NSSize(width: min(max(size.width, 320), maxSize.width),
                                  height: min(max(size.height, 240), maxSize.height)))
            center()
        }
        // Anfangszoom: einpassen, aber nie über 100 %
        scrollView.magnification = min(scrollView.contentSize.width / size.width,
                                       scrollView.contentSize.height / size.height, 1)
    }

    override func keyDown(with event: NSEvent) {
        switch event.charactersIgnoringModifiers {
        case "+", "=": scrollView.magnification *= 1.25
        case "-": scrollView.magnification /= 1.25
        case "0": scrollView.magnification = 1
        default: super.keyDown(with: event)
        }
    }

    override var canBecomeKey: Bool { true }
}
