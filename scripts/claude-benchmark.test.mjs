import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import b from '../content/benchmark-claude-2026-10-13.json' with {type:'json'};
import catalog from '../content/reports.json' with {type:'json'};
import {statistics,classificationCounts,outcomeCounts} from '../lib/benchmark-math.mjs';
const modes=['agil','pleno'],participants=['vadechat','alternative'];
test('Claude run has all 47 original files, unmodified text/bytes/hashes and complete links',()=>{
  const docs=[b.protocol,b.alternation,...b.questions.flatMap(q=>[q.question,q.human,q.alternative,...modes.flatMap(m=>[q.comparisons[m].response,q.comparisons[m].document,q.comparisons[m].review])])];
  assert.equal(docs.length,47);assert.equal(new Set(docs.map(d=>d.path)).size,47);
  for(const doc of docs){const bytes=fs.readFileSync(`public${doc.path}`);assert.equal(bytes.length,doc.bytes);assert.equal(bytes.toString('utf8'),doc.text);assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256);}
  for(const q of b.questions)for(const mode of modes){assert.equal(q.comparisons[mode].alternative.text,q.alternative.text);assert.equal(q.comparisons[mode].alternative.sha256,q.alternative.sha256);assert.deepEqual(q.comparisons[mode].order,q.order);}
});
test('all original criteria, decimal totals, classifications, A/B identities and results match source',()=>{
  const fixture={agil:[[5.5,10],[7.5,6.5],[7,4.5],[8,7],[7,7.5]],pleno:[[9.5,9.5],[8.5,6.5],[6,5.5],[9,6],[6,7.5]]};
  const winners={agil:['alternative','vadechat','vadechat','vadechat','alternative'],pleno:['tie','vadechat','vadechat','vadechat','alternative']};
  for(const [i,q] of b.questions.entries())for(const mode of modes){
    const c=q.comparisons[mode],clean=s=>s.replace(/\\\./g,'.').replace(/\*\*/g,'').trim();
    const rows=c.document.text.split(/\r?\n/).filter(line=>line.startsWith('|')).map(line=>line.split('|').slice(1,-1).map(clean));
    const number=s=>Number(s.split('/')[0].replace(',','.'));
    assert.equal(c.order.A,i%2===0?'alternative':'vadechat');
    const effectiveA=c.review.text.match(/resposta A \(([^)]+)\)/i)[1];
    assert.equal(effectiveA.includes('Claude')?'alternative':'vadechat',c.order.A);
    for(const [index,p] of participants.entries()){
      const s=c.scores[p],letter=c.order.A===p?'A':'B',col=rows[0].indexOf(`Resposta ${letter}`);
      assert.deepEqual(s.criteria,rows.filter(row=>/Conclusão|Fundamentação|Condições/.test(row[0])).map(row=>number(row[col])));
      assert.equal(s.total,number(rows.find(row=>row[0].startsWith('Nota total'))[col]));
      assert.equal(s.total,fixture[mode][i][index]);
      assert.equal(s.classification,rows.find(row=>row[0]==='Classificação')[col]);
      assert.equal(s.criteriaSum,s.criteria.reduce((a,n)=>a+n,0));assert.equal(s.criteriaSum,s.total);
      assert.ok(s.total>=0 && s.total<=10);s.criteria.forEach((n,i)=>assert.ok(n>=0 && n<=[4,4,2][i]));
    }
    assert.equal(c.winner,winners[mode][i]);assert.equal(c.observations.length,0);
    assert.ok(c.resultOriginal.includes('Empate')||c.resultOriginal.includes('venceu')||c.resultOriginal.includes('Vencedora: Resposta A'));
    assert.match(c.reviewKind,/sem pontuação alternativa/);
  }
});
test('statistics retain two independent Claude series and classification/outcome denominators',()=>{
  assert.deepEqual(statistics(b.questions,'agil','vadechat'),{mean:7,wins:3,ties:0,losses:2,count:5});
  assert.deepEqual(statistics(b.questions,'agil','alternative'),{mean:7.1,wins:2,ties:0,losses:3,count:5});
  assert.deepEqual(statistics(b.questions,'pleno','vadechat'),{mean:7.8,wins:3,ties:1,losses:1,count:5});
  assert.deepEqual(statistics(b.questions,'pleno','alternative'),{mean:7,wins:1,ties:1,losses:3,count:5});
  assert.deepEqual(b.questions.map(q=>q.comparisons.pleno.scores.alternative.total-q.comparisons.agil.scores.alternative.total),[-.5,0,1,-1,0]);
  for(const mode of modes)for(const p of participants){const classes=classificationCounts(b.questions,mode,p);assert.equal(Object.values(classes).reduce((a,n)=>a+n,0),5);assert.equal(classes.Abstenção,0);assert.equal(classes.Inconclusiva,0);}
  assert.deepEqual(classificationCounts(b.questions,'pleno','vadechat'),{Conforme:3,'Parcialmente conforme':2,Divergente:0,Abstenção:0,Inconclusiva:0});
  assert.deepEqual(outcomeCounts(b.questions,'pleno'),{ordinaryTies:1,abstentionTies:0,inconclusive:0,total:5});
  const absent=structuredClone(b.questions);absent[0].comparisons.agil.scores.vadechat.total=null;assert.equal(statistics(absent,'agil','vadechat').mean,29.5/4);
  const abstention=structuredClone(b.questions);abstention[0].comparisons.agil.winner='tie';abstention[0].comparisons.agil.tieKind='abstention';assert.equal(outcomeCounts(abstention,'agil').abstentionTies,1);
});
test('reference content is separate from administrative text; weights and review caveats remain sourced',()=>{
  assert.deepEqual(b.questions.flatMap(q=>q.mandatoryFacts).map(f=>f.weight),[1,1]);
  for(const q of b.questions){assert.ok(!q.referenceText.includes('Variações da pergunta'));assert.ok(!q.referenceText.includes('Fatos obrigatórios'));assert.ok(!q.question.text.includes('Variações da pergunta'));assert.ok(q.human.text.includes(q.referenceText));}
  const q4=b.questions[3].comparisons.pleno,q5=b.questions[4].comparisons.pleno;
  assert.match(q4.reviewProblem,/CEP apenas urbano/);assert.match(q4.reviewImpact,/7 para 6/);
  assert.match(q5.reviewProblem,/Toda pessoa capaz/);assert.match(q5.reviewProblem,/recomendação/);assert.match(q5.reviewAction,/notas e vencedor/);
  assert.match(b.questions[1].referenceNotes,/Obs|parágrafos|parágrafos/i);
});
test('published catalog separates executor-confirmed date, platform roles and model visibility',()=>{
  const report=catalog.reports.find(r=>r.id===b.id);assert.equal(report.date,'2026-10-13');assert.equal(b.executionDate,'2026-10-13');assert.equal(b.publicationDate,'2026-10-13');
  assert.match(b.dateBasis,/confirmada pelo executor/);assert.match(b.judgeLabel,/ChatGPT Grátis.*modelo não identificado/);assert.match(b.metadata.alternativeModel,/Sonnet 5.5 Médio/);assert.match(b.conditions.join(' '),/sem login/);assert.match(b.conditions.join(' '),/não afirmam/);
  assert.ok(catalog.reports.some(r=>r.id==='benchmark-2026-10-09'));assert.equal(report.findings.length,5);
});
