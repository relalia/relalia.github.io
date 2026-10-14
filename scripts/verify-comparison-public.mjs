import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import d from '../content/benchmark-comparativo-2026-10-14.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
const base='https://relalia.github.io',sha=b=>createHash('sha256').update(b).digest('hex');
const files=[...Object.values(d.documents),...catalog.reports.flatMap(r=>r.files.map(f=>({path:f.path,sha256:sha(fs.readFileSync('public'+f.path))}))),...['.md','-auditoria.json'].map(ext=>({path:`/reports/${d.id}${ext}`,sha256:sha(fs.readFileSync(`public/reports/${d.id}${ext}`))}))];
const proof=[];
for(let i=0;i<files.length;i+=8){
  const results=await Promise.allSettled(files.slice(i,i+8).map(async f=>{
    const res=await fetch(base+encodeURI(f.path),{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(res.status,200,f.path);
    const hash=sha(Buffer.from(await res.arrayBuffer()));assert.equal(hash,f.sha256,f.path);return {path:f.path,status:res.status,sha256:hash};
  }));for(const r of results){if(r.status!=='fulfilled')throw r.reason;proof.push(r.value);}
}
for(const route of ['/',`/relatorios/${d.id}/`,'/relatorios/benchmark-2026-10-09/']){
  const res=await fetch(base+route,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(res.status,200,route);
  const html=await res.text();assert(html.includes('access-password'));assert(html.includes(d.id),`New catalog entry missing on ${route}`);proof.push({path:route,status:res.status});
}
fs.mkdirSync('tmp/comparison-ui',{recursive:true});fs.writeFileSync('tmp/comparison-ui/public-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(`Public deploy confirmed: ${Object.keys(d.documents).length} source files, PDF/text/audit and historical attachments match SHA-256; report and catalog HTTP 200.`);
