import AppKit

/// Zoom-Einstieg für Mermaid-Diagramme: Beim Überfahren eines Diagramms
/// erscheint oben rechts eine Lupen-Schaltfläche; sie öffnet — wie auch
/// ⌘-Klick und das Kontextmenü — die Zoom-Vorschau. Der normale Klick
/// bleibt dem Umschalten auf den Codeblock vorbehalten.
extension MarkdownTextView {

    /// Zeichenindex und Begrenzungsrechteck (View-Koordinaten) des
    /// Mermaid-Attachments unter `point`, sonst nil.
    func mermaidHit(at point: NSPoint) -> (index: Int, rect: NSRect)? {
        guard let lm = layoutManager, let tc = textContainer,
              let ts = textStorage, ts.length > 0 else { return nil }
        var p = point
        p.x -= textContainerOrigin.x
        p.y -= textContainerOrigin.y
        var fraction: CGFloat = 0
        let index = lm.characterIndex(for: p, in: tc,
                                      fractionOfDistanceBetweenInsertionPoints: &fraction)
        guard index < ts.length, mermaidSource(at: index) != nil else { return nil }
        let glyphRange = lm.glyphRange(forCharacterRange: NSRange(location: index, length: 1),
                                       actualCharacterRange: nil)
        var rect = lm.boundingRect(forGlyphRange: glyphRange, in: tc)
        guard rect.contains(p) else { return nil }
        rect.origin.x += textContainerOrigin.x
        rect.origin.y += textContainerOrigin.y
        return (index, rect)
    }

    /// Öffnet die Zoom-Vorschau für das Diagramm an `index`.
    func zoomMermaidBlock(at index: Int) {
        guard let source = mermaidSource(at: index) else { return }
        MermaidZoomPanel.shared.show(source: source)
    }

    // MARK: - Hover-Lupe

    /// NSTrackingArea liefert in SwiftUI-Fenstern keine Mouse-Moved-Events
    /// an die TextView; ein lokaler Event-Monitor sieht sie unabhängig von
    /// First Responder und Tracking-Mechanik.
    func installMermaidLensMonitor() {
        guard mermaidLensMonitor == nil else { return }
        mermaidLensMonitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved]) { [weak self] event in
            self?.handleMermaidHover(event)
            return event
        }
    }

    func removeMermaidLensMonitor() {
        if let monitor = mermaidLensMonitor {
            NSEvent.removeMonitor(monitor)
            mermaidLensMonitor = nil
        }
    }

    private func handleMermaidHover(_ event: NSEvent) {
        guard let window, event.window === window else { return }
        let point = convert(event.locationInWindow, from: nil)
        if visibleRect.contains(point) {
            updateMermaidLens(for: point)
        } else {
            hideMermaidLens()
        }
    }

    func updateMermaidLens(for point: NSPoint) {
        guard let hit = mermaidHit(at: point) else {
            hideMermaidLens()
            return
        }
        let button = ensureMermaidLensButton()
        mermaidLensIndex = hit.index
        let size = button.frame.size
        button.setFrameOrigin(NSPoint(x: hit.rect.maxX - size.width - 6,
                                      y: hit.rect.minY + 6))
        button.isHidden = false
    }

    func hideMermaidLens() {
        mermaidLensButton?.isHidden = true
        mermaidLensIndex = -1
    }

    private func ensureMermaidLensButton() -> NSButton {
        if let button = mermaidLensButton { return button }
        let image = NSImage(systemSymbolName: "plus.magnifyingglass",
                            accessibilityDescription: "Diagramm vergrößern")
            ?? NSImage(named: NSImage.quickLookTemplateName)!
        let button = NSButton(image: image, target: self,
                              action: #selector(mermaidLensClicked(_:)))
        button.isBordered = false
        button.bezelStyle = .regularSquare
        button.contentTintColor = .secondaryLabelColor
        button.toolTip = "Diagramm vergrößern (⌘-Klick)"
        button.wantsLayer = true
        button.layer?.backgroundColor = NSColor.textBackgroundColor.withAlphaComponent(0.85).cgColor
        button.layer?.cornerRadius = 6
        button.layer?.borderWidth = 1
        button.layer?.borderColor = NSColor.separatorColor.cgColor
        button.frame = NSRect(x: 0, y: 0, width: 26, height: 26)
        button.isHidden = true
        addSubview(button)
        mermaidLensButton = button
        return button
    }

    @objc func mermaidLensClicked(_ sender: Any?) {
        guard mermaidLensIndex >= 0 else { return }
        zoomMermaidBlock(at: mermaidLensIndex)
    }

    @objc func zoomMermaidFromMenu(_ sender: NSMenuItem) {
        guard let source = sender.representedObject as? String else { return }
        MermaidZoomPanel.shared.show(source: source)
    }
}
