#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {Client,loadBundle,plan,apply} from './lib/store-screenshots.mjs';
const {values:v}=parseArgs({options:{manifest:{type:'string',default:'store/upload/manifest.json'},version:{type:'string'},platforms:{type:'string',default:'IOS,MAC_OS'},mode:{type:'string',default:'if-missing'},apply:{type:'boolean',default:false},'validate-only':{type:'boolean',default:false},report:{type:'string',default:'release-artifacts/screenshot-upload.json'}}});
const report={status:'failed',version:v.version,mode:v.mode,applied:v.apply,groups:[]};
try {
 const bundle=await loadBundle(v.manifest);
 if(v['validate-only']){report.status='bundle-valid';report.imageCount=bundle.groups.reduce((n,g)=>n+g.images.length,0);}
 else {
  const client=new Client();const plans=await plan(client,bundle,v.version,v.platforms.split(','),v.mode);
  report.plan=plans.map(p=>({platform:p.group.platform,locale:p.group.locale,displayType:p.group.displayType,action:p.action}));
  if(v.apply)await apply(client,plans,entry=>{report.groups.push(entry);console.log(JSON.stringify(entry));});
  report.status=v.apply?'verified':'dry-run';
 }
} catch(e){report.error=e.message;process.exitCode=1;}
await mkdir(dirname(v.report),{recursive:true});await writeFile(v.report,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
