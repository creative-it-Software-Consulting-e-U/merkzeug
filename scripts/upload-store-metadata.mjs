#!/usr/bin/env node
// Update only the reviewed description, promotional text and keywords of Merkzeug drafts.
import {parseArgs} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {Client} from './lib/store-screenshots.mjs';
const {values:args}=parseArgs({options:{version:{type:'string'},apply:{type:'boolean',default:false},'validate-only':{type:'boolean',default:false},report:{type:'string',default:'release-artifacts/store-metadata.json'}}});
const report={version:args.version,status:'failed',applied:args.apply,groups:[]};
try {
  const listings=await Promise.all(['en-US','de-DE'].map(async locale=>({locale,listing:JSON.parse(await readFile(`store/metadata/${locale}/listing.json`,'utf8'))})));
  const desired=[];
  for(const platform of ['IOS','MAC_OS']) for(const {locale,listing} of listings){
    const suffix=platform==='IOS'?'ios':'macos';
    const attributes={description:listing[`description_${suffix}`],promotionalText:listing[`promotional_text_${suffix}`],keywords:listing[`keywords_${suffix}`]};
    for(const [key,max] of Object.entries({description:4000,promotionalText:170,keywords:100})){
      if(typeof attributes[key]!=='string'||!attributes[key].length||[...attributes[key]].length>max) throw Error(`Invalid ${platform}/${locale}/${key}`);
    }
    desired.push({platform,locale,attributes});
  }
  if(args['validate-only']) report.status='validated';
  else {
    if(!/^\d+(\.\d+){0,2}$/.test(args.version??'')) throw Error('Specify the exact existing Store version');
    const client=new Client();
    // Read and validate every destination before any PATCH.
    for(const platform of ['IOS','MAC_OS']){
      const versions=await client.list(`/v1/apps/6799114334/appStoreVersions?filter[platform]=${platform}&filter[versionString]=${args.version}`);
      const matching=versions.filter(v=>v.attributes.platform===platform&&v.attributes.versionString===args.version);
      if(matching.length!==1||!['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(matching[0].attributes.appStoreState)) throw Error(`No editable ${platform} version ${args.version}`);
      const locales=await client.list(`/v1/appStoreVersions/${matching[0].id}/appStoreVersionLocalizations`);
      for(const item of desired.filter(d=>d.platform===platform)){
        const matchingLocale=locales.filter(l=>l.attributes.locale===item.locale);
        if(matchingLocale.length!==1) throw Error(`Missing ${platform}/${item.locale}`);
        item.id=matchingLocale[0].id;
        item.before=Object.fromEntries(Object.keys(item.attributes).map(k=>[k,matchingLocale[0].attributes[k]??null]));
      }
    }
    report.plan=desired;
    await mkdir(dirname(args.report),{recursive:true});
    await writeFile(args.report,JSON.stringify(report,null,2)+'\n');
    for(const item of desired){
      const identical=Object.entries(item.attributes).every(([k,v])=>v===item.before[k]);
      if(args.apply&&!identical){
        await client.json('PATCH',`/v1/appStoreVersionLocalizations/${item.id}`,{data:{type:'appStoreVersionLocalizations',id:item.id,attributes:item.attributes}});
        const {data}=await client.json('GET',`/v1/appStoreVersionLocalizations/${item.id}`);
        if(!Object.entries(item.attributes).every(([k,v])=>data.attributes[k]===v)) throw Error(`Read-back mismatch: ${item.platform}/${item.locale}`);
      }
      report.groups.push({platform:item.platform,locale:item.locale,result:identical?'identical':args.apply?'updated-and-verified':'planned'});
    }
    report.status=args.apply?'verified':'dry-run';
  }
} catch(error){report.error=error.message;process.exitCode=1;}
await mkdir(dirname(args.report),{recursive:true});
await writeFile(args.report,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,groups:report.groups,error:report.error},null,2));
