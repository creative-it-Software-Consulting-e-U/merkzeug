# Merkzeug legacy macOS application

This is the archived native SwiftUI/AppKit implementation. Current development and releases use the [Electron desktop app](../crossplatform/README.md) and shared packages.

The [historical German development reference](README.de.md) is retained for existing users. The bundled user manual is available in [English](Sources/Merkzeug/Resources/Help.en.md) and [German](Sources/Merkzeug/Resources/Help.de.md).

Build locally with `swift build` and run tests with `swift test` in this directory. The legacy `make install` replaces `/Applications/Merkzeug.app`, including an installed current desktop edition. The legacy app is not part of the active release workflow or shared version checks.
