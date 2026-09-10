# Merkzeug positioning

Merkzeug helps people navigate and edit connected Markdown collections: personal notebooks and documentation in code repositories, including documents written by coding agents.

The name combines the German words *merken* (to remember) and *Werkzeug* (tool): a tool for thoughts worth keeping. Explain this on the English website too.

The main message is **Your Markdown. Connected.** / **Dein Markdown. Im Zusammenhang.** Give personal notebooks and repositories equal prominence. Show concrete outcomes through links, diagrams, visual editing, frontmatter, meeting notes, Git and reusable PDF templates. Merkzeug does not generate documentation or act as a coding agent.

## Platform claims

- macOS: native Git integration, calendar meeting notes, PDF export with templates.
- iOS/iPadOS: Markdown editing and navigation; repository folders through Working Copy's file provider. Git operations happen in Working Copy. Do not advertise native Git commands, calendar integration or PDF export on iOS.
- Windows, Linux, IntelliJ and VS Code: coming soon on the website; describe availability per feature.

## Copy sources

- Website: `website/index.html` and `website/de.html`.
- App Store: `store/metadata/en-US/listing.json` and `store/metadata/de-DE/listing.json`.
- Screenshot captions: `store/automation/captions.json`; compose and review before promoting to `store/upload`.
- Metadata upload: `scripts/upload-store-metadata.mjs --version 1.0` previews descriptions, promotional text, keywords and the shared subtitle. Add `--apply` to update the existing editable drafts and verify by API read-back. Credentials remain outside the repository.

Keep screenshot order: writing, connections, calendar, PDF, Git, then frontmatter. Omit unavailable scenes per platform; mobile uses writing, connections, repository access, frontmatter.
