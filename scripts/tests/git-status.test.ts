import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['crossplatform/src/main/git.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {gitStatus}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('Git preserves the leading porcelain status column and full filename',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'merkzeug-git-test-'));
 try{
  const git=(...args:string[])=>execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null',...args],{cwd:dir,stdio:'ignore'});
  git('init','-b','main');await writeFile(join(dir,'Welcome.md'),'First\n');git('add','.');git('commit','-m','Initial');
  await writeFile(join(dir,'Welcome.md'),'Changed\n');
  const result=await gitStatus(dir);assert.deepEqual(result.changes,[{code:' M',path:'Welcome.md'}]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
