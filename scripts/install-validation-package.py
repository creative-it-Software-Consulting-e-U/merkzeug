#!/usr/bin/env python3
"""Install/extract a candidate in an isolated runner directory, then test that executable."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('package',type=Path);p.add_argument('output',type=Path);p.add_argument('--arch',required=True)
a=p.parse_args(); package=a.package.resolve(); output=a.output.resolve(); output.mkdir(parents=True,exist_ok=True)
install=Path(tempfile.mkdtemp(prefix='merkzeug-install-'))
method=''
if package.suffix=='.dmg':
    mount=install/'mounted'; mount.mkdir()
    subprocess.run(['hdiutil','attach',str(package),'-readonly','-nobrowse','-mountpoint',str(mount)],check=True)
    try:
        apps=list(mount.glob('*.app'))
        if len(apps)!=1: raise ValueError('Expected one app in DMG')
        target=install/apps[0].name
        subprocess.run(['ditto',str(apps[0]),str(target)],check=True)
    finally: subprocess.run(['hdiutil','detach',str(mount)],check=True)
    executable=target/'Contents/MacOS/Merkzeug'; method='Mounted read-only DMG and installed app by copying bundle'
elif package.suffix=='.exe':
    # NSIS requires /D to be the final argument. This installs only on an ephemeral runner.
    subprocess.run([str(package),'/S',f'/D={install}'],check=True)
    executable=install/'Merkzeug.exe'; method='NSIS silent installation into isolated directory'
elif package.suffix=='.deb':
    subprocess.run(['sudo','dpkg','-i',str(package)],check=True)
    files=subprocess.check_output(['dpkg','-L','merkzeug'],text=True).splitlines()
    executable=next(Path(f) for f in files if f.endswith('/merkzeug') and Path(f).is_file())
    method='Native dpkg installation on disposable Ubuntu runner'
elif package.suffix=='.AppImage':
    package.chmod(package.stat().st_mode|0o111)
    subprocess.run([str(package),'--appimage-extract'],cwd=install,check=True,stdout=subprocess.DEVNULL)
    executable=install/'squashfs-root/merkzeug'; method='AppImage extraction and execution (FUSE integration not exercised)'
else: raise ValueError('Native RPM installation requires a separate RPM-based system')
(output/'installation.json').write_text(json.dumps({'package':package.name,'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'method':method,'executable':str(executable)},indent=2)+'\n')
subprocess.run(['node','scripts/native-acceptance.mjs',str(executable),str(output),a.arch],check=True)
