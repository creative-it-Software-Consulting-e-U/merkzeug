# App Store screenshot uploads

Screenshot generation and Store listing updates are separate operations. Xcode Cloud creates the iPhone/iPad captures; the Electron GitHub workflow creates Mac captures. A release uploads a **reviewed, version-controlled bundle** from `store/upload/`, not arbitrary images from the latest CI run. This keeps an unrelated UI build from changing a prepared Store listing.

## When to upload

Screenshots do not need replacing for every binary build. Retain them while they accurately represent the released UI. Update the bundle when screens, capabilities, captions, localization or required display sizes change. New Store versions may reuse existing media; the API checks the selected version's actual sets.

The `Build release draft` manual workflow has a `screenshots` input:

| Value | Behavior |
| --- | --- |
| `keep` (default) | No Store API call and no screenshot credentials used. Tag pushes also default to keep. |
| `if-missing` | Populate empty/missing selected sets; resume incomplete groups belonging to this bundle; preserve other populated complete sets. |
| `sync` | Make the selected sets match the reviewed bundle, including order. Skip identical images. |

Choose the iOS, macOS or both Store platforms separately from the direct-download binary editions. The upload runs after source/version checks, independently of direct-download signing. It never submits for review, uploads an app binary, edits descriptions, or publishes a version.

For Xcode Cloud/App Store releases that do not use GitHub's binary-release workflow, run **Upload App Store screenshots** independently on `main` or an existing version tag. Supply the exact existing Store version and platforms. Start with `apply=false` for a read-only plan, then use `apply=true`. This is also how to upload screenshots later without rebuilding binaries. The source `VERSION` is used when called by the binary-release workflow; the standalone workflow permits the separately selected Store version. Missing versions/localizations are errors and are never silently created or guessed.

## Preparing a new reviewed bundle

Export successful Xcode Cloud result bundles with `export-screenshot-results.py`. Download the Mac `macos-screenshot-candidates` artifact and locate its `store-macos` directory. After reviewing all scenes against the release candidate:

```sh
python3 scripts/prepare-store-upload.py \
  --ios /tmp/cloud-export --mac /tmp/mac-artifact/store-macos \
  --output /tmp/reviewed-upload
node scripts/upload-store-screenshots.mjs --manifest /tmp/reviewed-upload/manifest.json --validate-only
```

Replace `store/upload/` with that reviewed output in a PR. The preparer checks capture-manifest hashes and includes only captioned store PNGs, for English and German. Mac order: writing, connections/diagrams, calendar meeting notes, PDF templates, Git, frontmatter. Mobile order: writing, connections/diagrams, Working Copy/Git, frontmatter; calendar integration and PDF generation are not available in this iOS edition. The bundle records source-manifest hashes and image SHA-256. The uploader validates dimensions, opacity, containment, hashes and group uniqueness before accessing Apple. Public fictional artwork and its manifest can be committed; credentials cannot.

## Credentials and environment

Configure the GitHub environment **app-store-assets** to allow the `main` branch and `v*` tags only. Upload jobs never run on pull requests or arbitrary branches. Store these three secrets in that environment:

- `ASC_KEY_ID`: App Store Connect API key ID.
- `ASC_ISSUER_ID`: the team issuer ID.
- `ASC_PRIVATE_KEY_BASE64`: base64 of the P8 private key, transferred through secret-manager/CLI stdin, never pasted into source or logs.

Use a key with the necessary App Store management rights. A reused team key may reach other apps; its owner must authorize reuse and storage. The bundle's app ID is Merkzeug's `6799114334`. A separate narrower credential is preferable when available. Do not export the key into Actions artifacts. Node's built-in crypto creates a ten-minute ES256 JWT in memory; no Fastlane dependency or third-party JWT package is required.

Local operation accepts the same secret environment variables:

```sh
# Secret values must already be supplied securely by the environment.
node scripts/upload-store-screenshots.mjs --version 1.0 --mode if-missing
node scripts/upload-store-screenshots.mjs --version 1.0 --mode if-missing --apply
```

The default command is a read-only plan. `--validate-only` requires no credentials or network. The JSON report records selected groups, actions and verification outcomes without JWTs, private keys or signed upload URLs.

## Replacement, failure and recovery

The uploader preflights every selected version, locale and set before changing anything. It reserves assets, uploads Apple's exact byte ranges without the API bearer token, commits the original-file MD5, and polls until `COMPLETE` and the original-file checksum is visible (Apple may publish these at different times). Existing complete images stay in place until all desired replacements in that set have completed processing. It then removes superseded images, applies the desired order and verifies final checksums/count/order.

Apple permits ten screenshots per set. If existing images leave insufficient staging space, the preflight fails without deleting them. Review and reduce that set manually before retrying. Sets are updated sequentially, not as a cross-platform transaction: a later failure can leave earlier sets successfully updated. Re-run to reconcile; completed matching images are reused, pending managed uploads are resumed, and failed managed reservations can be recreated. Other display sizes and locales are untouched. A failed write is not automatically retried blindly.

GitHub serializes all upload workflows for this app. Avoid simultaneous manual edits in App Store Connect while an upload runs. Verify the retained report and Store media manager before submission. Store asset processing has a bounded timeout; a successful build alone does not establish successful screenshot processing.

API references: [upload protocol and MD5](https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect), [display types](https://developer.apple.com/documentation/appstoreconnectapi/screenshotdisplaytype), [screenshot sets](https://developer.apple.com/documentation/appstoreconnectapi/app-screenshot-sets).

## Store descriptions and promotional text

The reviewed English/German descriptions, promotional text and platform-specific keywords live in `store/metadata/*/listing.json`. Mac copy highlights Git controls and PDF templates; iOS explains access through Working Copy and explicitly states that Git operations remain in that app and PDF export requires desktop Merkzeug.

With the same secure API environment, run `node scripts/upload-store-metadata.mjs --version 1.0` to preflight, then add `--apply`. It updates only description, promotional text and keywords on the exact editable iOS/macOS version, verifies them by reading back, and saves prior values in the local report. It does not submit or publish the app. Use `--validate-only` to check local copy without credentials.
