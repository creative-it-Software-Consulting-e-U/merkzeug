/** Inspect actual packaged metadata/notices, including cross-built Windows ARM64. */
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(resolve('crossplatform/package.json'));
const {extractFile}=require('@electron/asar');
const [platform,arch,output]=process.argv.slice(2);
const base=resolve('crossplatform/dist');
const root=platform==='mac'?join(base,arch==='arm64'?'mac-arm64':'mac','Merkzeug.app','Contents'):join(base,platform==='win'?(arch==='arm64'?'win-arm64-unpacked':'win-unpacked'):(arch==='arm64'?'linux-arm64-unpacked':'linux-unpacked'));
const resources=join(root,platform==='mac'?'Resources':'resources');
const metadata=JSON.parse(extractFile(join(resources,'app.asar'),'package.json').toString());
assert.equal(metadata.version,(await readFile('VERSION','utf8')).trim());
assert.equal(metadata.name,'merkzeug');
const binary=await readFile(join(root,platform==='mac'?'MacOS/Merkzeug':platform==='win'?'Merkzeug.exe':'merkzeug'));
if(platform==='win') assert.equal(binary.readUInt16LE(binary.readUInt32LE(0x3c)+4),arch==='arm64'?0xaa64:0x8664);
else if(platform==='linux') assert.equal(binary.readUInt16LE(18),arch==='arm64'?183:62);
else assert.equal(binary.readUInt32LE(4),arch==='arm64'?0x0100000c:0x01000007);
const notices=[];
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.txt','help/Help.en.md','help/Help.de.md']){
 const content=await readFile(join(resources,name));assert.ok(content.length>20,name);
 notices.push({name,bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')});
}
await mkdir(output,{recursive:true});
await writeFile(join(output,'package-inspection.json'),JSON.stringify({platform,arch,version:metadata.version,status:'passed',notices},null,2)+'\n');
