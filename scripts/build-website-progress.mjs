// Render release notes as static, localized HTML.
// GitHub remains the planning source; no visitor-side API calls or credentials.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../website/',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const releases=JSON.parse(await read('release-notes.json'));
for(const lang of ['en','de']){
 const en=lang==='en', home=en?'index.html':'de.html', name=`release-notes-${lang}.html`;
 let base=await read(home);
 const latest=releases[0];
 const latestVersion=escape(latest.version);
 const teaserText=latest.status==='released'
  ? (en?`Merkzeug ${latestVersion}${latest.platforms.length === 1 ? ` for ${escape(latest.platforms[0])}` : ''} is available. Read what changed in this release and earlier updates.`:`Merkzeug ${latestVersion}${latest.platforms.length === 1 ? ` für ${escape(latest.platforms[0])}` : ''} ist verfügbar. Lies, was diese Version und frühere Updates mitbringen.`)
  : latest.status==='approved' ? (en?`Version ${latestVersion} is approved by Apple. Explore the features of the first release.`:`Version ${latestVersion} ist von Apple freigegeben. Entdecke die Funktionen der ersten Version.`)
  : (en?`Version ${latestVersion} is being prepared. Read what is included; published updates will appear here as they become available.`:`Version ${latestVersion} wird vorbereitet. Hier findest du die vorgesehenen Inhalte; veröffentlichte Updates kommen hinzu, sobald sie verfügbar sind.`);
 const teaser=`<section id="release-notes" class="feature-section"><p class="eyebrow">Release Notes</p><h2>${en?'What’s new in Merkzeug.':'Was sich in Merkzeug tut.'}</h2><p>${teaserText}</p><a class="button secondary" href="${name}">${en?'Read the release notes':'Release Notes lesen'}</a></section>`;
 base=base.replace(/<!-- progress:start -->[\s\S]*?<!-- progress:end -->/,`<!-- progress:start -->${teaser}<!-- progress:end -->`);
 await writeFile(new URL(home,root),base);
 // Reuse the localized official store badges and widget fallback from the hero.
 const heroDownloads=base.match(/<div class="actions">[\s\S]*?(?=<p class="availability">)/)?.[0];
 if(!heroDownloads)throw Error(`Missing download controls in ${home}`);
 const downloads=`<div class="landing release-downloads">${heroDownloads
  .replace('id="marketplace-install"','id="marketplace-install-release"')
  .replace('/34221-merkzeug/versions/beta','/34221-merkzeug')
  .replace('href="#linux-downloads"',`href="${home}#linux-downloads"`)
  .replace('Marketplace Beta','Marketplace')}</div>`;
 const entries=releases.map((r,index)=>{
  if(!['preparation','approved','released'].includes(r.status))throw Error(`Invalid release state: ${r.status}`);
  const status=r.status==='released'?(en?'Released':'Veröffentlicht'):r.status==='approved'?(en?'Approved by Apple — awaiting App Store activation':'Von Apple freigegeben – App-Store-Freischaltung ausstehend'):(en?'In preparation — not yet available':'In Vorbereitung — noch nicht verfügbar');
  return `<article class="release-entry"><p class="eyebrow">${escape(r.platforms.join(' · '))}</p><h2>Merkzeug ${escape(r.version)}</h2><p class="release-status">${status}${r.date?` · <time datetime="${escape(r.date)}">${escape(r.date)}</time>`:''}</p><ul>${r.highlights[lang].map(t=>`<li>${escape(t)}</li>`).join('')}</ul>${index===0?downloads:''}</article>`;
 }).join('');
 const title=en?'Release notes':'Release Notes';
 const description=en?'Updates and release history for every edition of Merkzeug.':'Updates und Versionsgeschichte aller Merkzeug-Versionen.';
 let head=base.slice(0,base.indexOf('<main'));
 head=head.replace(/<title>.*?<\/title>/,`<title>${title} · Merkzeug</title>`)
 .replace(/<link rel="canonical"[^>]+>/,`<link rel="canonical" href="https://merkzeug.creative-it.com/${name}">`)
 .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*/g,`$1${description}`)
 .replace(/(<meta property="og:title" content=")[^"]*/,`$1${title} · Merkzeug`)
 .replace(new RegExp(`href="${en?'de.html':'index.html'}" lang=`),`href="release-notes-${en?'de':'en'}.html" lang=`);
 const intro=en?'Features, updates and release status for Merkzeug.':'Funktionen, Updates und Veröffentlichungsstatus von Merkzeug.';
 await writeFile(new URL(name,root),head+`<main id="content" class="guide"><h1>${title}</h1><p class="lead">${intro}</p>${entries}<p><a href="${home}">${en?'Back to Merkzeug':'Zurück zu Merkzeug'}</a></p></main>`+base.slice(base.indexOf('<footer>')));
}
console.log('Built localized release notes.');
