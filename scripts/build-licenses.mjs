// One reviewed source for bundled licenses and the public website.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { marked } from 'marked';
const root = new URL('../', import.meta.url);
for (const lang of ['en', 'de']) {
  const license = await readFile(new URL(`resources/legal/EULA.${lang}.md`, root), 'utf8');
  if (lang === 'en') await writeFile(new URL('LICENSE', root), license);
  const base = await readFile(new URL(`website/legal-${lang}.html`, root), 'utf8');
  const name = `license-${lang}.html`;
  let head = base.slice(0, base.indexOf('<main'))
    .replace(/<title>.*?<\/title>/, `<title>${lang === 'en' ? 'End User License' : 'Endnutzerlizenz'} · Merkzeug</title>`)
    .replaceAll(`legal-${lang}.html`, name)
    .replace(`href="legal-${lang === 'en' ? 'de' : 'en'}.html"`, `href="license-${lang === 'en' ? 'de' : 'en'}.html"`);
  await writeFile(new URL(`website/${name}`, root), head + '<main id="content" class="legal">' + marked.parse(license) + '</main>' + base.slice(base.indexOf('<footer>')));
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
console.log('Built the shared English/German license pages and bundled LICENSE.');
