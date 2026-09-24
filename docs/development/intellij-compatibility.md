# IntelliJ compatibility and Stable release

## Version 1.2.0 — checked 24 September 2026

Declared range: **262.10315.125–262.*** (IDEA 2026.2.2 and later 2026.2 patches), with JCEF enabled. The build SDK remains pinned independently in `intellij/sdk.json`.

| IntelliJ IDEA | Build | Plugin Verifier 1.410 | Native functional checks |
| --- | --- | --- | --- |
| 2026.2.2 | 262.10315.125 | Compatible, two deprecated API usages | Not repeated for this submission |
| 2026.2.3 | 262.10968.63 | Compatible, two deprecated API usages | Passed in isolated macOS profile |
| 2026.3 EAP | 263.5153.40 | Compatible, same two deprecated API usages | Not tested; outside declared range |

The native suite covered document synchronization, stale writes, save, undo/redo, paired image-folder Move/Rename, incoming Markdown links, collisions, template discovery and vault settings, prompt selection, table contrast, Mermaid/template preview, PDF generation, PDF scope cancellation, and Print-handler selection. This does not establish native acceptance on Windows/Linux or in every JetBrains IDE listed automatically by Marketplace dependencies.

The remaining deprecations are `MarkdownParser(MarkdownFlavourDescriptor)` and `buildMarkdownTreeFromString(String)` in `MarkdownLinkRefactoring.spans`. There are no reported binary compatibility errors. Replace these APIs before their removal, with regression tests for link ranges and refactoring.

Exact submitted ZIP SHA-256:

```text
099a6b93fd8afeabcca1a7fe141bc90434453a869f9f5f69ea873af17d67fac3
```

Only the inner JAR's `META-INF/plugin.xml` differs from the earlier 1.2.0 beta archive: compatibility ceiling and description. Program code is unchanged.

[Stable submission 1178352](https://plugins.jetbrains.com/plugin/34221-merkzeug/edit/versions/stable/1178352) was uploaded successfully and is **Under review**. The hidden-release option was not selected, so approval publishes it automatically. The existing beta submission is retained. Website availability should switch from beta to Stable only after approval.

## Maintenance policy

- Before each plugin release, run Plugin Verifier on the exact marketplace ZIP against the minimum supported build and latest supported stable patch; run the isolated native smoke suite against the latest stable IDE.
- Check each new 2026.2 patch when available. `262.*` allows installation on future patches, but is not evidence that an unreleased patch has been tested.
- Check EAP builds periodically as early warning. Before adding a new branch such as `263.*`, run both binary and native tests, review changed/deprecated APIs and update SDK metadata and documentation. An EAP verifier pass alone does not authorize support.
- Review Marketplace's own verifier/runtime results and user crash reports after submission. Address compatibility errors before publication; track deprecations before they become removals.
- Keep `plugin.xml`, SDK metadata, Marketplace copy and both user guides consistent. Stable is the default empty upload channel, not a custom channel named `stable`.
- These are maintenance instructions, not an automatically scheduled monitor.

Build with `python3 intellij/build.py --marketplace`, then run `python3 intellij/smoke.py` with the approved `IDEA_HOME`. Run `java -jar verifier.jar check-plugin intellij/dist/merkzeug-1.2.0.zip IDE_PATH -verification-reports-dir REPORT_PATH` for each target. Run verifier processes sequentially: their default extracted-plugin cache is shared.

Sources: [build ranges](https://plugins.jetbrains.com/docs/intellij/build-number-ranges.html), [Plugin Verifier](https://plugins.jetbrains.com/docs/intellij/plugin-verifier.html), [release channels](https://plugins.jetbrains.com/docs/marketplace/custom-release-channels.html).
