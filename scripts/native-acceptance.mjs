/** Exercise the installed Electron package, not the development renderer. */
import {_electron} from 'playwright';
import {mkdtemp, mkdir, writeFile, readFile, chmod} from 'node:fs/promises';
import {tmpdir, platform, arch, release} from 'node:os';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [executable, output, targetArch = arch(), locale = 'en'] = process.argv.slice(2);
if (!executable || !output) throw Error('Usage: node scripts/native-acceptance.mjs EXECUTABLE OUTPUT TARGET_ARCH');
assert.ok(['en','de'].includes(locale));
assert.equal(arch(), targetArch, 'Cross-architecture execution is not native acceptance');
const dest=resolve(output); await mkdir(dest,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'merkzeug-acceptance-'));
const vault=join(temp,'vault'), profile=join(temp,'profile'), templates=join(temp,'templates');
await mkdir(vault); await mkdir(join(templates,'Acceptance'),{recursive:true});
const note=join(vault,'Acceptance.md');
await writeFile(note,'---\ntitle: Acceptance\ntags: [release]\n---\n\n# Acceptance\n\nRelease validation note.\n');
await writeFile(join(vault,'Linked.md'),'# Linked evidence\n\nLinked document included.\n');
const pdfNote=join(vault,'PDF.md');
await writeFile(pdfNote,'---\npdf-toc: true\nlanguage: en\n---\n\n# PDF acceptance\n\n[Linked evidence](Linked.md)\n\n## Diagram\n\n```mermaid\ngraph LR\n A[Read] --> B[Edit] --> C[Export]\n```\n\n## Table\n\n| Feature | State |\n| --- | --- |\n| PDF | Tested |\n\n![Fixture](image.svg)\n');
await writeFile(join(vault,'image.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#287"/><text x="10" y="35" fill="white">Fixture</text></svg>');
await writeFile(join(templates,'Acceptance','deckblatt.html'),'<div style="padding:60mm 20mm"><h1>Release acceptance cover</h1></div>');
await writeFile(join(templates,'Acceptance','kopfzeile.html'),'<div style="font-size:9px">Release acceptance header</div>');
await writeFile(join(templates,'Acceptance','fusszeile.html'),'<div style="font-size:9px">Page <span class="pageNumber"></span></div>');
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeModified:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),platform:platform(),arch:arch(),os:release(),locale,status:'failed',checks:{},limitations:['Native file dialogs use the existing PDF test destination.','PDF visual review and OS security-prompt interaction require separate review.'],temporaryVault:temp};
let app;
async function bounded(operation, milliseconds, label) {
 let timer;
 try {return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${label} timed out`)),milliseconds);})]);}
 finally {clearTimeout(timer);}
}
async function closeApp(){
 const current=app; app=null;
 try {await bounded(current.close(),10000,'Application shutdown');}
 catch(error){
  const pid=current.process().pid;
  if(platform()==='win32') execFileSync('taskkill',['/PID',String(pid),'/T','/F']);
  else current.process().kill('SIGKILL');
  throw error;
 }
}
function passed(check){report.checks[check]='passed';console.log(`PASS ${locale}: ${check}`);}
async function start(){
 const env={...process.env,MERKZEUG_VAULT:vault,MERKZEUG_PDF_TARGET:join(dest,'acceptance.pdf'),MERKZEUG_TEMPLATES_ROOT:templates,MERKZEUG_PDF_TEMPLATE:'Acceptance'};
 delete env.ELECTRON_RUN_AS_NODE; delete env.MERKZEUG_SCREENSHOT;
 app=await _electron.launch({executablePath:resolve(executable),args:[`--user-data-dir=${profile}`,`--lang=${locale}`],env,timeout:60000});
 const page=await app.firstWindow(); page.setDefaultTimeout(30000);
 await page.locator('.tree-label').first().waitFor();
 const releaseNotes = page.locator('[data-close-release]');
 await page.waitForTimeout(500);
 if (await releaseNotes.isVisible()) await releaseNotes.click();
 const tour = page.locator('.tour-dialog[open]');
 if (await tour.count()) await tour.getByRole('button', {name: locale === 'de' ? 'Später' : 'Later', exact:true}).click();
 await page.locator('.tree-label').filter({hasText:/^Acceptance$/}).click();
 await page.locator('.ProseMirror h1').waitFor(); return page;
}
async function eventually(check){for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,100));}throw Error('Expected state was not reached');}
try {
 let page=await start();
 assert.equal(await page.evaluate(()=>window.merkzeug.locale),locale);
 const info=await app.evaluate(({app})=>({version:app.getVersion(),resources:process.resourcesPath,arch:process.arch,packaged:app.isPackaged}));
 assert.ok(info.packaged,'Must launch a packaged application'); assert.equal(info.arch,targetArch);
 assert.equal(info.version,(await readFile('VERSION','utf8')).trim()); report.version=info.version;
 for(const file of ['LICENSE','THIRD_PARTY_NOTICES.txt','help/Help.en.md','help/Help.de.md']) assert.ok((await readFile(join(info.resources,file))).length>20,file);
 report.packageSHA256=createHash('sha256').update(await readFile(join(info.resources,'app.asar'))).digest('hex');
 passed('launchAndNotices');
 const editor=page.locator('.ProseMirror');
 await editor.click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.press('Enter'); await page.keyboard.insertText('Saved acceptance marker');
 await eventually(async()=> (await readFile(note,'utf8')).includes('Saved acceptance marker'));
 passed('editAndSave');
 await closeApp(); page=await start();
 assert.match(await page.locator('.ProseMirror').innerText(),/Saved acceptance marker/); passed('reopen');
 await page.locator('.ProseMirror').click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.insertText(' Undo acceptance marker');
 await page.keyboard.press('ControlOrMeta+z');
 assert.ok(!(await page.locator('.ProseMirror').innerText()).includes('Undo acceptance marker'));
 await page.keyboard.press('ControlOrMeta+Shift+z');
 assert.match(await page.locator('.ProseMirror').innerText(),/Undo acceptance marker/);
 await eventually(async()=> (await readFile(note,'utf8')).includes('Undo acceptance marker'));
 passed('undoRedo');
 await chmod(note,0o444);
 const beforeReadOnly=await readFile(note,'utf8');
 await page.keyboard.insertText(' Read-only retry marker');
 await page.locator('.editor-conflict').filter({hasText:/Save failed|Speichern fehlgeschlagen/}).waitFor();
 assert.equal(await readFile(note,'utf8'),beforeReadOnly);
 await chmod(note,0o644);
 await page.getByRole('button',{name:locale==='de'?'Erneut versuchen':'Try again',exact:true}).click();
 await eventually(async()=> (await readFile(note,'utf8')).includes('Read-only retry marker'));
 passed('readOnlyErrorAndRetry');
 await page.locator('.ProseMirror').click(); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.insertText(' Local pending change');
 await writeFile(note,'# Acceptance\n\nExternal acceptance marker\n');
 await page.locator('.editor-conflict').filter({hasText:/outside|außerhalb/}).waitFor();
 assert.match(await readFile(note,'utf8'),/External acceptance marker/);
 await page.getByRole('button',{name:locale==='de'?'Neu laden':'Reload',exact:true}).click();
 await eventually(async()=> (await page.locator('.ProseMirror').innerText()).includes('External acceptance marker'));
 passed('conflictReloadWithoutOverwrite');
 await page.locator('.tree-label').filter({hasText:/^PDF$/}).click();
 await page.locator('.mermaid-preview svg').waitFor();
 await eventually(()=>page.locator('.ProseMirror img').evaluateAll(images=>images.length>0 && images.every(img=>img.complete && img.naturalWidth>0)));
 passed('localImageRendering');
 const readMode=page.locator('[data-tour="reading-mode"]');
 await readMode.click();
 assert.equal(await page.locator('.ProseMirror').getAttribute('contenteditable'),'false');
 await readMode.click();
 assert.equal(await page.locator('.ProseMirror').getAttribute('contenteditable'),'true');
 passed('readingMode');
 await page.screenshot({path:join(dest,'native-editor.png')});
 await bounded(page.evaluate(async path=>window.merkzeug.exportPdf(path),pdfNote),120000,'PDF export');
 const pdf=await readFile(join(dest,'acceptance.pdf')); assert.equal(pdf.subarray(0,5).toString(),'%PDF-'); assert.ok(pdf.length>10000);
 passed('pdfWithTemplateTocLinksDiagramTableImage');
 report.pdfSHA256=createHash('sha256').update(pdf).digest('hex');
 // Exercise platform adapters against a synthetic vault, never a real remote.
 const created=await page.evaluate(async vault=>window.merkzeug.createMeetingNote(vault,'Meeting fixture','# Meeting fixture\n\nMeeting content.\n'),vault);
 assert.match(await readFile(created,'utf8'),/Meeting fixture/);
 const asset=await page.evaluate(async path=>window.merkzeug.saveImage(path,btoa('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'),'svg'),created);
 await writeFile(created,`# Meeting fixture\n\n![Image](${asset})\n`);
 const incoming=join(vault,'Incoming.md');
 await writeFile(incoming,`# Incoming\n\n[Meeting](${encodeURI(created.split('/').pop())})\n`);
 const renamed=await page.evaluate(path=>window.merkzeug.autoRenameNote(path,'renamed-meeting'),created);
 assert.match(await readFile(incoming,'utf8'),/renamed-meeting.md/);
 assert.match(await readFile(renamed,'utf8'),/renamed-meeting.assets/);
 const movedDir=join(vault,'Moved'); await mkdir(movedDir);
 const moved=await page.evaluate(async ({path,dir})=>window.merkzeug.movePath(path,dir),{path:renamed,dir:movedDir});
 assert.match(await readFile(incoming,'utf8'),/Moved\/renamed-meeting.md/);
 assert.ok((await page.evaluate(path=>window.merkzeug.readFile(path),moved)).includes('renamed-meeting.assets'));
 passed('meetingCreationAutoRenameAssetsAndIncomingLinks');
 await mkdir(join(vault,'.merkzeug','templates','Portable'),{recursive:true});
 await writeFile(join(vault,'.merkzeug','templates','Portable','stil.css'),'.pdf-content { color: #123456; }');
 await page.evaluate(()=>window.merkzeug.assignTemplate('vault:.merkzeug/templates/Portable'));
 assert.match(await readFile(join(vault,'.merkzeug','settings.json'),'utf8'),/Portable/);
 assert.match(JSON.stringify(await page.evaluate(()=>window.merkzeug.getLiveTemplate())),/123456/);
 await page.evaluate(()=>window.merkzeug.assignTemplate('Acceptance'));
 passed('vaultAndCentralTemplates');
 await page.evaluate(()=>window.merkzeug.guidanceAppend('AGENTS.md',null,'# Fixture agent instructions\n'));
 assert.match(await readFile(join(vault,'AGENTS.md'),'utf8'),/Fixture agent instructions/);
 passed('agentGuidance');
 execFileSync('git',['init','-b','main',vault]);
 execFileSync('git',['-C',vault,'config','user.email','test@example.invalid']);
 execFileSync('git',['-C',vault,'config','user.name','Release Test']);
 assert.equal((await page.evaluate(path=>window.merkzeug.gitStatus(path),vault)).isRepo,true);
 assert.equal((await page.evaluate(path=>window.merkzeug.gitCommitPush(path,'Fixture commit'),vault)).ok,true);
 assert.equal((await page.evaluate(path=>window.merkzeug.gitStatus(path),vault)).changes.length,0);
 passed('gitStatusAndCommit');
 if(platform()==='linux'){
  assert.equal((await page.evaluate(()=>window.merkzeug.listCalendarEvents(Date.now(),Date.now()+86400000))).error,'unsupported');
  passed('nativeCalendarExplicitlyUnavailable');
 }
 report.status='passed';
} catch(error){report.error=String(error.stack||error);if(app){try{await (await app.firstWindow()).screenshot({path:join(dest,'failure.png')});}catch{}}process.exitCode=1;
} finally {
 if(app)try{await closeApp();}catch(error){report.status='failed';report.shutdownError=String(error);process.exitCode=1;}
 await writeFile(join(dest,'native-acceptance.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
