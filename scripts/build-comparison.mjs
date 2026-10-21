// Render the Merkzeug vs Obsidian table from COMPARISON.md into both landing pages.
// Run manually after editing COMPARISON.md: npm run build:comparison
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('COMPARISON.md',root),'utf8');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const marks={'✅':'yes','〰️':'partial','〰':'partial','❌':'no'};
const labels={en:{yes:'Yes',partial:'Partial',no:'No'},de:{yes:'Ja',partial:'Teilweise',no:'Nein'}};
const asOf={en:source.match(/^As of:\s*(.+)$/m)?.[1].trim(),de:source.match(/^Stand:\s*(.+)$/m)?.[1].trim()};
if(!asOf.en||!asOf.de)throw Error('COMPARISON.md needs "As of:" and "Stand:" lines');
const rows=source.split('\n').filter(line=>line.startsWith('|')).slice(2).map((line,index)=>{
 const cells=line.split('|').slice(1,-1).map(cell=>cell.trim());
 if(cells.length!==6)throw Error(`COMPARISON.md row ${index+1}: expected 6 columns`);
 const [en,de,merkzeug,obsidian,noteEn,noteDe]=cells;
 const rating=(value,app)=>marks[value]??(()=>{throw Error(`COMPARISON.md row ${index+1}: unknown ${app} rating "${value}"`)})();
 if(!en||!de)throw Error(`COMPARISON.md row ${index+1}: missing feature name`);
 return {feature:{en,de},merkzeug:rating(merkzeug,'Merkzeug'),obsidian:rating(obsidian,'Obsidian'),note:{en:noteEn,de:noteDe}};
});
if(!rows.length)throw Error('COMPARISON.md contains no table rows');
const cell=(lang,value,note='')=>`<td><svg class="mark ${value}" aria-hidden="true"><use href="#mark-${value}"/></svg><span class="sr">${labels[lang][value]}</span>${note?`<small>${escape(note)}</small>`:''}</td>`;
for(const [lang,page] of [['en','website/index.html'],['de','website/de.html']]){
 const url=new URL(page,root);
 let html=await readFile(url,'utf8');
 const body=rows.map(r=>`<tr><th scope="row">${escape(r.feature[lang])}</th>${cell(lang,r.merkzeug,r.note[lang])}${cell(lang,r.obsidian)}</tr>`).join('\n');
 const pattern=/(<!-- comparison:start -->)[\s\S]*?(<!-- comparison:end -->)/;
 if(!pattern.test(html))throw Error(`Missing comparison markers in ${page}`);
 html=html.replace(pattern,`$1\n${body}\n$2`).replace(/(<span data-comparison-date>)[^<]*(<\/span>)/,`$1${escape(asOf[lang])}$2`);
 await writeFile(url,html);
}
console.log(`Rendered ${rows.length} comparison rows into the English and German landing pages.`);
