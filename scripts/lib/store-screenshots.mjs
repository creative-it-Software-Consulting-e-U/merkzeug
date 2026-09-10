import {createHash, createPrivateKey, sign} from 'node:crypto';
import {readFile, realpath} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';

export const API = 'https://api.appstoreconnect.apple.com';
export const hash = (data, algorithm='sha256') => createHash(algorithm).update(data).digest('hex');
const sizes = {APP_IPHONE_67:[[1260,2736],[1290,2796],[1320,2868]], APP_IPAD_PRO_3GEN_129:[[2048,2732],[2064,2752]], APP_DESKTOP:[[1280,800],[1440,900],[2560,1600],[2880,1800]]};
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const requireThat = (condition,message) => {if(!condition) throw Error(message);};

export function jwt(env=process.env, now=Math.floor(Date.now()/1000)) {
  const {ASC_KEY_ID:kid,ASC_ISSUER_ID:iss,ASC_PRIVATE_KEY_BASE64:encoded}=env;
  requireThat(kid && iss && encoded,'Set ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY_BASE64 in secret storage');
  const key=createPrivateKey(Buffer.from(encoded,'base64'));
  requireThat(key.asymmetricKeyType==='ec' && key.asymmetricKeyDetails?.namedCurve==='prime256v1','Require an ES256 App Store Connect key');
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload=`${b64({alg:'ES256',kid,typ:'JWT'})}.${b64({iss,iat:now-5,exp:now+600,aud:'appstoreconnect-v1'})}`;
  return `${payload}.${sign('sha256',Buffer.from(payload),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}

export async function loadBundle(file) {
  const root=await realpath(dirname(resolve(file)));
  const manifest=JSON.parse(await readFile(file,'utf8'));
  requireThat(manifest.schema===1 && manifest.appId==='6799114334' && manifest.groups?.length,'Invalid screenshot manifest');
  const keys=new Set();
  for(const group of manifest.groups){
    const key=`${group.platform}/${group.locale}/${group.displayType}`;
    requireThat(!keys.has(key),'Duplicate screenshot group');keys.add(key);
    requireThat(['de-DE','en-US'].includes(group.locale) && ['IOS','MAC_OS'].includes(group.platform),'Unsupported platform or locale');
    requireThat(sizes[group.displayType] && (group.platform==='MAC_OS')===(group.displayType==='APP_DESKTOP'),'Invalid display type');
    requireThat(group.images?.length>0 && group.images.length<=10,'Require 1–10 images per group');
    const hashes=new Set();
    for(const item of group.images){
      const path=await realpath(resolve(root,item.file));
      requireThat(path.startsWith(root+sep),'Image escapes bundle directory');
      const bytes=await readFile(path);
      requireThat(bytes.length>33 && bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Require PNG');
      const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
      requireThat(sizes[group.displayType].some(([x,y])=>x===w && y===h),'Unsupported screenshot dimensions');
      // The compositor writes opaque RGB PNGs; reject alpha and palette transparency.
      requireThat([0,2].includes(bytes[25]),'Require opaque grayscale/RGB PNG');
      let pos=8;
      while(pos+12<=bytes.length){const length=bytes.readUInt32BE(pos);requireThat(pos+length+12<=bytes.length,'Truncated PNG');requireThat(bytes.toString('ascii',pos+4,pos+8)!=='tRNS','Transparent PNG is not accepted');pos+=length+12;}
      requireThat(hash(bytes)===item.sha256 && !hashes.has(item.sha256),'Image checksum mismatch or duplicate');hashes.add(item.sha256);
      requireThat(/^[a-z-]+$/.test(item.scene),'Invalid scene name');
      item.bytes=bytes;item.md5=hash(bytes,'md5');item.remoteName=`merkzeug-${item.scene}-${item.sha256}.png`;
    }
  }
  return manifest;
}

export class Client {
  constructor({token=()=>jwt(),request=fetch,pause=sleep}={}){this.token=token;this.request=request;this.pause=pause;}
  async json(method,path,body){
    const url=new URL(path,API);
    requireThat(url.origin===API && url.pathname.startsWith('/v1/'),'Reject non-API URL');
    for(let attempt=0;attempt<4;attempt++){
      let response;
      try {response=await this.request(url,{method,redirect:'error',signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${this.token()}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}
      catch {throw Error(`App Store Connect transport failure (${method} ${url.pathname}); rerun to reconcile`);}
      if(method==='GET' && (response.status===429 || response.status>=500) && attempt<3){await this.pause(1000*2**attempt);continue;}
      requireThat(response.ok,`App Store Connect ${method} ${url.pathname}: HTTP ${response.status}`);
      return response.status===204?{}:response.json();
    }
  }
  async list(path){const data=[];const visited=new Set();while(path){requireThat(!visited.has(path),'Pagination loop');visited.add(path);const page=await this.json('GET',path);data.push(...page.data);path=page.links?.next;}return data;}
  async uploadOperations(operations,bytes){
    const sorted=[...operations].sort((a,b)=>a.offset-b.offset);let end=0;
    for(const op of sorted){requireThat(Number.isInteger(op.offset)&&Number.isInteger(op.length)&&op.offset===end&&op.length>0,'Invalid upload chunk coverage');end+=op.length;const url=new URL(op.url);requireThat(url.protocol==='https:'&&url.hostname.endsWith('.apple.com')&&!url.username&&!url.password&&op.method==='PUT','Unexpected upload destination');}
    requireThat(end===bytes.length,'Upload chunks do not cover image');
    for(const op of sorted){
      const headers=Object.fromEntries(op.requestHeaders.map(h=>[h.name,h.value]));
      requireThat(!Object.keys(headers).some(k=>k.toLowerCase()==='authorization'),'Unexpected upload authorization header');
      let response;try{response=await this.request(op.url,{method:op.method,headers,body:bytes.subarray(op.offset,op.offset+op.length),redirect:'error',signal:AbortSignal.timeout(60000)});}catch{throw Error('Screenshot chunk upload failed; signed URL omitted');}
      requireThat(response.ok,`Screenshot chunk upload: HTTP ${response.status}`);
    }
  }
  async ready(id,md5){
    for(let i=0;i<90;i++){
      const {data}=await this.json('GET',`/v1/appScreenshots/${id}`);const a=data.attributes;
      if(a.assetDeliveryState?.state==='COMPLETE'){requireThat(a.sourceFileChecksum?.toLowerCase()===md5,'Processed screenshot checksum mismatch');return data;}
      requireThat(a.assetDeliveryState?.state!=='FAILED','Apple rejected screenshot processing');await this.pause(2000);
    }
    throw Error('Screenshot processing timed out; rerun to reconcile');
  }
}
const relation=(type,id)=>({data:{type,id}});
export async function plan(client,bundle,version,platforms,mode){
  requireThat(/^\d+(\.\d+){0,2}$/.test(version),'Require an explicit numeric App Store version');
  requireThat(['if-missing','sync'].includes(mode),'Invalid synchronization mode');
  requireThat(platforms.length && platforms.every(p=>['IOS','MAC_OS'].includes(p)),'Invalid platform selection');
  const result=[];
  // Preflight every requested platform/localization before making any changes.
  for(const platform of platforms){
    const versions=await client.list(`/v1/apps/${bundle.appId}/appStoreVersions?filter[platform]=${platform}&filter[versionString]=${version}`);
    const matching=versions.filter(v=>v.attributes.versionString===version && v.attributes.platform===platform);
    requireThat(matching.length===1,`Expected exactly one ${platform} version ${version}`);
    const v=matching[0];requireThat(['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(v.attributes.appStoreState),`${platform} version is not editable`);
    const locales=await client.list(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
    const groups=bundle.groups.filter(g=>g.platform===platform);requireThat(groups.length,`No bundle images for ${platform}`);
    for(const group of groups){
      const loc=locales.filter(l=>l.attributes.locale===group.locale);requireThat(loc.length===1,`Missing locale ${platform}/${group.locale}; configure listing first`);
      const sets=await client.list(`/v1/appStoreVersionLocalizations/${loc[0].id}/appScreenshotSets`);
      const set=sets.filter(s=>s.attributes.screenshotDisplayType===group.displayType);requireThat(set.length<=1,'Duplicate screenshot set');
      const existing=set.length?await client.list(`/v1/appScreenshotSets/${set[0].id}/appScreenshots`):[];
      const complete=s=>s.attributes.assetDeliveryState?.state==='COMPLETE';
      const matched=group.images.map(img=>existing.find(s=>complete(s)&&s.attributes.sourceFileChecksum?.toLowerCase()===img.md5));
      const same=existing.length===matched.length && matched.every((s,i)=>s?.id===existing[i].id);
      const keep=mode==='if-missing'&&existing.length>0&&existing.every(complete);
      const newImages=group.images.filter((_,i)=>!matched[i]);
      if(!same&&!keep) requireThat(existing.length+newImages.filter(img=>!existing.some(s=>s.attributes.fileName===img.remoteName)).length<=10,'Not enough staging slots; existing images were preserved');
      result.push({group,versionId:v.id,localeId:loc[0].id,setId:set[0]?.id,existing,matched,action:same?'identical':keep?'keep':'update'});
    }
  }
  return result;
}
export async function apply(client,plans,record=()=>{}){
  for(const p of plans){
    const label=`${p.group.platform}/${p.group.locale}/${p.group.displayType}`;
    if(p.action!=='update'){record({group:label,result:p.action});continue;}
    let setId=p.setId;
    if(!setId){const {data}=await client.json('POST','/v1/appScreenshotSets',{data:{type:'appScreenshotSets',attributes:{screenshotDisplayType:p.group.displayType},relationships:{appStoreVersionLocalization:relation('appStoreVersionLocalizations',p.localeId)}}});setId=data.id;}
    const selected=[];
    for(let i=0;i<p.group.images.length;i++){
      const image=p.group.images[i];let shot=p.matched[i];
      if(!shot){
        shot=p.existing.find(s=>s.attributes.fileName===image.remoteName);
        if(shot?.attributes.assetDeliveryState?.state==='FAILED'){
          await client.json('DELETE',`/v1/appScreenshots/${shot.id}`);shot=undefined;
        }
        if(!shot)({data:shot}=await client.json('POST','/v1/appScreenshots',{data:{type:'appScreenshots',attributes:{fileName:image.remoteName,fileSize:image.bytes.length},relationships:{appScreenshotSet:relation('appScreenshotSets',setId)}}}));
        if(shot.attributes.assetDeliveryState?.state==='AWAITING_UPLOAD'){
          await client.uploadOperations(shot.attributes.uploadOperations,image.bytes);
          await client.json('PATCH',`/v1/appScreenshots/${shot.id}`,{data:{type:'appScreenshots',id:shot.id,attributes:{uploaded:true,sourceFileChecksum:image.md5}}});
        }
        shot=await client.ready(shot.id,image.md5);
      }
      selected.push(shot.id);
    }
    // Keep the old complete set until every desired image has processed successfully.
    for(const old of p.existing)if(!selected.includes(old.id))await client.json('DELETE',`/v1/appScreenshots/${old.id}`);
    await client.json('PATCH',`/v1/appScreenshotSets/${setId}/relationships/appScreenshots`,{data:selected.map(id=>({type:'appScreenshots',id}))});
    const verified=await client.list(`/v1/appScreenshotSets/${setId}/appScreenshots`);
    requireThat(JSON.stringify(verified.map(s=>s.id))===JSON.stringify(selected),'Screenshot order/count verification failed');
    requireThat(verified.every((s,i)=>s.attributes.assetDeliveryState?.state==='COMPLETE'&&s.attributes.sourceFileChecksum?.toLowerCase()===p.group.images[i].md5),'Final screenshot verification failed');
    record({group:label,result:'uploaded-and-verified',count:selected.length});
  }
}
