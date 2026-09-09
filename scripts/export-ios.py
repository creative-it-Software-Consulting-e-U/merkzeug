#!/usr/bin/env python3
"""Export an existing iOS archive locally using an existing distribution profile. Never upload."""
import argparse
import os
from pathlib import Path
import plistlib
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--profile', required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    profile = args.profile.expanduser().resolve()
    if profile.is_relative_to(root) or args.output.resolve().is_relative_to(root):
        parser.error('Keep provisioning profiles and signed exports outside the repository.')
    env = dict(os.environ)
    # Apple's rsync starts a peer via PATH; Homebrew rsync rejects Apple's -E flag.
    env['PATH'] = '/usr/bin:/bin:/usr/sbin:/sbin'
    data = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(profile)], env=env))
    entitlements = data['Entitlements']
    app_id = entitlements.get('application-identifier', '')
    if ('iOS' not in data.get('Platform', []) or entitlements.get('get-task-allow')
            or data.get('ProvisionedDevices') or data.get('ProvisionsAllDevices')):
        parser.error('An iOS App Store distribution profile is required.')
    if not app_id.endswith('.com.creative-it.merkzeug'):
        parser.error('The profile does not match Merkzeug.')
    options = dict(method='app-store-connect', destination='export', signingStyle='manual',
                   teamID=data['TeamIdentifier'][0], signingCertificate='Apple Distribution',
                   provisioningProfiles={'com.creative-it.merkzeug': data['UUID']},
                   manageAppVersionAndBuildNumber=False, uploadSymbols=True)
    with tempfile.TemporaryDirectory(prefix='merkzeug-export-') as temporary:
        path = Path(temporary) / 'ExportOptions.plist'
        path.write_bytes(plistlib.dumps(options))
        subprocess.run(['xcodebuild', '-exportArchive', '-archivePath', str(args.archive.resolve()),
                        '-exportPath', str(args.output.resolve()), '-exportOptionsPlist', str(path)],
                       env=env, check=True)
    print('Local distribution export complete. Nothing uploaded; TestFlight processing remains unverified.')


if __name__ == '__main__':
    main()
