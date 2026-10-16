import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import d from '../content/sintese-benchmarks-interface-2026-10-16.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
import {pairedSummary,parseJudge,mainPlot} from '../lib/overview-math.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('overview: all 40 source judgments retain 80 totals, criteria, classifications and A/B outcomes',()=>{
  assert.equal(d.benchmarks.length,2);
  for(const b of d.benchmarks){
    assert.equal(b.rows.length,10);
    for(const r of b.rows)for(const p of ['old','new']){
      const source=r.sources[p].documents['judgment:'+r.mode],bytes=fs.readFileSync('public'+source.path);
      assert.equal(sha(bytes),source.sha256);
      assert.deepEqual(parseJudge(bytes.toString('utf8'),r.sources[p].mapping,r.mode),r[p]);
      for(const s of Object.values(r[p].ab))assert.equal(s.criteria.reduce((a,b)=>a+b,0),s.total);
    }
  }
});
test('overview: paired denominators, all eight trajectories and contributions match independent fixtures',()=>{
  const fixture={chatgpt:[[4.6,5.8],[7.4,6.8],[7,6.2],[5.8,6.4]],claude:[[7,7.5],[7.8,8.4],[7.1,7],[7,6.4]]};
  for(const b of d.benchmarks){
    for(const [i,s] of b.series.entries()){
      assert.deepEqual(s.values,fixture[b.key][i]);
      const computed=pairedSummary(b.rows.filter(r=>r.mode===s.mode),s.participant);
      assert.deepEqual([computed.old,computed.new],s.values);assert.equal(computed.delta,s.delta);assert.equal(computed.denominator,5);
    }
    assert.deepEqual(b.plot,mainPlot(b.series));assert.equal(b.plot.top,30);assert.equal(b.plot.bottom,255);
    for(const mode of ['agil','pleno']){
      assert.deepEqual(b.summaries[mode],pairedSummary(b.rows.filter(r=>r.mode===mode)));
      const contributions=b.rows.filter(r=>r.mode===mode).map(r=>r.delta/5);
      assert(Math.abs(contributions.reduce((a,b)=>a+b,0)-b.summaries[mode].delta)<1e-12);
    }
  }
  const chat=d.benchmarks[0],claude=d.benchmarks[1];
  assert.equal(chat.rows.find(r=>r.id==='Q02-AGIL').contribution,1);
  assert.equal(claude.rows.find(r=>r.id==='Q03-AGIL').contribution,.6);
  assert.equal(claude.rows.find(r=>r.id==='Q03-PLENO').contribution,.8);
  assert(claude.rows.find(r=>r.id==='Q03-AGIL').change.includes('Mantém o prazo de 30 dias'));
  assert(claude.rows.find(r=>r.id==='Q03-PLENO').change.includes('já era desenvolvida no legado'));
});
test('overview: missing values do not become zero and deltas use the same paired questions',()=>{
  const r=(a,b)=>({old:{vc:{total:a}},new:{vc:{total:b}}});
  const s=pairedSummary([r(null,8),r(2,4),r(6,null)]);
  assert.equal(s.denominator,1);assert.equal(s.old,2);assert.equal(s.new,4);assert.equal(s.delta,2);
  assert.equal(pairedSummary([r(null,null)]).old,null);
});
test('overview: fixed opponents, declared provenance, distinct questions, exact dates and source index',()=>{
  const audit=JSON.parse(fs.readFileSync('public'+d.auditPath));
  assert.equal(audit.runs.reduce((n,r)=>n+r.fileCount,0),596);
  assert.equal(Object.keys(audit.documents).length,250);
  assert(audit.derivation.includes('Índice gerado'));
  for(const source of Object.values(audit.documents))assert.equal(sha(fs.readFileSync('public'+source.path)),source.sha256);
  assert.equal(audit.runs.flatMap(r=>r.unusedPrompts).filter(p=>!p.sentDeclared).length,1);
  for(const [i,b] of d.benchmarks.entries()){
    assert.equal(b.changedOpponent,i?4:5);
    assert.deepEqual(b.dates,i?['2026-10-13','2026-10-15']:['2026-10-09','2026-10-14']);
    for(const r of b.rows){
      for(const slot of ['question','reference','opponent','mapping'])assert.equal(r.sources.old.documents[slot].sha256,r.sources.new.documents[slot].sha256);
      assert(r.provenance.every(v=>v.reused.run===b.runs[0].id&&v.sha256===r.sources.old.documents.opponent.sha256));
      assert.equal(r.sources.new.mapping.A,['Q01','Q03','Q05'].includes(r.question)?'opponent':r.mode);
    }
  }
  for(let i=0;i<10;i++)assert.notEqual(d.benchmarks[0].rows[i].sources.old.documents.question.sha256,d.benchmarks[1].rows[i].sources.old.documents.question.sha256);
  assert.notEqual(d.benchmarks[0].runs[0].config.judge.platform,d.benchmarks[1].runs[0].config.judge.platform);
});
test('overview: six original images, four partial scopes and historical links are preserved',()=>{
  const report=catalog.reports.find(r=>r.id===d.id);assert.equal(report.date,'2026-10-16');assert.equal(report.overviewId,d.id);
  assert.equal(d.images.length,6);assert.equal(d.improvements.length,4);
  for(const image of d.images){assert.equal(sha(fs.readFileSync('public'+image.path)),image.sha256);assert(catalog.evidence.find(e=>e.id===image.id&&e.sha256===image.sha256));}
  for(const f of report.findings){assert(f.status.includes('parcial'));assert.equal(f.retest.execution,'not-performed');assert(f.comparisons.length);}
  const bytes=fs.readFileSync('public'+d.dataPath);assert.deepEqual(JSON.parse(bytes),d);
  const md=fs.readFileSync(`public/reports/${d.id}.md`,'utf8');
  for(const b of d.benchmarks)for(const s of Object.values(b.summaries))assert(md.includes(`${s.up} / ${s.down} / ${s.same}`));
  for(const item of d.improvements)assert(md.includes(item.description)&&md.includes(item.limit));
});
