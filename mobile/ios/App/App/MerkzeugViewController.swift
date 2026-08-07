import UIKit
import Capacitor

/// Registriert die app-eigenen Capacitor-Plugins beim Bridge-Start.
class MerkzeugViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VaultPlugin())
    }
}
