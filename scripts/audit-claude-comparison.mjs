import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const output = path.resolve('private/benchmark-comparativo-claude-2026-10-15');
fs.mkdirSync(output,{recursive:true});
const roots = [
  'C:/Users/Rafae/Downloads/Benchmarks/Benchmark_Manual_VC_x_Claude_2026-10-13_legado01',
  'C:/Users/Rafae/Downloads/Benchmarks/Benchmark_Manual_VC_x_Claude_2026-10-15_run02',
];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalized = text => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const problems = [];
function inventory(root, dir = '') {
  return fs.readdirSync(path.join(root, dir), {withFileTypes:true}).flatMap(entry => {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return inventory(root, relative);
    const bytes = fs.readFileSync(path.join(root, relative));
    return [{path:relative, bytes:bytes.length, sha256:sha(bytes)}];
  });
}
function inspect(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'benchmark.json'), 'utf8'));
  const backup = JSON.parse(fs.readFileSync(path.join(root, 'benchmark.backup.json'), 'utf8'));
  assert.equal(backup.id,manifest.id);
  assert.deepEqual(backup.config,manifest.config);
  const files = inventory(root);
  for (const evidence of manifest.evidence) {
    const actual = files.find(f => f.path === evidence.path);
    assert(actual, `Missing evidence ${evidence.path}`);
    assert.equal(actual.sha256, evidence.hash, evidence.path);
    assert.equal(actual.bytes, evidence.bytes, evidence.path);
  }
  for (const record of Object.values(manifest.records)) for (const version of record.versions) {
    const actual = fs.readFileSync(path.join(root, version.file));
    assert.equal(sha(actual), version.hash, version.file);
    assert.equal(actual.toString('utf8'), version.text, version.file);
  }
  for (const p of manifest.prompts) {
    assert.equal(p.benchmarkId, manifest.benchmarkId);
    assert.equal(p.executionId, manifest.id);
    assert.equal(sha(fs.readFileSync(path.join(root,p.file))),p.hash,p.file);
    assert.equal(fs.readFileSync(path.join(root,p.file),'utf8'),p.text,p.file);
    assert.equal(manifest.questions.find(q=>q.id===p.question)?.label,p.questionLabel);
  }
  return {root,manifest,backup,files};
}
const runs = roots.map(inspect);
assert.equal(runs[0].manifest.benchmarkId,runs[1].manifest.benchmarkId);
assert.equal(runs[1].manifest.config.previous,runs[0].manifest.id);
const get = (run,q,slot) => {
  const record=run.manifest.records[`${q.id}/${slot}`];
  if (!record.versions.length) return null;
  const version=record.versions.at(-1);
  const bytes=fs.readFileSync(path.join(run.root,record.path));
  assert.equal(bytes.toString('utf8'),version.text,`${run.manifest.config.runId}: ${record.path}`);
  return {path:record.path,sha256:sha(bytes),text:version.text,version,recordKey:record.key};
};
function equal(a,b) {
  return {byteEqual:a.sha256===b.sha256,textEqual:normalized(a.text)===normalized(b.text),oldHash:a.sha256,newHash:b.sha256,oldPath:a.path,newPath:b.path};
}
function scores(text, mapping, label) {
  const clean=s=>s.replace(/\*\*/g,'').trim();
  const num=s=>{const m=clean(s).match(/^([0-9]+(?:[.,][0-9]+)?)(?:\/10)?$/);assert(m,label+': '+s);return Number(m[1].replace(',','.'));};
  const table=text.split(/\r?\n/).filter(s=>s.startsWith('|')).map(s=>s.split('|').slice(1,-1).map(clean));
  const ab={};
  const criteria=table.filter(r=>/Conclusão|Fundamentação|Condições/.test(r[0]));
  const total=table.find(r=>/^Nota total/.test(r[0])),classification=table.find(r=>r[0]==='Classificação');
  for(const [i,letter] of ['A','B'].entries()){
    const col=table[0].length-2+i;
    const score=ab[letter]={criteria:criteria.map(r=>num(r[col])),total:num(total[col]),classification:classification[col]};
    assert.equal(score.criteria.length,3,label);score.sum=score.criteria.reduce((a,b)=>a+b,0);
    if(score.sum!==score.total)problems.push(label+': soma difere '+letter);
  }
  const result=text.split(/\r?\n/).find(l=>/^(?:#{1,6}\s*)?(?:\*{0,2})?(?:[AB]\s+venceu|[Ee]mpate|[Vv]encedor[ae]?:)/.test(l));
  assert(result,label+': resultado ausente');
  const winner=/A venceu|Vencedor[ae]?:.*Resposta A/i.test(result)?'A':/B venceu|Vencedor[ae]?:.*Resposta B/i.test(result)?'B':/empate/i.test(result)?'tie':'inconclusive';
  const byScore=ab.A.total===ab.B.total?'tie':ab.A.total>ab.B.total?'A':'B';
  if(winner!==byScore)problems.push(label+': vencedor e total divergem');
  const vcLetter=mapping.A==='opponent'?'B':'A';
  return {ab,vc:ab[vcLetter],opponent:ab[vcLetter==='A'?'B':'A'],vcLetter,result,winner:winner===vcLetter?'vc':winner==='tie'?'tie':winner==='inconclusive'?'inconclusive':'opponent'};
}
const questions = runs[0].manifest.questions.map(oldQ=>{
  const newQ=runs[1].manifest.questions.find(q=>q.ordinal===oldQ.ordinal&&q.label===oldQ.label);
  assert(newQ);
  const paired={label:oldQ.label,ordinal:oldQ.ordinal,oldId:oldQ.id,newId:newQ.id,integrity:{},sources:{},comparisons:{}};
  paired.provenance=runs[1].manifest.records[`${newQ.id}/opponent`].versions.filter(v=>v.reused).map(v=>({version:v.id,sha256:v.hash,reused:v.reused}));
  for(const slot of ['question','reference','facts','referencePrompt','opponent','mapping','agil','pleno','judgment:agil','judgment:pleno','review:agil','review:pleno']) {
    const a=get(runs[0],oldQ,slot),b=get(runs[1],newQ,slot);
    paired.sources[slot]={old:a,new:b};
    if(a&&b)paired.integrity[slot]=equal(a,b);
    else paired.integrity[slot]={oldPresent:!!a,newPresent:!!b};
  }
  // Match the question itself, reference, declared reuse, and full identity chain; labels alone are insufficient.
  assert(paired.integrity.question.textEqual);
  for(const v of paired.sources.opponent.new.version.reused?[paired.sources.opponent.new.version]:runs[1].manifest.records[`${newQ.id}/opponent`].versions.filter(v=>v.reused)) {
    assert.equal(v.reused.run,runs[0].manifest.id);
    assert.equal(v.reused.record,`${oldQ.id}/opponent`);
    const origin=runs[0].manifest.records[v.reused.record].versions.find(x=>x.id===v.reused.version);
    assert(origin);
    assert.equal(origin.hash,v.hash);
  }
  for(const mode of ['agil','pleno']) {
    const jd=paired.sources[`judgment:${mode}`];
    const prompt=runs[1].manifest.prompts.find(p=>p.id===jd.new.version.promptId);
    assert(prompt&&prompt.question===newQ.id&&prompt.mode===mode&&prompt.kind==='judgment');
    assert.deepEqual(prompt.identity,runs[1].manifest.config.judge);
    const protocol=runs[1].manifest.records['config/global'].versions.find(v=>v.hash===prompt.dependencies['config/global']);
    assert(prompt.text.startsWith(protocol.text.split('PERGUNTA:')[0]));
    const oldMap=paired.sources.mapping.old.text==='opponent'?{A:'opponent',B:mode}:{A:mode,B:'opponent'};
    assert.deepEqual(prompt.mapping,oldMap);
    for(const [dependency,hash] of Object.entries(prompt.dependencies)) {
      if(hash==='ausente')continue;
      const record=runs[1].manifest.records[dependency];
      assert(record?.versions.some(v=>v.hash===hash),`${oldQ.label} dependency ${dependency}`);
      if(record.versions.at(-1).hash!==hash)problems.push(`${oldQ.label} ${mode}: versão atual difere da usada (${dependency})`);
    }
    for(const slot of ['question','reference','opponent',mode]) {
      const source=paired.sources[slot].new;
      assert.equal(prompt.dependencies[`${newQ.id}/${slot}`],source.version.hash);
      assert(prompt.text.includes(source.text),`${oldQ.label} ${mode}: ${slot} missing in prompt`);
    }
    const a=prompt.mapping.A==='opponent'?paired.sources.opponent.new.text:paired.sources[mode].new.text;
    const b=prompt.mapping.B==='opponent'?paired.sources.opponent.new.text:paired.sources[mode].new.text;
    assert(prompt.text.includes(`RESPOSTA A:\r\n${a}\r\n\r\nRESPOSTA B:\r\n${b}`));
    const review=paired.sources[`review:${mode}`].new;
    const rp=runs[1].manifest.prompts.find(p=>p.id===review.version.promptId);
    assert(rp&&rp.kind==='review'&&rp.question===newQ.id&&rp.mode===mode);
    assert.deepEqual(rp.identity,runs[1].manifest.config.reviewer);
    assert(rp.text.includes(runs[1].manifest.records['config/reviewInstructions'].versions.at(-1).text));
    assert.equal(rp.judgmentVersion,jd.new.version.id);
    assert.equal(rp.judgmentPromptId,prompt.id);
    assert(rp.text.includes(prompt.text)&&rp.text.includes(jd.new.text));
    const parsed={old:scores(jd.old.text,oldMap,`${oldQ.label} ${mode} old`),new:scores(jd.new.text,prompt.mapping,`${oldQ.label} ${mode} new`)};
    for(const p of ['old','new']){
      const ss=jd[p].version.scores;
      if(ss) for(const letter of ['A','B']) if(ss[`total${letter}`]!=null&&ss[`total${letter}`]!==parsed[p].ab[letter].total)problems.push(`${oldQ.label} ${mode} ${p}: total estruturado diferente do parecer ${letter}`);
    }
    paired.comparisons[mode]={...parsed,delta:parsed.new.vc.total-parsed.old.vc.total,mapping:prompt.mapping,promptId:prompt.id,promptFile:prompt.file,promptHash:prompt.hash,promptSentDeclared:!!prompt.sentAt,reviewPromptFile:rp.file,reviewPromptId:rp.id,structured:jd.new.version.scores};
  }
  return paired;
});
const config={};
for(const slot of ['global','alternation','reviewInstructions']) {
  const a=runs[0].manifest.records[`config/${slot}`].versions.at(-1),b=runs[1].manifest.records[`config/${slot}`].versions.at(-1);
  config[slot]=a&&b?{byteEqual:sha(fs.readFileSync(path.join(roots[0],runs[0].manifest.records[`config/${slot}`].path)))===sha(fs.readFileSync(path.join(roots[1],runs[1].manifest.records[`config/${slot}`].path))),textEqual:normalized(a.text)===normalized(b.text),old:a,new:b}:{old:a??null,new:b??null};
}
const summary={};
for(const mode of ['agil','pleno']) {
  const rows=questions.map(q=>q.comparisons[mode]);
  const mean=p=>rows.map(r=>r[p].vc.total).filter(Number.isFinite).reduce((a,b)=>a+b,0)/rows.filter(r=>Number.isFinite(r[p].vc.total)).length;
  const outcomes=p=>Object.fromEntries(['vc','opponent','tie','inconclusive'].map(w=>[w,rows.filter(r=>r[p].winner===w).length]));
  summary[mode]={old:mean('old'),new:mean('new'),delta:rows.reduce((sum,r)=>sum+r.delta,0)/rows.length,denominator:rows.length,up:rows.filter(r=>r.delta>0).length,down:rows.filter(r=>r.delta<0).length,same:rows.filter(r=>r.delta===0).length,outcomes:{old:outcomes('old'),new:outcomes('new')}};
}
const audit={schemaVersion:1,benchmarkId:runs[0].manifest.benchmarkId,runs:runs.map(({root,manifest,backup,files})=>({root,id:manifest.id,revision:manifest.revision,backupRevision:backup.revision,config:manifest.config,fileCount:files.length,files,events:manifest.events,prompts:manifest.prompts.map(({text,...p})=>p)})),config,questions,summary,problems};
fs.writeFileSync(path.join(output,'auditoria.json'),JSON.stringify(audit,null,2)+'\n');
for(const run of runs)for(const file of run.files){
  const target=path.join(output,'fontes',run.manifest.config.runId,file.path);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(run.root,file.path),target);
  assert.equal(sha(fs.readFileSync(target)),file.sha256);
}
console.log(JSON.stringify({files:runs.map(r=>r.files.length),summary,problems},null,2));
