# Merkzeug VS Code extension

The shared editor and PDF renderer hosted in Visual Studio Code as a custom text editor. For installation and daily use, see the [VS Code user guide](../docs/user/vscode.md).

## Feature parity with IntelliJ

Both IDE editions render the same web shell from [`@merkzeug/ide`](../packages/ide/src/IdeShell.tsx); only the bridge transport and image URLs differ. Add editor features there, then implement any new bridge request in both adapters. `scripts/tests/ide-parity.test.ts` fails when the IntelliJ and VS Code adapters answer different requests.

| Concern | IntelliJ | VS Code |
| --- | --- | --- |
| Document, undo, save | `Document`, `WriteCommandAction`, `UndoManager` | `TextDocument`, `WorkspaceEdit`, `undo`/`redo` commands |
| Settings | Settings → Tools → Merkzeug, `PropertiesComponent` | `contributes.configuration` (`merkzeug.*`), `globalState`, quick picks |
| Rename/Move with `.assets` | Rename/Move processors | `workspace.onWillRenameFiles` participant |
| PDF and printing | JCEF `printToPDF`, preview dialog | Headless Chromium via DevTools pipe, system PDF viewer |
| View resources | Private JCEF origin | `asWebviewUri` with `localResourceRoots` |
| Manifest strings | `plugin.xml` | `package.nls.json` / `package.nls.de.json` |

Native messages use the shared catalog (`t` from `@merkzeug/core/i18n`).

## Build

```sh
# From the repository root:
npm ci
npm run build:vscode
```

The output is `vscode/dist/merkzeug-VERSION.vsix`; `--marketplace` (`python3 vscode/build.py --marketplace`) omits the unpublished guided tour. The unpacked extension is staged in `vscode/build/extension` and can be loaded with `code --extensionDevelopmentPath=vscode/build/extension`. The build writes the VSIX itself; it never installs or publishes. The workspace `package.json` is the source manifest; the build removes development fields and names the extension `creative-it.merkzeug`.

The extension host bundle (`src/`) is built with Vite as one CommonJS file; only `vscode` and Node built-ins stay external. The web view (`web/`) is a Vite build of the shared shell.

## Isolated native integration test

```sh
python3 vscode/smoke.py
```

The test requires an installed VS Code (default macOS path; set `VSCODE_BINARY` elsewhere) and a Chromium-based browser. It starts VS Code with a temporary profile and no other extensions, opens a synthetic workspace under `vscode/build/smoke` and checks web shell boot, document synchronization, stale-write rejection, undo, redo, saving, images, templates, settings, PDF output and rename/move refactoring. Run it in a graphical session; a filesystem sandbox can prevent VS Code from starting. It does not touch the user's normal VS Code profile.

Inspect `vscode/build/smoke/actual.pdf` visually after rendering changes; successful file creation alone is insufficient.

## Integration boundaries

The TypeScript adapter owns the VS Code document, revisions, file dialogs, workspace resource restrictions, rename participation and PDF rendering. The web shell owns presentation and sends typed requests through `postMessage`. Appearance follows VS Code's theme variables. PDF rendering intercepts requests to a private origin and never opens a network port.
