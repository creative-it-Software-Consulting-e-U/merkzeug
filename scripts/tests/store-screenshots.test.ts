import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {jwt,Client,hash,loadBundle,plan,apply} from '../lib/store-screenshots.mjs';

const image={bytes:Buffer.from('image'),md5:hash(Buffer.from('image'),'md5'),remoteName:'managed.png'};
const group={platform:'IOS',locale:'en-US',displayType:'APP_IPHONE_67',images:[image]};
const screenshot=(id,md5=image.md5,state='COMPLETE')=>({id,attributes:{sourceFileChecksum:md5,assetDeliveryState:{state},fileName:md5===image.md5?'managed.png':'old.png'}});
function fakePlan(existing=[],state='PREPARE_FOR_SUBMISSION'){
 return {list:async path=>path.includes('/apps/')?[{id:'v',attributes:{platform:'IOS',versionString:'1.0',appStoreState:state}}]:path.includes('/appStoreVersions/')?[{id:'l',attributes:{locale:'en-US'}}]:path.includes('/appStoreVersionLocalizations/')?[{id:'s',attributes:{screenshotDisplayType:'APP_IPHONE_67'}}]:existing};
}
test('JWT is ES256 with a short expiry and no secret in the payload',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const token=jwt({ASC_KEY_ID:'test',ASC_ISSUER_ID:'issuer',ASC_PRIVATE_KEY_BASE64:Buffer.from(privateKey.export({format:'pem',type:'pkcs8'})).toString('base64')},1000);
 const [head,body,sig]=token.split('.');assert.equal(JSON.parse(Buffer.from(body,'base64url').toString()).exp,1600);
 assert.ok(verify('sha256',Buffer.from(`${head}.${body}`),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')));
});
test('reviewed bundle is complete and integrity validated',async()=>{
 const b=await loadBundle('store/upload/manifest.json');assert.equal(b.groups.length,6);assert.equal(b.groups.flatMap(g=>g.images).length,22);
});
test('planner preserves existing sets by default and detects identical content',async()=>{
 const b={appId:'1',groups:[group]};
 assert.equal((await plan(fakePlan([screenshot('old','different')]),b,'1.0',['IOS'],'if-missing'))[0].action,'keep');
 assert.equal((await plan(fakePlan([screenshot('same')]),b,'1.0',['IOS'],'sync'))[0].action,'identical');
 await assert.rejects(plan(fakePlan([],'READY_FOR_SALE'),b,'1.0',['IOS'],'sync'),/not editable/);
 await assert.rejects(plan(fakePlan(),b,'2.0',['IOS'],'sync'),/exactly one/);
});
test('chunk uploads cover exact offsets and never receive the API bearer token',async()=>{
 const seen=[];const c=new Client({token:()=> 'secret',request:async(url,options)=>{seen.push(options);return {ok:true};}});
 const operation=(offset,length)=>({url:'https://store.apple.com/upload?signature=hidden',method:'PUT',offset,length,requestHeaders:[{name:'Content-Type',value:'image/png'}]});
 await c.uploadOperations([operation(2,3),operation(0,2)],Buffer.from('12345'));
 assert.deepEqual(seen.map(x=>x.body.toString()),['12','345']);assert.ok(seen.every(x=>!x.headers.Authorization));
 await assert.rejects(c.uploadOperations([operation(1,4)],Buffer.from('12345')),/coverage/);
 await assert.rejects(c.json('GET','https://other.example/v1/apps'),/non-API/);
});
test('failed processing preserves every old screenshot',async()=>{
 const calls=[];const c={json:async(method,path)=>{calls.push([method,path]);return {data:{id:'new',attributes:{assetDeliveryState:{state:'UPLOAD_COMPLETE'}}}};},ready:async()=>{throw Error('processing failed');}};
 await assert.rejects(apply(c,[{group,setId:'s',existing:[screenshot('old','old')],matched:[undefined],action:'update'}]),/processing failed/);
 assert.ok(!calls.some(([method])=>method==='DELETE'));
});
test('completed staged upload replaces only the selected set and verifies order',async()=>{
 const calls=[];const c={json:async(method,path,body)=>{calls.push([method,path,body]);return {data:{id:'new',attributes:{assetDeliveryState:{state:'UPLOAD_COMPLETE'}}}};},ready:async()=>screenshot('new'),list:async()=>[screenshot('new')]};
 await apply(c,[{group,setId:'s',existing:[screenshot('old','old')],matched:[undefined],action:'update'}]);
 assert.equal(calls.findIndex(([m])=>m==='DELETE')>calls.findIndex(([m])=>m==='POST'),true);
 assert.deepEqual(calls.at(-1)[2],{data:[{type:'appScreenshots',id:'new'}]});
});
test('read pagination is followed and rejects foreign next links',async()=>{
 const c=new Client({token:()=> 'secret',request:async()=>({ok:true,status:200,json:async()=>({data:[],links:{next:'https://foreign.example/v1/x'}})})});
 await assert.rejects(c.list('/v1/apps'),/non-API/);
});

test('capacity preflight preserves a full set without writes',async()=>{
 const existing=Array.from({length:10},(_,i)=>screenshot(`old-${i}`,`old-${i}`));
 await assert.rejects(plan(fakePlan(existing),{appId:'1',groups:[group]},'1.0',['IOS'],'sync'),/staging slots/);
});
test('rerun resumes a pending upload and commits its MD5 without reserving again',async()=>{
 const calls=[];
 const pending=screenshot('pending',image.md5,'AWAITING_UPLOAD');
 pending.attributes.uploadOperations=[];
 const c={
  json:async(method,path,body)=>{calls.push([method,path,body]);return {};},
  uploadOperations:async(_,bytes)=>{assert.deepEqual(bytes,image.bytes);calls.push(['UPLOAD']);},
  ready:async(id,md5)=>{assert.equal(id,'pending');assert.equal(md5,image.md5);return screenshot(id);},
  list:async()=>[screenshot('pending')]
 };
 const plans=await plan(fakePlan([pending]),{appId:'1',groups:[group]},'1.0',['IOS'],'sync');
 await apply(c,plans);
 assert.ok(!calls.some(([method])=>method==='POST'||method==='DELETE'));
 assert.equal(calls[0][0],'UPLOAD');
 assert.equal(calls[1][2].data.attributes.sourceFileChecksum,image.md5);
 const second=await plan(fakePlan([screenshot('pending')]),{appId:'1',groups:[group]},'1.0',['IOS'],'sync');
 const count=calls.length;await apply(c,second);assert.equal(calls.length,count);
});

test('processing completion waits for the eventually visible checksum',async()=>{
 let reads=0;const c=new Client({token:()=> 'test',pause:async()=>{},request:async()=>({ok:true,status:200,json:async()=>({data:screenshot('new',++reads===1?null:image.md5)})})});
 assert.equal((await c.ready('new',image.md5)).id,'new');assert.equal(reads,2);
});
test('if-missing resumes a partially completed managed group',async()=>{
 const extended={...group,images:[image,{...image,md5:'second',remoteName:'second.png'}]};
 const p=await plan(fakePlan([screenshot('first')]),{appId:'1',groups:[extended]},'1.0',['IOS'],'if-missing');
 assert.equal(p[0].action,'update');assert.equal(p[0].matched[0].id,'first');
});
