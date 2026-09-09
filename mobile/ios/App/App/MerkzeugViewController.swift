import UIKit
import Capacitor

/// Registriert die app-eigenen Capacitor-Plugins beim Bridge-Start.
class MerkzeugViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VaultPlugin())
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.environment["MERKZEUG_DEMO_MODE"] == "1" {
            overrideUserInterfaceStyle = .light
            pollScreenshotReady()
        }
        #endif
    }
    #if DEBUG && targetEnvironment(simulator)
    private var screenshotAttempts = 0
    private func pollScreenshotReady() {
        screenshotAttempts += 1
        guard screenshotAttempts <= 120 else { return }
        let scene = ProcessInfo.processInfo.environment["MERKZEUG_DEMO_SCENE"] ?? "writing"
        let script = """
        (() => {
          const editor = document.querySelector('.ProseMirror');
          if (!editor || !editor.querySelector('h1') || document.fonts.status !== 'loaded') return false;
          if ('\(scene)' === 'diagram' && !document.querySelector('.mermaid-preview svg')) return false;
          if ('\(scene)' === 'frontmatter') {
            const button = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Frontmatter'));
            if (button && !document.querySelector('.frontmatter-input')) { button.click(); return false; }
          }
          return true;
        })()
        """
        webView?.evaluateJavaScript(script) { [weak self] result, _ in
            guard let self = self else { return }
            if result as? Bool == true {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    let marker = UIView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
                    marker.isAccessibilityElement = true
                    marker.accessibilityIdentifier = "merkzeug-screenshot-ready"
                    self.view.addSubview(marker)
                }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.pollScreenshotReady() }
            }
        }
    }
    #endif
}
