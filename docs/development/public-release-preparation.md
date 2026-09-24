# MIT public-release preparation

Status: **private preparation — not cleared for a visibility change**.

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

## Audit snapshot — 24 September 2026

Source baseline: `dcc7d82dea5689f5c83aaff510a0da2f5373d847`.

- Repository API reports `private`. Existing Pages site and binary-download repository are already public and are not changed by this branch.
- Gitleaks scanned all 179 locally available commits and the working tree without findings. The existing reviewed ignore entry identifies a non-secret issuer UUID. Scan again after fetching all refs immediately before publication. This scan is not a privacy or copyright clearance.
- Git authors are the owner (two Unicode spellings) and Dependabot. Commit authorship alone does not prove ownership of every embedded image, font, sample or dependency.
- Historical media inventory contains 100 distinct raster-image objects and one 38.5-second silent demo video. All nine image contact sheets and video samples taken every three seconds were visually reviewed: icons and synthetic demo material, with no obvious customer content at overview resolution. This is not a full-resolution/every-frame privacy clearance; some settings screenshots include local filesystem paths. Keep media/privacy review separate from credential scanning.
- GitHub artifact inventory: 505 entries, 414 unexpired, approximately 45.12 GB. Includes test screenshots, native validation, unsigned candidates, release matrices and store-upload reports. **These are not all cleared for public access.** Do not equate the current published download packages with all historical Actions artifacts.
- The inventory contains 315 Actions runs. Actions runs/logs are a separate publication surface. A full historical log and attachment review has not been completed. Issues, PR descriptions/comments/attachments, releases and other GitHub surfaces also require privacy review before changing visibility.
- Main has no branch protection and the repository has no rulesets. A `CODEOWNERS` file alone does not enforce reviews.
- Default Actions token permissions are read-only; Actions cannot approve PR reviews. Workflows use `pull_request`, not `pull_request_target`, for untrusted changes, and ordinary checks receive no publisher secrets. Repository API inventories report no self-hosted runners, deploy keys or webhooks. Installed GitHub Apps and organization-level access still need review.
- `app-store-assets` and `github-pages` environments have branch policies but no required reviewers. The `release-signing` environment is absent; existing stable desktop release checks fail closed until it is correctly protected.
- Fork-PR approval policy cannot yet be queried for this private repository (GitHub returns HTTP 422); configure and verify it at public launch.
- Dependency inventory includes permissive licenses and MPL-2.0 components (including ical.js/lightningcss); MIT applies to Merkzeug's own code, not those components. Existing notice generation includes installed build/runtime dependencies and source information for ical.js. It does not certify every platform's optional dependency or historical media asset.

## Remaining gates before going public

1. Complete a privacy/provenance review of all retained historical text/media, GitHub issues/PRs/attachments, logs and artifacts. Record what was reviewed and what is excluded. For old Actions material, obtain explicit owner approval before any permanent deletion; alternatively wait for retention expiry and verify logs separately. Do not silently delete or rewrite history.
2. Resolve any third-party ownership or redistribution issues found in the retained history and bundled assets. Preserve upstream license texts and required source availability, including MPL-covered components. Historical releases keep their existing notices.
3. Protect `main` and release tags: required checks, review of outside contributions, code-owner review for sensitive paths, no force push/deletion, narrowly defined maintainer bypass if needed. Prepare the policy first and verify that the owner's release workflow still works.
4. Put signing/publishing credentials in environments restricted to reviewed main/version-tag code. Require a maintainer approval for signing and store uploads. Check branch/tag policies, secret *scope*, deploy keys, runner access, webhooks and installed apps without exposing secret values. Do not approve an environment while its workflow ref is unreviewed.
5. Require approval for workflows from all outside contributors, use GitHub-hosted runners, and keep public PR checks read-only with no publisher credentials. Pin third-party Actions to reviewed commits where practicable; update with Dependabot.
6. Run the documented fresh-clone checks and build the actual launch candidates under a new release version. Validate MIT text and third-party notices inside each package. Native behavior is not re-certified by a license-only web build.
7. Coordinate the website license pages, App Store Connect license settings and Marketplace license/source URL. Current live store settings do not change when this branch changes. Apple store agreement requirements need a specific review before replacing any custom agreement.
8. Obtain the owner's explicit final go-public instruction. Merge/deploy the prepared copy in the agreed order; change visibility only then. Verify anonymous clone, source links, Actions approval policy, protection rules and public download URLs afterward.

## Validation of this preparation

Passed locally: 54 application tests, 21 release tests, type checking, version consistency (1.2.1), documentation links, all 18 website pages and license consistency. Desktop and mobile web production builds passed. The IntelliJ Marketplace ZIP built using the installed macOS IntelliJ SDK (`IDEA_HOME` may need to point to the user's Applications folder); its English/German bundled licenses contain the canonical MIT text and third-party notices are present. Existing Java deprecation and web chunk-size warnings remain.

These are preparation builds, not new published releases or native iOS/Linux/Windows validation. A clean dependency installation and CI checks should also pass on the private preparation PR. No build was installed over the user's app/plugin.

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
