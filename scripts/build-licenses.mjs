// LICENSE is canonical. Legacy EULA filenames remain for package/store compatibility.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { marked } from 'marked';
const root = new URL('../', import.meta.url);
const mit = await readFile(new URL('LICENSE', root), 'utf8');
for (const lang of ['en', 'de']) {
  const introduction = lang === 'en'
    ? '# Merkzeug — MIT License\n\nMerkzeug is licensed under the MIT License below. Third-party components retain their own licenses; see the bundled third-party notices.\n\n'
    : '# Merkzeug — MIT-Lizenz\n\nMerkzeug steht unter der folgenden MIT-Lizenz. Maßgeblich ist der englische Originaltext. Drittanbieter-Komponenten behalten ihre eigenen Lizenzen; siehe die mitgelieferten Lizenzhinweise.\n\n';
  const license = introduction + '```text\n' + mit + '```\n';
  await writeFile(new URL(`resources/legal/EULA.${lang}.md`, root), license);
  const base = await readFile(new URL(`website/legal-${lang}.html`, root), 'utf8');
  for (const edition of ['', '-intellij']) {
    const name = `license${edition}-${lang}.html`;
    const content = license + (edition ? '\n' + await readFile(new URL(`resources/legal/INTELLIJ-ADDENDUM.${lang}.md`, root), 'utf8') : '');
    let head = base.slice(0, base.indexOf('<main'))
      .replace(/<title>.*?<\/title>/, `<title>${lang === 'en' ? 'MIT License' : 'MIT-Lizenz'}${edition ? ' · IntelliJ' : ''} · Merkzeug</title>`)
      .replaceAll(`legal-${lang}.html`, name)
      .replace(`href="legal-${lang === 'en' ? 'de' : 'en'}.html"`, `href="license${edition}-${lang === 'en' ? 'de' : 'en'}.html"`);
    await writeFile(new URL(`website/${name}`, root), head + '<main id="content" class="legal">' + marked.parse(content) + '</main>' + base.slice(base.indexOf('<footer>')));
  }
}
for (const name of await readdir(new URL('website/', root))) {
  if (!name.endsWith('.html')) continue;
  const file = new URL(`website/${name}`, root);
  let html = await readFile(file, 'utf8');
  const lang = html.includes('<html lang="de"') ? 'de' : 'en';
  if (!html.slice(html.indexOf('<footer>')).includes(`href="license-${lang}.html"`))
    html = html.replace(`<a href="legal-${lang}.html">`, `<a href="license-${lang}.html">${lang === 'en' ? 'License' : 'Lizenz'}</a><a href="legal-${lang}.html">`);
  await writeFile(file, html);
}
console.log('Built shared license views from the canonical MIT LICENSE.');
