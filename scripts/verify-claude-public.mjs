// Confirm actual deployed URLs and bytes, including every new source and all prior PDFs.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import b from '../content/benchmark-claude-2026-10-13.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
const base='https://relalia.github.io';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const docs=[b.protocol,b.alternation,...b.questions.flatMap(q=>[q.question,q.human,q.alternative,...['agil','pleno'].flatMap(m=>[q.comparisons[m].response,q.comparisons[m].document,q.comparisons[m].review])])];
const files=[...docs,...catalog.reports.flatMap(r=>r.files.filter(f=>f.kind==='pdf').map(f=>({path:f.path,sha256:hash(fs.readFileSync(`public${f.path}`))})))];
const proofs=[];
for(let i=0;i<files.length;i+=8) {
  const results=await Promise.allSettled(files.slice(i,i+8).map(async file=>{
    const response=await fetch(`${base}${file.path}`,{signal:AbortSignal.timeout(30000),cache:'no-store'});
    assert.equal(response.status,200,file.path);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(hash(bytes),file.sha256,`Deployed hash differs: ${file.path}`);
    return {url:`${base}${file.path}`,status:response.status,sha256:hash(bytes)};
  }));
  for(const result of results){if(result.status!=='fulfilled')throw result.reason;proofs.push(result.value);}
}
for(const route of ['/',`/relatorios/${b.id}/`,'/relatorios/benchmark-2026-10-09/']) {
  const response=await fetch(base+route,{signal:AbortSignal.timeout(30000),cache:'no-store'});
  assert.equal(response.status,200,route);const html=await response.text();
  assert.ok(html.includes('access-password'),`Existing access gate missing ${route}`);
  assert.ok(html.includes(route.includes('2026-10-09')?'benchmark-2026-10-09':b.id),`Report/card absent from exported payload ${route}`);
  if(!route.includes('2026-10-09'))assert.ok(html.includes('Sonnet 5.5 Médio') && html.includes('ChatGPT Grátis') && html.includes('GPT-6.1 Alta'));
  proofs.push({url:base+route,status:response.status});
}
fs.mkdirSync('tmp/benchmark-ui',{recursive:true});fs.writeFileSync('tmp/benchmark-ui/claude-public-proof.json',JSON.stringify(proofs,null,2)+'\n');
console.log(`Public deployment confirmed: ${docs.length} byte-identical new originals, ${files.length-docs.length} PDFs with matching hashes, report/home card/history HTTP 200.`);
