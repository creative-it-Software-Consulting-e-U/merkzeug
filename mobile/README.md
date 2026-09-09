# Merkzeug for iOS and iPadOS

A Capacitor shell around the shared Milkdown editor. Files come from a folder selected in the Files app, including folders provided by Working Copy. Git operations remain in the external Git app.

See the [iOS user guide](../docs/user/ios.md) and [bundled reference manual](src/help/Help.en.md). PDF export is not implemented on iOS. There is no public TestFlight distribution yet.

## Develop

From the repository root:

```sh
npm ci
npm run dev -w merkzeug-mobile
npm run build:mobile
npm run sync -w merkzeug-mobile
npm run open -w merkzeug-mobile
```

The browser development mode uses an in-memory demo vault and cannot validate native file-provider access. The iOS project uses Swift Package Manager rather than CocoaPods.

In Xcode, select your own development team under Signing & Capabilities, connect a device and run. The checked-in project may contain the maintainer's team identifier; contributors should use their own signing identity. In the simulator, select a local Files folder; Working Copy integration needs a device/provider setup.

## Layout and behavior

- `src`: React shell and mobile navigation.
- `src/vault.ts`: vault interface, native Capacitor implementation and browser demo.
- `ios/App/App/VaultPlugin.swift`: system folder picker, persistent security-scoped bookmark, coordinated file access, modification-time conflict checks and search.
- `src/help`: English and German user help, selected from system language with a manual selector.

JavaScript paths are vault-relative, such as `/projects/plan.md`. Native file access uses `NSFileCoordinator` for file-provider compatibility. Files refresh on app activation or manual refresh; there is no continuous filesystem watcher. Image data is loaded as data URIs, which can be expensive for large images.

Before distributing a build, test on a device: folder permissions after restart, creation/rename/deletion, external changes after a pull, saving on navigation and backgrounding, and English/German system languages. The shared editor migration has passed web builds; device testing is still required.

For version/build numbers and TestFlight, see [release management](../docs/development/releases.md).
