# Merkzeug for Visual Studio Code

Merkzeug is a visual Markdown editor with formatting tools, Mermaid diagrams, frontmatter, PDF export and printing. Your notes stay ordinary Markdown files in your workspace.

## Visual editing alongside the Markdown source editor

Merkzeug is an additional editor for `.md` files. Choose **Open in Merkzeug** in the editor title bar or Explorer context menu, or **Open With… → Merkzeug**. **Show Markdown Source** returns to VS Code's text editor. Both views edit the same VS Code document, so saving, Git integration, Undo/Redo and hot exit work as usual.

## Images stay with their notes — including rename and move

Images inserted or pasted into `Plan.md` are saved as separate files in the sibling folder `Plan.assets/`, referenced by relative paths. When you rename or move `Plan.md` in VS Code, `Plan.assets/` follows it, and local Markdown links in other workspace notes are updated in the same undoable operation. Existing destinations are never merged or overwritten.

## Fits your VS Code workflow

- PDF export and printing with templates, headers/footers, cover pages, diagrams and optional linked documents.
- Appearance follows the VS Code color theme, with optional PDF content styles while editing.
- Portable vault templates, a bundled starter, and automatic discovery of desktop Merkzeug templates.
- Copyable template styling prompts with an offline technical reference for coding agents.
- Optional attachment guidance for coding agents in explicitly selected `AGENTS.md` or `CLAUDE.md` files.
- Settings live in VS Code's Settings editor under **Extensions → Merkzeug**.

PDF export and printing use an installed Chromium-based browser (Google Chrome, Microsoft Edge, Chromium or Brave).

Merkzeug is licensed under the MIT License. See the [user guide](https://github.com/creative-it-Software-Consulting-e-U/merkzeug/blob/main/docs/user/vscode.md).
