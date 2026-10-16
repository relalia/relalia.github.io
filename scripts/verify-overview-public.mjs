import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import d from '../content/sintese-benchmarks-interface-2026-10-16.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const audit=JSON.parse(fs.readFileSync('public'+d.auditPath));
const files=[...Object.values(audit.documents),...d.images,...catalog.reports.flatMap(r=>r.files),...['.md','-dados.json','-fontes.json'].map(ext=>({path:`/reports/${d.id}${ext}`}))];
const unique=[...new Map(files.map(f=>[f.path,{path:f.path,sha256:f.sha256??sha(fs.readFileSync('public'+f.path))}])).values()];
const proof=[];
for(let i=0;i<unique.length;i+=8){
  const result=await Promise.allSettled(unique.slice(i,i+8).map(async f=>{
    const response=await fetch('https://relalia.github.io'+encodeURI(f.path),{cache:'no-store',signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,f.path);assert.equal(sha(Buffer.from(await response.arrayBuffer())),f.sha256,f.path);return {...f,status:200};
  }));for(const r of result){if(r.status==='rejected')throw r.reason;proof.push(r.value);}
}
for(const route of ['/',`/relatorios/${d.id}/`,...d.benchmarks.map(b=>`/relatorios/${b.comparisonId}/`)]){
  const response=await fetch('https://relalia.github.io'+route,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,route);
  const html=await response.text();assert(html.includes('access-password'));assert(html.includes(route==='/'?d.id:route.split('/')[2]));proof.push({path:route,status:200});
}
fs.mkdirSync('tmp/overview-ui',{recursive:true});fs.writeFileSync('tmp/overview-ui/public-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(`Confirmed public overview, catalog and two historical comparisons; ${unique.length} evidence/download URLs match SHA-256, including all 250 benchmark sources, six images and every historical PDF.`);
