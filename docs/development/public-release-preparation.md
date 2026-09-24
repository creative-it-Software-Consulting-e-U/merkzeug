# MIT public-release preparation

Status: **private preparation; audit and available protection controls completed within the scope below. Public launch remains explicitly owner-gated.**

The owner selected the unmodified MIT License. This preparation does not publish the repository, deploy the website, upload new store binaries, rewrite history or delete Actions data. Keep the preparation branch separate from `main`: merging website/license changes would deploy the website automatically.

## Prepared source changes

- Root `LICENSE` is the canonical MIT text; workspace manifests and root lock metadata use `MIT`. `private: true` only prevents accidental npm publication.
- `scripts/build-licenses.mjs` derives the English/German app and website views from it. The historical `EULA.*.md` filenames remain for packaging/store compatibility; they no longer contain proprietary restrictions.
- The IntelliJ note explains publisher affiliation without adding MIT conditions. Third-party license notices remain separate.
- `npm run check:licenses` checks bundled and website views against the canonical license. CI runs it after generation.
- Contribution terms use inbound MIT without copyright assignment. Branding guidance is a request for distinct fork names, not an invented enforceable MIT rename condition or an assertion of registered trademark status.
- User help, plugin description, Marketplace upload instructions and repository README describe the MIT release. Historical changelog entries remain historical.
- No store version or marketing version is changed by this preparation. Build a new release version for the public launch; never overwrite existing proprietary binaries with different content under the same version.
- Existing `merkzeug-downloads` release URLs remain intact. There is no need to split platform source repositories.

## Completed audit — 24 September 2026

Source baseline: `dcc7d82dea5689f5c83aaff510a0da2f5373d847`, plus the private preparation branch and fetched historical PR heads. Detailed evidence is retained outside Git in the owner's private local audit directory; do not commit raw logs or inventories.

| Surface | Coverage and outcome |
| --- | --- |
| Git history | All advertised branch/tag refs and 39 PR heads fetched; 212 reachable commits and 1,900 distinct text blobs inventoried. Gitleaks inspected 190 patch-bearing commits and the working tree without leaks. A separate blob scan flags the known public Apple issuer UUID in old documentation; it is not a credential. |
| Git media | 100 raster objects: contact-sheet review and full-resolution OCR; one 38.5-second silent demo video sampled every three seconds. No apparent customer material found. |
| Issues and PRs | 55 issue/PR bodies, three issue comments, all 39 PR review endpoints, commit messages, commit-comment and review-comment inventories reviewed/scanned. No review bodies, inline review comments, commit comments, releases or uploaded issue attachments were present. Wiki and Discussions are disabled. |
| Actions logs | All 316 runs downloaded; 1,175 text log entries scanned with no secret findings. |
| Artifacts | All 414 unexpired artifact manifests inspected. All 213 artifacts containing PDF, ZIP/JAR or website TAR payloads were read recursively within the documented size bounds, with transient fetch failures successfully retried. 2,142 distinct text files scanned with no secrets. No credential filenames found. |
| Generated PDFs | 395 distinct PDFs extracted and scanned, no extraction errors or secret findings. Contents are synthetic acceptance/demo material. |
| Artifact images | 183 distinct images processed with full-resolution OCR; 110 screenshots also reviewed in contact sheets. No apparent customer material found; observed scenes are the garden/notebook fixtures and acceptance tests. |
| Public identifiers | Publisher contact details, upstream copyright-author addresses and GitHub/Apple build identifiers remain intentionally present. A scanner flag in a German commit message mentioning Dropbox is ordinary prose, not a token. No new scanner ignore rule was added. |

This is a source, text, metadata and media privacy review, not a forensic certification of every executable. The 397 native installer entries (AppImage/DEB/RPM/EXE/DMG) were classified by artifact metadata; they were not mounted, executed or decompiled during this audit. Nested archive members over 50 MB and non-text native executable bytes are outside this review. Existing build/acceptance provenance remains relevant to those packages. OCR and sampled video review have detection limits. No evidence requiring deletion or history rewriting was found in the reviewed material; none was deleted remotely.

The audit is a dated snapshot. Recheck added commits, comments, uploads and Actions output immediately before the separately authorized visibility change.

## Security controls applied

See the [public security policy](public-security-policy.md) for the exact rules and public-launch procedure.

- Main now requires an up-to-date GitHub Actions `checks` result, resolved conversations and reviews, with administrator enforcement. Force push and deletion are prohibited. Only the sole maintainer has a review-requirement exception; required checks still apply. CODEOWNERS takes effect when this preparation is merged.
- Two active tag rulesets restrict `v*` creation to administrators and prohibit tag updates/deletion without bypass.
- Actions tokens default to read-only and cannot approve PRs. Only local/GitHub-owned Actions are permitted; prepared workflows pin all eight external Action references to commit SHAs and disable checkout credential persistence. Dependabot remains enabled.
- Publication/signing environments have exact main/version-tag policies. The iCloud Developer ID profile was moved from repository-wide scope into `release-signing`; Apple API credentials remain in `app-store-assets`. There are no repository-level or inherited organization Actions secrets.
- No deploy keys, repository webhooks or self-hosted runners were found. Organization GitHub Apps were inventoried; their existing access was neither expanded nor removed. The owner is the sole repository collaborator.
- GitHub Team rejects required environment reviewers while the repository is private (HTTP 422). `scripts/configure-public-environments.py` prepares/verifies that step after an independently authorized visibility change; it refuses to operate while private and never changes visibility itself. The same launch step enables approval for all outside-contributor workflows.
- Stable signed desktop builds continue to fail closed while required reviewer protection is unavailable. The actual App Store/Xcode Cloud workflows were not changed or triggered.

## Remaining owner-gated launch steps

1. Approve the actual public launch separately. Until then, keep the repository private and this PR unmerged; merging website/license changes would deploy the site.
2. Follow the security-policy cutover sequence: temporarily pause Actions, coordinate the reviewed merge/visibility change, activate required environment reviewers and outside-contributor workflow approval, disable administrator environment bypass in the UI, verify settings, and restore Actions. No Enterprise upgrade is needed once public.
3. Recheck the privacy delta since this snapshot. Preserve third-party notices. Source links for installed MPL components and package archive locations are now generated from their actual versions; platform-specific optional dependencies still need their normal release-build notices.
4. Build new MIT release candidates under a new release version and coordinate website/App Store/Marketplace licensing and source links. Do not overwrite existing proprietary binaries or silently replace published store agreements. Native release acceptance remains part of that release, not a claim made by this preparation.

No repository split is required. Existing public binary download URLs remain intact. Name/trademark registration is a separate decision; the unmodified MIT License has no mandatory fork-renaming clause.

## Validation of this preparation

Passed locally: 54 application tests, 23 release tests, type checking, version consistency (1.2.1), documentation links, all 18 website pages and license consistency. Desktop and mobile web production builds passed. The IntelliJ Marketplace ZIP built using the installed macOS IntelliJ SDK (`IDEA_HOME` may need to point to the user's Applications folder); its English/German bundled licenses contain the canonical MIT text and third-party notices are present. Existing Java deprecation and web chunk-size warnings remain.

These are preparation builds, not new published releases or native iOS/Linux/Windows validation. The first preparation commit passed the private PR CI with a clean dependency installation; the hardening update is checked again before handoff. No build was installed over the user's app/plugin.

## Useful checks

```sh
npm run check:secrets
node scripts/build-website.mjs
npm run check:licenses
npm run check:docs
python3 scripts/check-website.py
npm test
npm run test:release
npm run typecheck
npm run build:desktop
npm run build:mobile
npm run build:intellij
```

The license generator must not modify `LICENSE`. Never insert credential values into reports. Keep detailed privacy findings and unredacted inventories outside the repository that will become public.

References: [MIT text](https://opensource.org/license/mit), [GitHub visibility consequences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).
