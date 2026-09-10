import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, stat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
test('MAS embedding keeps private source protected but makes installed profile readable', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'merkzeug-profile-test-'));
  try {
    const app = path.join(root, 'Merkzeug.app');
    const source = path.join(root, 'private.provisionprofile');
    const embedded = path.join(app, 'Contents', 'embedded.provisionprofile');
    await mkdir(path.dirname(embedded), {recursive: true});
    await writeFile(source, 'synthetic profile', {mode: 0o600});
    const exports: any = {};
    vm.runInNewContext(await readFile(new URL('../../crossplatform/build/sign-mas.cjs', import.meta.url), 'utf8'), {
      exports,
      require: (name: string) => name === '@electron/osx-sign' ? {signAsync: async () => copyFile(source, embedded)} : require(name),
    });
    await exports.default({app, provisioningProfile: source, identity: 'A'.repeat(40)});
    assert.equal((await stat(source)).mode & 0o777, 0o600);
    assert.equal((await stat(embedded)).mode & 0o777, 0o644);
    assert.equal(await readFile(embedded, 'utf8'), 'synthetic profile');
    await assert.rejects(exports.default({identity: 'display name'}), /fingerprint/);
  } finally {await rm(root, {recursive: true, force: true});}
});
