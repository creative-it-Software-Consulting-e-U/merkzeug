# Troubleshooting

## Cannot install or launch

Check the release's operating system, CPU architecture and signing status. Unsigned previews may trigger OS warnings. Prefer a signed release when one is available. On IntelliJ, check the supported IDE build range, enable JCEF, restart after installation and open a local `.md` file.

An IntelliJ error notification is not necessarily a full IDE crash. Note the time and collect the corresponding entry from **Help → Show Log in Finder/Explorer**. Do not assume every plugin warning originates from Merkzeug.

## Changes do not save

Read the error banner first. Check folder permissions, available disk space, the file provider and whether the file changed in another editor. Copy unsaved text somewhere safe before reloading or closing the editor. In IntelliJ, distinguish changes accepted by the IDE from changes saved to disk.

If an iOS folder is no longer available, reopen the provider app and select the folder again in Merkzeug.

## PDF fails or has missing content

- Try a single note without a custom template.
- Check image paths and Mermaid syntax.
- Ensure linked notes are within the index folder hierarchy and are not excluded by `pdf-exclude`.
- On IntelliJ, keep referenced files within the project root.
- Check that logos and other template resources are inside the chosen template folder.
- Compare margins and landscape styles if tables or a cover are clipped.

Dark-theme contrast in the IntelliJ preview's file dialogs is a known issue. It is separate from PDF layout, which uses print styles.

## Report a problem

Use [Merkzeug App Support](https://support.apps.creative-it.com/?app=merkzeug&lang=en). The repository issue tracker will become an additional option when the source is public. Include:

1. Merkzeug version and edition, OS version and CPU architecture; for IntelliJ, the full IDE build.
2. Steps to reproduce, expected result and actual result.
3. A small Markdown example, image or template that reproduces the problem.
4. Relevant error text and a screenshot when it helps.

Remove private notes, credentials, personal calendar details and unrelated log contents before sharing. Use [private security reporting](../../SECURITY.md) for vulnerabilities rather than a public issue.
