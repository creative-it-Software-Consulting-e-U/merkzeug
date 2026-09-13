# Additional iOS Git clients: defer

Evaluation date: 10 September 2026. No user-demand evidence for a specific second client was supplied. The maintainer's private iPhone is excluded and no separate physical test device is available in this task. Therefore no device proof of concept or second-client support claim is made.

| Candidate | Licensing / activity evidence | File access and actions | Decision |
| --- | --- | --- | --- |
| Working Copy | Proprietary; current official command documentation; push requires unlocking | Explicit repository, pull/commit/push and callback protocol; Files-based access is the existing Merkzeug workflow | Primary integration; physical acceptance pending |
| a-Shell | BSD-3-Clause; active repository, last push 2026-09-10 | General terminal and automation facilities; repository-specific success/cancel/error and coordinated File Provider behavior have not been verified | Defer dedicated integration; folder compatibility alone is not action support |
| iSH | GPLv3 with additional iOS terms and contribution-specific GPLv2 licensing; last push 2026-08-22; inspect upstream LICENSE.md/LICENSE.IOS before redistribution | Linux shell environment; a terminal Git workflow does not establish a compatible authenticated callback protocol | Defer dedicated integration; no device proof of concept |

Primary sources: [Working Copy commands](https://workingcopyapp.com/url-schemes.html), [a-Shell source and README](https://github.com/holzschu/a-shell), [iSH source and README](https://github.com/ish-app/ish).

To accept another client, record its exact version, license, recent maintenance evidence, provider folder access, pull/commit/push commands, callbacks, cancellation, offline errors, conflicts and return/refresh behavior on both iPhone and iPad. Confirm a concrete user need. Then open a separate implementation issue; do not silently generalize Working Copy's protocol to another app.
