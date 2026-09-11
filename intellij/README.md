# Merkzeug IntelliJ plugin

Local preview of the shared editor and PDF renderer hosted in IntelliJ IDEA through JCEF. For installation and daily use, see the [IntelliJ user guide](../docs/user/intellij.md).

## Plugin description

The bundled plugin description for the IDE and Marketplace is maintained in [`plugin.xml`](src/main/resources/META-INF/plugin.xml). It explicitly documents relative image storage in `Note.assets/` and the native IntelliJ Move/Rename integration. English and German listing copy is prepared in [Marketplace text](../store/jetbrains-marketplace.md). Keep these descriptions aligned with the [image and refactoring guide](../docs/user/intellij.md#images-and-companion-folders) when changing attachment behavior.

## Build

The SDK version and build are pinned in `sdk.json`. The current target is IDEA 2026.2.2, build 262.10315.125. Other SDKs are rejected until compatibility is reviewed.

```sh
# From the repository root:
npm ci
npm run build:intellij
```

On macOS the build defaults to `/Applications/IntelliJ IDEA.app/Contents`. Otherwise set `IDEA_HOME` to a matching IDE installation root containing `lib` and `product-info.json`; macOS uses `Resources/product-info.json`. JCEF libraries must be included. The bundled JBR javac is preferred, with a system JDK fallback.

The output is `intellij/dist/merkzeug-VERSION.zip`. The build reads the shared release version and checks all active manifests. Test classes are never included in the distributable plugin. The plugin also includes generated third-party notices for bundled web dependencies.

CI downloads the exact Linux archive in `sdk.json`, verifies its pinned SHA-256 checksum and checks product metadata before compiling. See [release management](../docs/development/releases.md).

## Isolated native integration test

```sh
python3 intellij/smoke.py
```

This test currently requires macOS and the installed matching IDE. It launches a separate IDE profile under `intellij/build/smoke`, creates a synthetic project, allows writing only the fixture, and tests document synchronization, stale-write rejection, undo, redo, saving and JCEF PDF output. Each run uses a fresh IDE system cache to avoid recovering stale test documents.

Run in a graphical macOS session with application access. A filesystem sandbox can prevent AppKit application registration before IntelliJ starts. The test does not restart or install plugins in the user's normal IDE.

Inspect `actual.pdf` visually after meaningful rendering changes; successful file creation alone is insufficient. The last prototype test checked a four-page PDF with cover, table of contents, Mermaid, table, umlauts, linked appendix and page headers/footers.

## Integration boundaries

The Java adapter owns IntelliJ documents, revisions, undo, file dialogs, project resource restrictions and native PDF printing. The web shell owns presentation and sends typed-operation payloads through the bridge. English messages are source text; German follows the host locale. Appearance follows IDE colors automatically. PDF templates are configured under Settings → Tools → Merkzeug for each project. Native file dialogs follow IntelliJ.
