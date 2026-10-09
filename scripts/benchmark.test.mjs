import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import benchmark from '../content/benchmark-2026-10-09.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
import {statistics} from '../lib/benchmark-math.mjs';

export function benchmarkDocuments(b=benchmark) {
  return [b.protocol,b.alternation,...b.questions.flatMap(q=>[q.question,q.human,q.chatgpt,...['agil','pleno'].flatMap(m=>[q.comparisons[m].response,q.comparisons[m].document,q.comparisons[m].review])])];
}
test('all 47 original texts and hashes match byte-preserved public files',()=>{
  const docs=benchmarkDocuments();
  assert.equal(docs.length,47);
  assert.equal(new Set(docs.map(d=>d.path)).size,47);
  for(const doc of docs) {
    const bytes=fs.readFileSync(`public${doc.path}`);
    assert.equal(bytes.length,doc.bytes);
    assert.equal(bytes.toString('utf8'),doc.text);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);
  }
});
test('A/B attribution, all criterion points, totals, classifications and winners match source tables',()=>{
  const declaredTotals={agil:[[2,5],[2,10],[10,10],[1,6],[8,4]],pleno:[[5,5],[4,9],[10,10],[8,3],[10,2]]};
  for(const [index,q] of benchmark.questions.entries()) {
    assert.equal(q.id,`Q0${index+1}`);
    assert.equal(q.order.A,index%2===0?'chatgpt':'vadechat');
    assert.ok(benchmark.alternation.text.includes(`${q.id}: A (${q.order.A==='chatgpt'?'ChatGPT':'Vadechat'})`));
    for(const mode of ['agil','pleno']) {
      const c=q.comparisons[mode];
      const rows=c.document.text.split(/\r?\n/).filter(line=>line.startsWith('|')).map(line=>line.split('|').slice(1,-1).map(s=>s.replace(/\*\*/g,'').trim()));
      for(const [participant,position] of [['vadechat',0],['chatgpt',1]]) {
        const s=c.scores[participant];
        assert.equal(s.total,declaredTotals[mode][index][position]);
        const letter=q.order.A===participant?'A':'B';
        if(rows[0][0]==='Resposta') {
          const row=rows.find(row=>row[0]===letter);
          assert.deepEqual(s.criteria,row.slice(1,4).map(Number));
          assert.equal(s.classification,row[5]);
          assert.equal(s.total,Number(row[4]));
        } else {
          const col=letter==='A'?1:2;
          assert.deepEqual(s.criteria,rows.filter(row=>/^[123]\./.test(row[0])).map(row=>Number(row[col])));
          assert.equal(s.total,Number(rows.find(row=>row[0]==='Nota total')[col]));
          assert.equal(s.classification,rows.find(row=>row[0]==='Classificação')[col]);
        }
        assert.equal(s.criteriaSum,s.criteria.reduce((a,b)=>a+b,0));
        assert.equal(s.criteriaSum,s.total,'No source sum discrepancies in this run');
        s.criteria.forEach((n,i)=>assert.ok(n>=0 && n<=[4,4,2][i]));
        assert.ok(c.review.path.includes(`R0${index+1}_VC_`));
      }
      const sourceResult=c.document.text.split('## 3. Resultado')[1].split('## 4.')[0].trim();
      assert.equal(c.resultOriginal,sourceResult);
      const winner=sourceResult.includes('A venceu')?q.order.A:sourceResult.includes('B venceu')?q.order.B:'tie';
      assert.equal(c.winner,winner);
    }
  }
});
test('separate ChatGPT series and original statistics remain unchanged',()=>{
  assert.deepEqual(statistics(benchmark.questions,'agil','vadechat'),{mean:4.6,wins:1,ties:1,losses:3,count:5});
  assert.deepEqual(statistics(benchmark.questions,'agil','chatgpt'),{mean:7,wins:3,ties:1,losses:1,count:5});
  assert.deepEqual(statistics(benchmark.questions,'pleno','vadechat'),{mean:7.4,wins:2,ties:2,losses:1,count:5});
  assert.deepEqual(statistics(benchmark.questions,'pleno','chatgpt'),{mean:5.8,wins:1,ties:2,losses:2,count:5});
  assert.deepEqual(benchmark.questions.map(q=>q.comparisons.pleno.scores.chatgpt.total-q.comparisons.agil.scores.chatgpt.total),[0,-1,0,-3,-2]);
  assert.equal(benchmark.questions[3].comparisons.agil.scores.chatgpt.classification,'Parcialmente conforme');
  assert.equal(benchmark.questions[3].comparisons.pleno.scores.chatgpt.classification,'Divergente');
  const missing=structuredClone(benchmark.questions);
  missing[0].comparisons.agil.scores.vadechat.total=null;
  assert.equal(statistics(missing,'agil','vadechat').mean,21/4);
  assert.equal(statistics([],'agil','vadechat').mean,null);
});
test('report is dated, integrated and separates reviewer from participant',()=>{
  const report=catalog.reports.find(r=>r.id===benchmark.id);
  assert.equal(report.date,'2026-10-09');
  assert.equal(report.benchmarkId,benchmark.id);
  assert.equal([...catalog.reports].sort((a,b)=>b.date.localeCompare(a.date))[0].id,benchmark.id);
  assert.equal(report.findings.length,5);
  assert.equal(benchmark.metadata.chatgptModel,'modelo não identificado');
  assert.match(benchmark.metadata.reviewerRole,/não gerou/);
});
