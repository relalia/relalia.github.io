import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import d from '../content/benchmark-comparativo-claude-2026-10-15.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
import manifest from '../content/originals.sha256.json' with {type:'json'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture={agil:{old:[5.5,7.5,7,8,7],new:[4.5,7.5,10,9,6.5],opOld:[10,6.5,4.5,7,7.5],opNew:[10,6.5,4.5,6,8]},pleno:{old:[9.5,8.5,6,9,6],new:[9,7.5,10,7.5,8],opOld:[9.5,6.5,5.5,6,7.5],opNew:[9.5,6.5,3.5,5,7.5]}};
const norm=s=>s.replace(/\r\n?/g,'\n').trim();
test('comparison sources preserve all 125 pertinent texts, hashes and registry links; no administrative backups',()=>{
  assert.equal(Object.keys(d.documents).length,125);
  for(const doc of Object.values(d.documents)) {
    assert(doc.path.endsWith('.txt'));
    assert(!/backup|benchmark\.json|README|Historico/.test(doc.path));
    const bytes=fs.readFileSync('public'+doc.path);
    assert.equal(sha(bytes),doc.sha256);assert.equal(bytes.length,doc.bytes);assert.equal(bytes.toString('utf8'),doc.text);
    assert.equal(manifest.find(m=>m.path===doc.path).sha256,doc.sha256);
  }
  const audit=JSON.parse(fs.readFileSync(`public/reports/${d.id}-auditoria.json`));
  assert.equal(Object.keys(audit.documents).length,125);
  assert(Object.values(audit.documents).every(doc=>!('text' in doc)));
  assert(audit.derivation.includes('Documento gerado'));
});
test('all 20 source judgments reproduce criteria, sums, totals, classifications, A/B and original outcomes',()=>{
  for(const r of d.rows)for(const p of ['old','new']){
    const text=d.documents[r.sources[p][`judgment:${r.mode}`]].text;
    const clean=s=>s.replaceAll('**','').trim();
    const number=s=>Number(s.replace('/10','').replace(',','.'));
    const table=text.split(/\r?\n/).filter(l=>l.startsWith('|')).map(l=>l.split('|').slice(1,-1).map(clean));
    for(const [i,letter] of ['A','B'].entries()) {
      let criteria,total,classification;
      if(table[0][0]==='Resposta'){
        const row=table.find(c=>c[0]===letter);criteria=row.slice(1,4).map(Number);total=Number(row[4]);classification=row[5];
      }else{
        criteria=table.filter(c=>/Conclusão|Fundamentação|Condições/.test(c[0])).map(c=>number(c[c.length-2+i]));
        total=number(table.find(c=>c[0].startsWith('Nota total')).at(-2+i));classification=table.find(c=>c[0]==='Classificação').at(-2+i);
      }
      assert.deepEqual(r[p].ab[letter].criteria,criteria);assert.equal(r[p].ab[letter].total,total);assert.equal(r[p].ab[letter].classification,classification);
      assert.equal(criteria.reduce((a,b)=>a+b,0),total);
    }
    assert(text.includes(r[p].result));
    const vcLetter=r.mapping.A==='opponent'?'B':'A';assert.equal(r[p].vcLetter,vcLetter);
    assert.deepEqual(r[p].vc,r[p].ab[vcLetter]);
    assert.equal(r[p].winner,r[p].vc.total===r[p].opponent.total?'tie':r[p].vc.total>r[p].opponent.total?'vc':'opponent');
  }
});
test('ten deltas, means, contribution and fixed-opponent oscillation match original scores',()=>{
  assert.equal(d.rows.length,10);
  for(const mode of ['agil','pleno']){
    const rows=d.rows.filter(r=>r.mode===mode),f=fixture[mode];
    for(const [i,r] of rows.entries()){
      assert.equal(r.old.vc.total,f.old[i]);assert.equal(r.new.vc.total,f.new[i]);assert.equal(r.delta,f.new[i]-f.old[i]);
      assert.equal(r.old.opponent.total,f.opOld[i]);assert.equal(r.new.opponent.total,f.opNew[i]);
    }
    const s=d.summary[mode];assert.equal(s.old,f.old.reduce((a,b)=>a+b,0)/5);assert.equal(s.new,f.new.reduce((a,b)=>a+b,0)/5);
    assert.equal(s.up,rows.filter(r=>r.delta>0).length);assert.equal(s.down,rows.filter(r=>r.delta<0).length);assert.equal(s.same,rows.filter(r=>r.delta===0).length);
  }
  assert.equal(d.concentration.agil,.6);assert.equal(d.concentration.pleno,.8);
  assert.equal(d.summary.agil.delta,.5);assert.equal(d.summary.pleno.delta,.6);
  assert.equal(d.changedOpponent,d.rows.filter(r=>r.old.opponent.total!==r.new.opponent.total).length);assert.equal(d.changedOpponent,4);
});
test('input integrity, reuse declaration and registered prompt payloads maintain question/mode identity',()=>{
  assert.equal(d.runs[1].config.previous,d.runs[0].id);
  assert.deepEqual(d.runs[0].config.judge,d.runs[1].config.judge);assert.deepEqual(d.runs[0].config.reviewer,d.runs[1].config.reviewer);
  assert.equal(d.runs[1].config.opponent.model,'Sonnet 5.5');
  assert.equal(d.runs[1].config.judge.model,'');
  for(const r of d.rows){
    for(const slot of ['question','reference','opponent','mapping']){
      assert.equal(d.documents[r.sources.old[slot]].sha256,d.documents[r.sources.new[slot]].sha256);
      assert.equal(r.integrity[slot].byteEqual,true);assert.equal(r.integrity[slot].textEqual,true);
    }
    assert.equal(r.integrity[r.mode].textEqual,false);
    assert(r.provenance.length>0);assert(r.provenance.every(v=>v.reused.run===d.runs[0].id&&v.sha256===d.documents[r.sources.old.opponent].sha256));
    assert.equal(r.mapping.A,['Q01','Q03','Q05'].includes(r.question)?'opponent':r.mode);
    const prompt=d.documents[r.prompt].text,parsed=prompt.match(/RESPOSTA A:\r?\n([\s\S]+?)\r?\n\r?\nRESPOSTA B:\r?\n([\s\S]+)/);
    assert(parsed);assert.equal(norm(parsed[1]),norm(d.documents[r.sources.new[r.mapping.A]].text));assert.equal(norm(parsed[2]),norm(d.documents[r.sources.new[r.mapping.B]].text));
    const reviewPrompt=d.documents[r.reviewPrompt].text;
    assert(reviewPrompt.includes(prompt));assert(reviewPrompt.includes(d.documents[r.sources.new[`judgment:${r.mode}`]].text));
    assert.equal(r.structured.totalA,null);assert.equal(r.structured.totalB,null);assert.deepEqual(r.structured.criteria,[]);
  }
  for(const slot of ['global','alternation'])assert.equal(d.documents[d.protocol.old[slot]].sha256,d.documents[d.protocol.new[slot]].sha256);
});
test('catalog entry has fixed date, PDF, ten historical links and preserves initial report',()=>{
  const r=catalog.reports.find(r=>r.id===d.id);assert(r);assert.equal(r.date,'2026-10-15');assert.equal(r.comparisonId,d.id);
  assert.equal(r.findings.length,10);assert(r.findings.every(f=>f.comparisons[0].reportId==='benchmark-claude-2026-10-13'));
  assert(catalog.reports.find(r=>r.id==='benchmark-claude-2026-10-13'));assert.equal(d.related[0].id,'benchmark-claude-2026-10-13');
  assert(d.highlights.some(h=>h.includes('Q03')));
  assert(!JSON.stringify(d.editorial).includes('inconclusividade global'));
  assert.equal(catalog.reports.find(r=>r.id==='benchmark-comparativo-2026-10-14').date,'2026-10-14');
});
