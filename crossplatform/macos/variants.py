"""Mac App Store editions: production and the isolated TestFlight staging app."""
from dataclasses import dataclass

TEAM_ID = '3BNJ4M9R56'


@dataclass(frozen=True)
class Variant:
    name: str
    bundle_id: str
    product: str
    container: str
    entitlements: str
    scheme: str

    @property
    def app(self) -> str:
        return f'{self.product}.app'

    @property
    def app_group(self) -> str:
        return f'{TEAM_ID}.{self.bundle_id}'


VARIANTS = {
    'production': Variant('production', 'com.creative-it.merkzeug', 'Merkzeug',
                          'iCloud.com.creative-it.merkzeug', 'build/entitlements.mas.plist', 'Merkzeug-macOS'),
    # Own App Store Connect app, Xcode Cloud product, sandbox container and iCloud
    # container, so staging builds never touch production data or build numbers.
    'staging': Variant('staging', 'com.creative-it.merkzeug.staging', 'Merkzeug Staging',
                       'iCloud.com.creative-it.merkzeug.staging', 'build/entitlements.mas.staging.plist',
                       'Merkzeug-macOS-Staging'),
}


def by_bundle_id(bundle_id: str) -> Variant:
    for variant in VARIANTS.values():
        if variant.bundle_id == bundle_id: return variant
    raise SystemExit(f'Unknown Mac App Store bundle identifier: {bundle_id}')


def by_scheme(scheme: str) -> Variant:
    for variant in VARIANTS.values():
        if variant.scheme == scheme: return variant
    raise SystemExit(f'Unknown Mac App Store scheme: {scheme}')
