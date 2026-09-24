# Public repository security policy

The owner remains responsible for release approval. Preparing these controls does not authorize publication.

## Applied while private

- `main`: pull requests, one review for outside contributors, stale reviews dismissed, code-owner review, resolved conversations, and the GitHub Actions `checks` check on an up-to-date branch. Checks also apply to administrators. Force pushes and deletion are disabled.
- The sole maintainer `guentherwieser` may bypass the **review requirement**, so their own PRs do not require a nonexistent second maintainer. This does not waive required checks. Revisit this exception when another maintainer joins.
- Version tags `v*`: only repository administrators may create them; updates and deletion are prohibited, with no ruleset bypass for those operations. Mistakes require a new version tag, not a moved release tag.
- Actions: default read-only token, no workflow PR approvals, only repository-local and GitHub-owned Actions allowed. All external Action references in the prepared workflows use commit SHAs; Dependabot tracks updates.
- `github-pages`: only `main`. `app-store-assets`: only `main` and `v*` tags. `release-signing`, `release-validation` and `release-publishing`: only `v*` tags.
- App Store API credentials stay in `app-store-assets`; the Developer ID iCloud profile was moved into `release-signing`. No repository-level or inherited organization Actions secrets remain.
- No repository deploy keys, webhooks or self-hosted runners were found. Organization-installed integrations retain their existing permissions; none were uninstalled or expanded.

Required environment reviewers are unavailable for this **private Team-plan** repository (the API returns HTTP 422). Ref restrictions are active now. Stable signed desktop builds already fail closed when reviewers are missing. Apple Xcode Cloud is a separate system; this work changes neither its workflows nor its signing.

## Explicit public-launch step

Only after the owner authorizes the actual launch:

1. Finish the release/privacy checklist and recheck changes since the audit. Coordinate MIT website/store settings and the new version separately. Do not overwrite existing releases.
2. Pause GitHub Actions during the visibility transition so newly allowed outside contributors cannot run before their approval policy is set. Record the prior Actions policy. This is a short, explicit maintenance step, not part of the preparation branch.
3. Merge the reviewed preparation and change visibility using the owner's approved sequence. Neither the scripts below nor this document perform those actions.
4. Run `python3 scripts/configure-public-environments.py --apply`. It requires the repository to already be public, installs the maintainer as reviewer on publication environments, preserves exact ref restrictions and requires approval for all outside contributors' workflows. It never changes visibility or starts a deployment.
5. Disable administrator bypass in each protected environment's GitHub settings UI. Keep self-approval available for the sole maintainer: the required pause is still an explicit human review, not automatic release approval.
6. Run `python3 scripts/configure-public-environments.py` to verify reviewer/ref/contributor policies. Restore Actions with read-only defaults and the GitHub-owned allowlist. Review deployment requests individually; do not approve unreviewed branch/tag code.
7. Run the final MIT release builds and verify anonymous clone, license links, download integrity and actual store settings. Recheck the privacy delta from any new runs before enabling public downloads.

A passing policy check is not a privacy assessment or authorization to release. The switch remains a separate owner decision.

## Ongoing maintenance

Review Dependabot Action updates as code changes, including the upstream diff behind the SHA. Keep contributor builds free of publisher credentials and use synthetic data in screenshot/PDF tests. Review integration access when tools or maintainers change. Re-run license, secret and release checks before each release; retain only useful CI artifacts with short retention periods.

References: [GitHub environment availability](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Actions approval policies](https://docs.github.com/en/rest/actions/permissions).
