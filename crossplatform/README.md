# Merkzeug desktop

Electron application for macOS, Windows and Linux. It shares the visual editor with iOS and IntelliJ and shares PDF rendering with IntelliJ. Notes remain ordinary Markdown files.

For installation and usage, see the [desktop guide](../docs/user/desktop.md) and the [bundled reference manual](resources/help/Help.en.md). For architecture, see [shared packages](../docs/shared-architecture.md).

## Develop

From the repository root:

```sh
npm ci
npm run dev -w merkzeug
npm run typecheck
npm run build:desktop
```

For distributable packages, prefer `python3 scripts/package-desktop.py PLATFORM ARCH` at the repository root. It explicitly disables publishing and handles unsigned previews. See [release management](../docs/development/releases.md) for signing and the binary matrix.

Existing workspace scripts `package:mac`, `package:mac:dmg`, `package:win` and `package:linux` remain available for local packaging. Their signing behavior follows your environment and electron-builder configuration. macOS packages compile the EventKit helper first. Windows packaging uses `ELECTRON_BUILDER_7Z_FILTER=BCJ2` for NSIS compatibility. Cross-building Linux packages on macOS additionally requires GNU tar, xz and rpm; CI builds Linux packages on Linux.

## Layout

- `src/main`: windows, menus, filesystem operations, watchers, Git, calendar and PDF adapters.
- `src/preload`: typed IPC bridge.
- `src/renderer`: React shell, navigation, file tree, panes and dialogs.
- `src/shared`: desktop IPC data contracts; shared document types are imported from core.
- `resources/help`: English source manual and German translation.
- `resources/calendar`: EventKit and classic Outlook helpers.

## Development fixtures

These environment variables are intended for local testing, never release configuration:

| Variable | Purpose |
| --- | --- |
| `MERKZEUG_VAULT` | Initial vault folder |
| `MERKZEUG_SCREENSHOT` | Save a screenshot and exit |
| `MERKZEUG_CLICK` | Test steps separated by `;;`: tree label, `menu:ACTION`, `js:CODE`, `helpwindow`, `settingswindow` |
| `MERKZEUG_PDF_TARGET` | Export without a destination dialog; existing files may be overwritten. For bulk export this is a directory |
| `MERKZEUG_TEMPLATES_ROOT` | Override templates root |
| `MERKZEUG_PDF_TEMPLATE` | Force a template regardless of vault assignment |
| `MERKZEUG_CALENDAR_FIXTURE` | Calendar fixture JSON with an `events` array |
| `MERKZEUG_CALENDAR_TRACE` | Write calendar timing diagnostics |

Use synthetic notes/calendar data for fixtures. Never point unattended export tests at existing user PDFs. Native desktop regression testing remains separate from Vite compilation and type checking.
