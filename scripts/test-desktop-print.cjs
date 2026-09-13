const { app, BrowserWindow, Menu } = require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert');
// Runs against a built desktop app. The OS spooler is stubbed: never prints paper.
const repository=path.resolve(__dirname,'..');
const root=fs.mkdtempSync(path.join(require('os').tmpdir(),'merkzeug-print-test-'));
fs.mkdirSync(path.join(root,'vault'));fs.writeFileSync(path.join(root,'vault','Print.md'),'# Print test\n\nOriginal content.\n');
app.setPath('userData',path.join(root,'profile'));process.env.MERKZEUG_VAULT=path.join(root,'vault');
let printed=false, printFile,preview;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.on('web-contents-created',(_,contents)=>{
 contents.on("console-message",(_event, ...args)=>console.log("RENDERER",...args));
 contents.print=(options,callback)=>{
  try {
   assert.strictEqual(options.silent,false);
   printFile=require('url').fileURLToPath(contents.getURL());
   assert(fs.readFileSync(printFile).subarray(0,5).toString()==='%PDF-');
   preview=BrowserWindow.fromWebContents(contents);
   fs.copyFileSync(printFile,path.join(root,'actual.pdf'));
   callback(false,'cancelled');printed=true;
  }catch(e){console.error(e);app.exit(1)}
 };
});
require(path.join(repository,'crossplatform/out/main/index.js'));
app.whenReady().then(async()=>{
 try {
 let win;for(let i=0;i<80;i++){win=BrowserWindow.getAllWindows()[0];if(win&&await win.webContents.executeJavaScript('!!document.querySelector(".tree-row")'))break;await wait(250)}
 await win.webContents.executeJavaScript('[...document.querySelectorAll("dialog button")].find(x=>["Later","Später"].includes(x.textContent.trim()))?.click()');
 await win.webContents.executeJavaScript('[...document.querySelectorAll(".tree-row")].find(x=>x.textContent.includes("Print")).click()');
 for(let i=0;i<80;i++){if(await win.webContents.executeJavaScript('!!document.querySelector(".ProseMirror[contenteditable=true]")'))break;await wait(250)}
 win.show();win.focus();
 const point=await win.webContents.executeJavaScript('(()=>{const r=document.querySelector(".ProseMirror p").getBoundingClientRect();return {x:Math.round(r.x+20),y:Math.round(r.y+10)}})()');
 win.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
 win.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
 await wait(100);
 await win.webContents.insertText('PRINT_FRESH_CONTENT ');
 assert(await win.webContents.executeJavaScript('document.querySelector(".ProseMirror").textContent.includes("PRINT_FRESH_CONTENT")'),'input reached editor');

 let printItem;const walk=m=>{for(const i of m.items){if(i.accelerator==='CmdOrCtrl+P')printItem=i;if(i.submenu)walk(i.submenu)}};walk(Menu.getApplicationMenu());assert(printItem);
 printItem.click(printItem,win,{});
 for(let i=0;i<200&&!printed;i++)await wait(250);
 assert(printed,'PDF must reach print dialog');
 assert(fs.readFileSync(path.join(root,'vault','Print.md'),'utf8').replaceAll('\\','').includes('PRINT_FRESH_CONTENT'),'pending edits flushed');
 assert(preview&&!preview.isDestroyed(),'cancel keeps preview');
 const image=await preview.webContents.capturePage();fs.writeFileSync(path.join(root,'preview.png'),image.toPNG());
 preview.close();await wait(100);assert(!fs.existsSync(printFile),'temporary PDF removed');
 console.log('PASS print routing, fresh edits, generated PDF, cancellation and cleanup: '+root);
 app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
setTimeout(()=>app.exit(2),90000);
