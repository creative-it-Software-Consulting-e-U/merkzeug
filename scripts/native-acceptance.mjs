/** Exercise the installed Electron package, not the development renderer. */
import {_electron} from 'playwright';
import {mkdtemp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {tmpdir, platform, arch, release} from 'node:os';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [executable, output, targetArch = arch()] = process.argv.slice(2);
if (!executable || !output) throw Error('Usage: node scripts/native-acceptance.mjs EXECUTABLE OUTPUT TARGET_ARCH');
assert.equal(arch(), targetArch, 'Cross-architecture execution is not native acceptance');
const dest=resolve(output); await mkdir(dest,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'merkzeug-acceptance-'));
const vault=join(temp,'vault'), profile=join(temp,'profile'), templates=join(temp,'templates');
await mkdir(vault); await mkdir(join(templates,'Acceptance'),{recursive:true});
const note=join(vault,'Acceptance.md');
await writeFile(note,'---\ntitle: Acceptance\ntags: [release]\n---\n\n# Acceptance\n\nRelease validation note.\n');
await writeFile(join(vault,'Linked.md'),'# Linked evidence\n\nLinked document included.\n');
const pdfNote=join(vault,'PDF.md');
await writeFile(pdfNote,'# PDF acceptance\n\n[Linked evidence](Linked.md)\n\n## Diagram\n\n```mermaid\ngraph LR\n A[Read] --> B[Edit] --> C[Export]\n```\n\n## Table\n\n| Feature | State |\n| --- | --- |\n| PDF | Tested |\n\n![Fixture](image.svg)\n');
await writeFile(join(vault,'image.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#287"/><text x="10" y="35" fill="white">Fixture</text></svg>');
await writeFile(join(templates,'Acceptance','deckblatt.html'),'<div style="padding:60mm 20mm"><h1>Release acceptance cover</h1></div>');
await writeFile(join(templates,'Acceptance','kopfzeile.html'),'<div style="font-size:9px">Release acceptance header</div>');
await writeFile(join(templates,'Acceptance','fusszeile.html'),'<div style="font-size:9px">Page <span class="pageNumber"></span></div>');
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeModified:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),platform:platform(),arch:arch(),os:release(),status:'failed',checks:{},limitations:['Native file dialogs use the existing PDF test destination.','PDF visual review and OS security-prompt interaction require separate review.'],temporaryVault:temp};
let app;
async function start(){
 const env={...process.env,MERKZEUG_VAULT:vault,MERKZEUG_PDF_TARGET:join(dest,'acceptance.pdf'),MERKZEUG_TEMPLATES_ROOT:templates,MERKZEUG_PDF_TEMPLATE:'Acceptance'};
 delete env.ELECTRON_RUN_AS_NODE; delete env.MERKZEUG_SCREENSHOT;
 app=await _electron.launch({executablePath:resolve(executable),args:[`--user-data-dir=${profile}`,'--lang=en'],env,timeout:60000});
 const page=await app.firstWindow(); page.setDefaultTimeout(30000);
 await page.locator('.tree-label').filter({hasText:/^Acceptance$/}).click();
 await page.locator('.ProseMirror h1').waitFor(); return page;
}
async function eventually(check){for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,100));}throw Error('Expected state was not reached');}
try {
 let page=await start();
 const info=await app.evaluate(({app})=>({version:app.getVersion(),resources:process.resourcesPath,arch:process.arch,packaged:app.isPackaged}));
 assert.ok(info.packaged,'Must launch a packaged application'); assert.equal(info.arch,targetArch);
 assert.equal(info.version,(await readFile('VERSION','utf8')).trim()); report.version=info.version;
 for(const file of ['LICENSE','THIRD_PARTY_NOTICES.txt','help/Help.en.md','help/Help.de.md']) assert.ok((await readFile(join(info.resources,file))).length>20,file);
 report.packageSHA256=createHash('sha256').update(await readFile(join(info.resources,'app.asar'))).digest('hex');
 report.checks.launchAndNotices='passed';
 const editor=page.locator('.ProseMirror');
 await editor.click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.press('Enter'); await page.keyboard.insertText('Saved acceptance marker');
 await eventually(async()=> (await readFile(note,'utf8')).includes('Saved acceptance marker'));
 report.checks.editAndSave='passed';
 await app.close(); app=null; page=await start();
 assert.match(await page.locator('.ProseMirror').innerText(),/Saved acceptance marker/); report.checks.reopen='passed';
 await page.locator('.ProseMirror').click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.insertText(' Local pending change');
 await writeFile(note,'# Acceptance\n\nExternal acceptance marker\n');
 await page.locator('.editor-conflict').filter({hasText:'outside'}).waitFor();
 assert.match(await readFile(note,'utf8'),/External acceptance marker/);
 await page.getByRole('button',{name:'Reload',exact:true}).click();
 await eventually(async()=> (await page.locator('.ProseMirror').innerText()).includes('External acceptance marker'));
 report.checks.conflictReloadWithoutOverwrite='passed';
 await page.locator('.tree-label').filter({hasText:/^PDF$/}).click();
 await page.locator('.mermaid-preview svg').waitFor();
 await page.screenshot({path:join(dest,'native-editor.png')});
 await page.evaluate(async path=>window.merkzeug.exportPdf(path),pdfNote);
 const pdf=await readFile(join(dest,'acceptance.pdf')); assert.equal(pdf.subarray(0,5).toString(),'%PDF-'); assert.ok(pdf.length>10000);
 report.checks.pdfWithTemplateLinksDiagramTableImage='passed';
 report.pdfSHA256=createHash('sha256').update(pdf).digest('hex'); report.status='passed';
} catch(error){report.error=String(error.stack||error);if(app){try{await (await app.firstWindow()).screenshot({path:join(dest,'failure.png')});}catch{}}process.exitCode=1;
} finally {if(app)await app.close(); await writeFile(join(dest,'native-acceptance.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
