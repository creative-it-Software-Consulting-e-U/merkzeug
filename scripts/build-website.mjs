// Build the public manuals from the same Markdown shipped in the apps.
import {readFile,writeFile} from 'node:fs/promises';
import {marked} from 'marked';
await import('./build-website-progress.mjs');
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p,root),'utf8');
const slug = text => text.replace(/<[^>]+>/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
const pages=[];
for(const lang of ['en','de']) {
 const base=await read(`website/${lang==='en'?'index.html':'de.html'}`);
 for(const edition of ['desktop','ios','intellij']) {
  const name=edition==='desktop'?`help-${lang}.html`:`help-${edition}-${lang}.html`;
  const source=edition==='desktop'?`crossplatform/resources/help/Help.${lang}.md`:edition==='ios'?`mobile/src/help/Help.${lang}.md`:`docs/user/intellij${lang==='de'?'.de':''}.md`;
  let body=await marked.parse(await read(source));
  if(edition==='intellij') {
   body=body.replace(/href="(?:pdf\.md(?:#[^"]*)?|troubleshooting\.md)"/g, `href="help-${lang}.html"`)
    .replace(/href="\.\.\/\.\.\/resources\/legal\/EULA\.(en|de)\.md"/g, `href="license-intellij-${lang}.html"`)
    .replace(/<p>For failures,[\s\S]*?<\/p>/, '');
  }
  const ids=[];
  body=body.replace(/<h([1-6])>(.*?)<\/h\1>/g,(_,n,text)=>{
   const id=slug(text); ids.push(id); return `<h${n} id="${id}">${text}</h${n}>`;
  });
  body=body.replace(/href="#([^"]+)"/g,(match,fragment)=>{
   const wanted=slug(decodeURIComponent(fragment));
   const number=wanted.match(/^\d+-/)?.[0];
   const id=ids.find(id=>id===wanted)||(number&&ids.find(id=>id.startsWith(number)));
   if(!id) throw Error(`Unresolved manual link ${fragment} in ${source}`);
   return `href="#${id}"`;
  });
  const other=name.replace(`-${lang}`,lang==='en'?'-de':'-en');
  const title=lang==='en'?`Merkzeug ${edition==='desktop'?'Desktop':edition==='ios'?'iPhone & iPad':'IntelliJ IDEA'} Guide`:`Merkzeug ${edition==='desktop'?'Desktop':edition==='ios'?'iPhone & iPad':'IntelliJ IDEA'} – Hilfe`;
  let head=base.slice(0,base.indexOf('<main'));
  head=head.replace(/<title>.*?<\/title>/,`<title>${title}</title>`).replace(/<link rel="canonical"[^>]+>/,`<link rel="canonical" href="https://merkzeug.creative-it.com/${name}">`);
  head=head.replace(new RegExp(`href="${lang==='en'?'de.html':'index.html'}" lang=`),`href="${other}" lang=`);
  const intro=lang==='en'?'Choose your edition: Mac, iPhone & iPad, or IntelliJ IDEA.':'Wähle deine Edition: Mac, iPhone & iPad oder IntelliJ IDEA.';
  const links=`<p><a href="help-${lang}.html">Desktop</a> · <a href="help-ios-${lang}.html">iPhone &amp; iPad</a> · <a href="help-intellij-${lang}.html">IntelliJ IDEA</a></p>`;
  const footer=base.slice(base.indexOf('<footer>'));
  await writeFile(new URL(`website/${name}`,root),head+`<main id="content" class="guide"><p class="notice">${intro}</p>${links}${body}</main>`+footer);
  pages.push(name);
 }
}
const files=['','de.html','release-notes-en.html','release-notes-de.html','privacy-en.html','privacy-de.html','legal-en.html','legal-de.html','license-en.html','license-de.html','license-intellij-en.html','license-intellij-de.html',...pages];
await writeFile(new URL('website/sitemap.xml',root),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+files.map(p=>`<url><loc>https://merkzeug.creative-it.com/${p}</loc></url>`).join('')+'</urlset>\n');
await writeFile(new URL('website/robots.txt',root),'User-agent: *\nAllow: /\nSitemap: https://merkzeug.creative-it.com/sitemap.xml\n');
console.log('Built six localized manuals and sitemap.');

await import('./build-licenses.mjs');
