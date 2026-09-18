// Native Electron restart regression, using disposable vaults and user profile.
import {_electron} from 'playwright'
import electronPath from 'electron'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
const root=await mkdtemp(join(tmpdir(),'merkzeug-session-'))
const profile=join(root,'profile'), a=join(root,'A'), b=join(root,'B')
for(const p of [profile,a,b]) await mkdir(p)
const windowState=(vault,x)=>({vault,bounds:{x,y:90,width:800,height:600},maximized:false,fullScreen:false})
await writeFile(join(profile,'settings.json'),JSON.stringify({lastVault:a,recentVaults:[a,b],windows:[windowState(a,40),windowState(b,150),windowState(a,250),windowState(join(root,'missing'),500)]}))
const env={...process.env}; for(const k of ['ELECTRON_RUN_AS_NODE','MERKZEUG_VAULT','MERKZEUG_SCREENSHOT','MERKZEUG_SCREENSHOT_PROFILE']) delete env[k]
const launch=()=>_electron.launch({executablePath:electronPath,args:[resolve('crossplatform'),`--user-data-dir=${profile}`,'--lang=en'],env})
const settings=async()=>JSON.parse(await readFile(join(profile,'settings.json'),'utf8'))
let app
try {
 app=await launch()
 await app.firstWindow()
 // Wait for every renderer to have initialized its vault and close handlers.
 for(let tries=0; app.windows().length<3 && tries<100; tries++) await new Promise(r=>setTimeout(r,100))
 for(const page of app.windows()) await page.waitForFunction(()=>!!window.merkzeug)
 assert.equal(app.windows().length,3)
 const vaults=await Promise.all(app.windows().map(p=>p.evaluate(()=>window.merkzeug.getInitialVault())))
 assert.deepEqual(vaults.sort(),[a,a,b].sort())
 await app.evaluate(({BrowserWindow})=>{const wins=BrowserWindow.getAllWindows();wins[0].setBounds({x:70,y:120,width:900,height:640});wins[2].close();const helper=new BrowserWindow({show:false});helper.setTitle('Session test helper')})
 await new Promise(r=>setTimeout(r,400))
 await app.close();app=null
 const saved=await settings()
 assert.equal(saved.windows.length,2,'Quit preserves both remaining main windows, not helper windows')
 assert.deepEqual(saved.windows.map(w=>w.vault).sort(),[a,b].sort())
 assert.deepEqual(saved.windows.map(w=>w.bounds.width).sort(),[800,900])
 app=await launch();await app.firstWindow()
 for(let tries=0; app.windows().length<2 && tries<100; tries++) await new Promise(r=>setTimeout(r,100))
 assert.equal(app.windows().length,2)
 assert.deepEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>w.getNormalBounds().width).sort()),[800,900])
 await app.close();app=null
 assert.equal((await settings()).windows.length,2)
 console.log('PASS: multiple vaults, duplicate vault windows, missing vault, bounds, explicit close, helper exclusion and quit/restart')
} finally {if(app)await app.close();await rm(root,{recursive:true,force:true})}
