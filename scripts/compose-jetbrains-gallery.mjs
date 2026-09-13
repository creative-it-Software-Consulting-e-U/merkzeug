// Compose explanatory frames around genuine IDE captures; never alter the captured UI.
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const source=resolve('intellij/build/marketplace-capture')
const output=resolve('release-artifacts/jetbrains-1.0.0/upload/marketplace-gallery')
await mkdir(output,{recursive:true})
const data=async n=>'data:image/png;base64,'+(await readFile(join(source,n))).toString('base64')
const shots=[
 ['01-visual-editor','Visual Markdown, inside IntelliJ IDEA','Format notes, add diagrams and keep your files in your project.','01-ide-editor.png'],
 ['02-mermaid-editing','Edit Mermaid where you write','Change the diagram source inline and see its preview in the same document.','03-mermaid-edit.png'],
 ['03-template-preview','Use your PDF styles while editing','Optional document styling. The surrounding IDE keeps its standard theme.','02-ide-template.png'],
 ['04-pdf-export','From Markdown to a finished PDF','Actual plugin export: a template cover, diagrams, tables and an attached image.',null],
 ['05-agent-guidance','Choose where agent instructions belong','Review existing files and choose where to add the companion-folder rules.','05-agent-guidance.png'],
 ['06-markdown-source','Keep your Markdown source editor','Switch between the built-in Markdown editor and Merkzeug using the tabs below.','06-markdown-source.png'],
 ['07-refactoring','Rename the note. Its images follow.','Native Refactor → Rename updates the companion folder and relative image references.','07-renamed-assets.png'],
 ['08-template-prompt','Give your agent the template instructions','Copy the styling prompt and offline reference from Settings → Tools → Merkzeug.',null]
]
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'})
const page=await browser.newPage({viewport:{width:1920,height:1200},deviceScaleFactor:1})
const summaries=[]
for(const [name,title,subtitle,file] of shots){
 let body=file?`<img class="screen" src="${await data(file)}">`:''
 if(name==='04-pdf-export') body=`<div class="pages"><img src="${await data('pdf-page-1.png')}"><img src="${await data('pdf-page-2.png')}"></div>`
 if(name==='08-template-prompt') body=`<div class="crop"><img src="${await data('09-styling-prompt.png')}"></div>`
 await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;background:#edf0f5;color:#202329;font-family:Arial,sans-serif}header{height:130px;padding:24px 44px;background:white;border-bottom:1px solid #d6dbe3}h1{font-size:36px;margin:0 0 10px;font-weight:700}p{font-size:23px;margin:0;color:#505965}main{height:1070px;padding:16px 28px 20px;display:flex;justify-content:center;align-items:center}.screen{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px;box-shadow:0 4px 18px #0002}.pages{display:flex;gap:35px;justify-content:center;height:100%}.pages img{height:100%;width:auto;box-shadow:0 4px 16px #0002}.crop{width:1776px;height:933px;overflow:hidden;border-radius:12px;box-shadow:0 4px 18px #0002;position:relative}.crop img{width:1776px;position:absolute;top:-290px;left:0}</style><header><h1>${title}</h1><p>${subtitle}</p></header><main>${body}</main></html>`)
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())))
 await page.screenshot({path:join(output,name+'.png')})
 summaries.push({name,title,subtitle,file})
}
await browser.close()
await writeFile(join(output,'index.html'),`<!doctype html><meta charset="utf-8"><title>Merkzeug Marketplace gallery</title><style>body{font:18px system-ui;background:#e8edf3;max-width:1200px;margin:32px auto}img{width:100%;margin-bottom:30px}h1{font-size:28px}</style><h1>Merkzeug — English Marketplace gallery</h1>`+shots.map(([n])=>`<img src="${n}.png">`).join(''))
await writeFile(join(output,'captions.json'),JSON.stringify(summaries,null,2)+'\n')
console.log(output)
