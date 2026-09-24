// Fail when packaged license views drift from the canonical MIT license.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const mit = await read('LICENSE');
assert(mit.startsWith('MIT License\n'), 'Root LICENSE must be MIT');
assert(mit.includes('Permission is hereby granted, free of charge'), 'Missing MIT permission');
for (const lang of ['en', 'de']) {
  const view = await read(`resources/legal/EULA.${lang}.md`);
  assert.equal(view.split('```text\n')[1]?.split('```')[0], mit, `Stale ${lang} bundled license`);
  for (const edition of ['', '-intellij']) {
    const html = await read(`website/license${edition}-${lang}.html`);
    const decoded = html.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
    assert(decoded.includes(mit), `Stale ${edition || 'general'} ${lang} website license`);
    assert(!/proprietary software|proprietäre Software/i.test(html), 'Obsolete license restriction');
  }
}
const lock = JSON.parse(await read('package-lock.json'));
for (const workspace of ['', 'packages/core', 'packages/editor', 'packages/export', 'crossplatform', 'mobile', 'intellij/web']) {
  assert.equal(JSON.parse(await read(`${workspace ? workspace + '/' : ''}package.json`)).license, 'MIT');
  assert.equal(lock.packages[workspace].license, 'MIT', `Stale ${workspace} lock license`);
}
console.log('MIT license matches all localized bundled/site views and workspace metadata.');
