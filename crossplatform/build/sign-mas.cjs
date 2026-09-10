// Preserve electron-builder's resolved SHA-1 identity. Its default signing path
// replaces that hash with the display name, which codesign can misdecode when
// the certificate owner has non-ASCII characters in their name.
const { signAsync } = require('@electron/osx-sign')
const { chmod } = require('node:fs/promises')
const path = require('node:path')

exports.default = async function signMas(options) {
  if (!/^[A-Fa-f0-9]{40}$/.test(options.identity || '')) {
    throw new Error('MAS signing requires a resolved certificate fingerprint.')
  }
  await signAsync(options)
  // The private source profile may be mode 0600. Its embedded copy is public
  // bundle metadata and must remain readable after the installer sets root ownership.
  if (options.provisioningProfile) {
    await chmod(path.join(options.app, 'Contents', 'embedded.provisionprofile'), 0o644)
  }
}
