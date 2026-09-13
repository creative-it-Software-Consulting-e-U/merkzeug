// Advanced iCloud capabilities require a Developer ID provisioning profile even
// outside the Mac App Store. Never give the main app's capabilities to helpers.
const { signAsync } = require('@electron/osx-sign')
const { existsSync, chmodSync } = require('node:fs')
const path = require('node:path')
exports.default = async function signMac(options) {
  const profile = process.env.MERKZEUG_MAC_PROFILE
  if (!profile || !existsSync(profile)) throw new Error('Set MERKZEUG_MAC_PROFILE to the Developer ID iCloud provisioning profile outside the checkout.')
  const root = path.resolve(__dirname, '../..')
  const relative = path.relative(root, path.resolve(profile))
  if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw new Error('Keep provisioning profiles outside the checkout.')
  await signAsync({ ...options, provisioningProfile: profile })
  chmodSync(path.join(options.app, 'Contents/embedded.provisionprofile'), 0o644)
}
