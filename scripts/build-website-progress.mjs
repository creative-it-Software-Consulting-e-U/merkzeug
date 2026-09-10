// Render editorial roadmap labels and release notes as static, localized HTML.
// GitHub remains the planning source; no visitor-side API calls or credentials.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../website/',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roadmap=JSON.parse(await read('roadmap.json'));
const releases=JSON.parse(await read('release-notes.json'));
for(const lang of ['en','de']){
 const en=lang==='en', home=en?'index.html':'de.html', name=`release-notes-${lang}.html`;
 let base=await read(home);
 const states=en?{review:'In review & testing',planned:'Planned',exploring:'Exploring'}:{review:'In Prüfung & Test',planned:'Geplant',exploring:'In Evaluierung'};
 const groups=Object.entries(states).map(([status,label])=>{
  const items=roadmap.items.filter(i=>i.status===status).map(i=>`<li><span class="roadmap-title">${escape(i.title[lang])}</span><span class="caption">${escape(i.platform.split(' / ')[en?0:1]||i.platform)}</span><span class="issue-links">${i.issues.map(n=>`<a href="https://github.com/creative-it-Software-Consulting-e-U/merkzeug/issues/${n}" aria-label="${escape(i.title[lang])} — GitHub #${n}">#${n}</a>`).join(' ')}</span></li>`).join('');
  return `<div class="roadmap-group"><h3>${label}</h3><ul class="roadmap-list">${items}</ul></div>`;
 }).join('');
 const roadmapHtml=`<section id="roadmap" class="feature-section"><p class="eyebrow">${en?'What comes next':'Was als Nächstes kommt'}</p><h2>${en?'A tool that keeps growing.':'Ein Werkzeug, das weiterwächst.'}</h2><p>${en?'Our next steps, in plain language. Plans can change; these are not promised release dates. Each item links to its GitHub issue.':'Unsere nächsten Schritte, kurz und verständlich. Pläne können sich ändern; feste Veröffentlichungstermine sind damit nicht verbunden. Jeder Eintrag verlinkt das zugehörige GitHub-Ticket.'}</p>${groups}${roadmap.sourceAccess==='repository-members'?`<p class="caption">${en?'The roadmap above is public. GitHub details currently require access to the private repository.':'Die Roadmap oben ist öffentlich. Die Details auf GitHub benötigen derzeit Zugriff auf das private Repository.'}</p>`:''}<p class="caption">${en?'Last reviewed':'Zuletzt abgeglichen'}: <time datetime="${roadmap.updated}">${roadmap.updated}</time> · <a href="${roadmap.source}">${en?'Full roadmap on GitHub':'Vollständige Roadmap auf GitHub'}</a></p></section>`;
 const latest=releases[0];
 const latestVersion=escape(latest.version);
 const teaserText=latest.status==='released'
  ? (en?`Merkzeug ${latestVersion} is available. Read what changed in this release and earlier updates.`:`Merkzeug ${latestVersion} ist verfügbar. Lies, was diese Version und frühere Updates mitbringen.`)
  : (en?`Version ${latestVersion} is being prepared. Read what is included; published updates will appear here as they become available.`:`Version ${latestVersion} wird vorbereitet. Hier findest du die vorgesehenen Inhalte; veröffentlichte Updates kommen hinzu, sobald sie verfügbar sind.`);
 const teaser=`<section id="release-notes" class="feature-section"><p class="eyebrow">Release Notes</p><h2>${en?'What’s new in Merkzeug.':'Was sich in Merkzeug tut.'}</h2><p>${teaserText}</p><a class="button secondary" href="${name}">${en?'Read the release notes':'Release Notes lesen'}</a></section>`;
 base=base.replace(/<!-- progress:start -->[\s\S]*?<!-- progress:end -->/,`<!-- progress:start -->${roadmapHtml}${teaser}<!-- progress:end -->`);
 await writeFile(new URL(home,root),base);
 const entries=releases.map(r=>{
  if(!['preparation','released'].includes(r.status))throw Error(`Invalid release state: ${r.status}`);
  if(r.status==='released'&&!r.date)throw Error('Published releases require their actual publication date');
  const status=r.status==='released'?(en?'Released':'Veröffentlicht'):(en?'In preparation — not yet available':'In Vorbereitung — noch nicht verfügbar');
  return `<article class="release-entry"><p class="eyebrow">${escape(r.platforms.join(' · '))}</p><h2>Merkzeug ${escape(r.version)}</h2><p class="release-status">${status}${r.date?` · <time datetime="${escape(r.date)}">${escape(r.date)}</time>`:''}</p><ul>${r.highlights[lang].map(t=>`<li>${escape(t)}</li>`).join('')}</ul></article>`;
 }).join('');
 const title=en?'Release notes':'Release Notes';
 const description=en?'Updates and release history for Merkzeug on Mac, iPhone and iPad.':'Updates und Versionsgeschichte von Merkzeug für Mac, iPhone und iPad.';
 let head=base.slice(0,base.indexOf('<main'));
 head=head.replace(/<title>.*?<\/title>/,`<title>${title} · Merkzeug</title>`)
 .replace(/<link rel="canonical"[^>]+>/,`<link rel="canonical" href="https://merkzeug.creative-it.com/${name}">`)
 .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*/g,`$1${description}`)
 .replace(/(<meta property="og:title" content=")[^"]*/,`$1${title} · Merkzeug`)
 .replace(new RegExp(`href="${en?'de.html':'index.html'}" lang=`),`href="release-notes-${en?'de':'en'}.html" lang=`);
 const intro=en?'A record of published updates and a clearly marked preview of the first release.':'Veröffentlichte Updates und ein klar gekennzeichneter Ausblick auf die erste Version.';
 await writeFile(new URL(name,root),head+`<main id="content" class="guide"><h1>${title}</h1><p class="lead">${intro}</p>${entries}<p><a href="${home}#roadmap">${en?'See what’s planned next':'Zur Roadmap'}</a></p></main>`+base.slice(base.indexOf('<footer>')));
}
console.log('Built localized roadmap sections and release notes.');
