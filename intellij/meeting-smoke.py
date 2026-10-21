#!/usr/bin/env python3
"""Headless native test of the IntelliJ meeting-note action and dialog bridge.
Opens no windows, keeps credentials in memory and never touches the user's IDE profile.
Usage: python3 intellij/meeting-smoke.py [de|en]
"""
import os, subprocess, zipfile, shutil, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
IDE = Path(os.environ.get('IDEA_HOME', '/Applications/IntelliJ IDEA.app/Contents'))
TEST = ROOT / 'intellij/build/meeting-smoke'
if TEST.exists(): shutil.rmtree(TEST)
(TEST/'config/options').mkdir(parents=True)
# never touch the macOS keychain from this isolated profile
(TEST/'config/options/security.xml').write_text('<application><component name="PasswordSafe"><option name="PROVIDER" value="MEMORY_ONLY" /></component></application>')
vault = TEST/'vault'; (vault/'Projekte/Kunde A').mkdir(parents=True)
(vault/'Projekte/Kunde A/Plan.md').write_text('# Plan\n')
classes = TEST/'classes'; shutil.rmtree(classes, ignore_errors=True); classes.mkdir()
jars = list((IDE/'lib').glob('*.jar')) + list((IDE/'plugins/jcef-plugin').rglob('*.jar')) + [ROOT/'intellij/build/merkzeug.jar']
subprocess.run([str(IDE/'jbr/Contents/Home/bin/javac'), '-nowarn', '--release', '21', '-classpath', os.pathsep.join(map(str, jars)), '-d', str(classes), str(ROOT/'intellij/src/test/java/com/creativeit/merkzeug/MeetingSmokeStarter.java')], check=True)
plugin = TEST/'plugins/merkzeug/lib'; plugin.mkdir(parents=True)
with zipfile.ZipFile(ROOT/'intellij/build/merkzeug.jar') as src, zipfile.ZipFile(plugin/'merkzeug.jar', 'w') as dst:
    for name in src.namelist():
        data = src.read(name)
        if name == 'META-INF/plugin.xml': data = data.decode().replace('<fileEditorProvider ', '<appStarter id="merkzeugMeetingSmoke" implementation="com.creativeit.merkzeug.MeetingSmokeStarter"/><fileEditorProvider ').encode()
        dst.writestr(name, data)
    for p in classes.rglob('*.class'): dst.write(p, p.relative_to(classes).as_posix())
props = TEST/'idea.properties'
props.write_text('\n'.join([f'idea.config.path={TEST}/config', f'idea.system.path={TEST}/system', f'idea.plugins.path={TEST}/plugins', f'idea.log.path={TEST}/log', f'merkzeug.smoke.root={TEST}', 'idea.initially.ask.config=never']))
vm = TEST/'idea.vmoptions'
lang = sys.argv[1] if len(sys.argv) > 1 else 'de'
vm.write_text((IDE/'bin/idea.vmoptions').read_text() + f'\n-Djava.awt.headless=true\n-Dide.browser.jcef.headless.enabled=true\n-Duser.language={lang}\n')
env = dict(os.environ, IDEA_PROPERTIES=str(props), IDEA_VM_OPTIONS=str(vm))
r = subprocess.run([str(IDE/'MacOS/idea'), 'merkzeugMeetingSmoke'], env=env, timeout=240, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
log = (TEST/'probe.log').read_text() if (TEST/'probe.log').exists() else ''
print(log)
if r.returncode != 0 or 'DONE' not in log: raise SystemExit('Meeting smoke test failed')
