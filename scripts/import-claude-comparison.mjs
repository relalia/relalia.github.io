// Import a verified comparison without modifying executor sources or historical reports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const prepared=process.argv[2]||'private/benchmark-comparativo-claude-2026-10-15';
const audit=JSON.parse(fs.readFileSync(path.join(prepared,'auditoria.json'),'utf8'));
const editorial=JSON.parse(fs.readFileSync('scripts/data/claude-comparison-editorial.json','utf8'));
const id='benchmark-comparativo-claude-2026-10-15';
const catalog=JSON.parse(fs.readFileSync('content/reports.json','utf8'));
assert(!catalog.reports.some(r=>r.id===id),'Report already exists; do not overwrite silently');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(audit.problems.length,0);
const documents={};
const imported=new Map();
function document(runIndex,relative) {
  const run=audit.runs[runIndex],key=`run0${runIndex+1}/${relative}`;
  if(imported.has(key))return imported.get(key);
  const source=path.join(run.root,relative),bytes=fs.readFileSync(source);
  assert.equal(sha(bytes),run.files.find(f=>f.path===relative).sha256,relative);
  const historical=`/originals/benchmark/benchmark-claude-2026-10-13/${relative}`;
  const target=runIndex===0&&fs.existsSync('public'+historical)?historical:`/originals/benchmark/${id}/run0${runIndex+1}/${relative}`;
  if(fs.existsSync('public'+target))assert.equal(sha(fs.readFileSync('public'+target)),sha(bytes),target);
  const result=spawnSync(process.execPath,['scripts/register-original.mjs',source,target],{encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  documents[key]={...JSON.parse(result.stdout),text:bytes.toString('utf8'),run:runIndex===0?'Run 01 · legado01':'Run 02',relative};
  imported.set(key,key);
  return key;
}
const rows=editorial.rows.map(e=>{
  const q=audit.questions.find(q=>q.label===e.question),c=q.comparisons[e.mode];
  const sources={};
  for(const [p,i] of [['old',0],['new',1]]) {
    sources[p]=Object.fromEntries(['question','reference','opponent',e.mode,'mapping',`judgment:${e.mode}`,`review:${e.mode}`].map(slot=>[slot,document(i,q.sources[slot][p].path)]));
  }
  const result={...e,id:`${e.question}-${e.mode.toUpperCase()}`,old:c.old,new:c.new,delta:c.delta,mapping:c.mapping,sources,
    prompt:document(1,c.promptFile),reviewPrompt:document(1,c.reviewPromptFile),promptId:c.promptId,reviewPromptId:c.reviewPromptId,promptSentDeclared:c.promptSentDeclared,
    structured:c.structured,identities:{oldQuestion:q.oldId,newQuestion:q.newId},integrity:q.integrity,provenance:q.provenance,
    bindings:Object.fromEntries(['old','new'].map(p=>[p,Object.fromEntries(Object.entries(q.sources).filter(([,v])=>v[p]).map(([slot,v])=>[slot,{recordKey:v[p].recordKey,versionId:v[p].version.id,sha256:v[p].version.hash,promptId:v[p].version.promptId??null}]))]))};
  for(const p of ['old','new'])for(const s of Object.values(result[p].ab))assert.equal(s.sum,s.total);
  return result;
});
const protocol={};
for(const [p,i] of [['old',0],['new',1]])protocol[p]={global:document(i,'Aval/global_prompt.txt'),alternation:document(i,'Aval/answer_alternation.txt'),...(i?{reviewInstructions:document(i,'Aval/review_prompt.txt')}:{})};
const summary=Object.fromEntries(['agil','pleno'].map(mode=>{
  const pairs=rows.filter(r=>r.mode===mode);
  const sum=p=>pairs.reduce((n,r)=>n+r[p].vc.total,0);
  const s={...audit.summary[mode],old:sum('old')/pairs.length,new:sum('new')/pairs.length,delta:(sum('new')-sum('old'))/pairs.length};
  assert.equal(s.old,mode==='agil'?7:7.8);assert.equal(s.new,mode==='agil'?7.5:8.4);
  return [mode,s];
}));
const concentration=Object.fromEntries(['agil','pleno'].map(m=>[m,rows.find(r=>r.question==='Q03'&&r.mode===m).delta/summary[m].denominator]));
const changedOpponent=rows.filter(r=>r.old.opponent.total!==r.new.opponent.total).length;
assert.equal(concentration.agil,.6);assert.equal(concentration.pleno,.8);assert.equal(changedOpponent,4);
const highlights=editorial.highlights;
const data={id,date:'2026-10-15',title:'Reteste VadeChat × Claude — Run 02 comparado à execução inicial',benchmarkId:audit.benchmarkId,
  alternativeLabel:'Claude gratuito',judgeLabel:'ChatGPT Grátis · modelo não identificado',reviewerLabel:'GPT 6.1 Sol Alto',runLabels:{old:'Run 01 · legado01 · 13/10/2026',new:'Run 02 · 15/10/2026'},
  runs:audit.runs.map(r=>({id:r.id,identifier:r.config.runId,date:r.config.date,config:r.config,manifest:{name:'benchmark.json',sha256:r.files.find(f=>f.path==='benchmark.json').sha256}})),
  summary,highlights,concentration,changedOpponent,editorial,rows,documents,protocol,
  related:[{id:'benchmark-claude-2026-10-13',label:'Execução inicial · VadeChat × Claude · 13/10/2026'}],
  caveat:editorial.caveat,conclusion:editorial.conclusion,
  pending:editorial.pending};
fs.writeFileSync(`content/${id}.json`,JSON.stringify(data,null,2)+'\n');
const publicAudit={id,title:data.title,derivation:'Índice e vínculos extraídos dos manifestos e pareceres. Documento gerado; não é um manifesto original nem prova independente de envio.',benchmarkId:data.benchmarkId,runs:data.runs,summary,highlights,
  inputInventory:audit.runs.map(r=>({execution:r.id,files:r.files,fileCount:r.fileCount})),configIntegrity:audit.config,
  rows:rows.map(({change,support,review,...r})=>r),documents:Object.fromEntries(Object.entries(documents).map(([k,{text,...doc}])=>[k,doc])),protocol,limitations:data.pending};
fs.mkdirSync('public/reports',{recursive:true});
fs.writeFileSync(`public/reports/${id}-auditoria.json`,JSON.stringify(publicAudit,null,2)+'\n');
const score=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const markdown=`# ${data.title}\n\nData do relatório e Run 02: 15/10/2026. Run 01 (legado01): 13/10/2026.\n\n${data.caveat}\n\n| Modo | Média anterior | Média nova | Variação | Subiram / caíram / iguais |\n|---|---:|---:|---:|---|\n${Object.entries(summary).map(([m,s])=>`| ${m==='agil'?'Ágil':'Pleno'} | ${score(s.old)} | ${score(s.new)} | ${s.delta>0?'+':''}${score(s.delta)} | ${s.up} / ${s.down} / ${s.same} |`).join('\n')}\n\n${highlights.map(s=>'- '+s).join('\n')}\n\n${editorial.denominatorNote}\n\n${editorial.outcomeNote}\n\n${editorial.roles}\n\n| Pergunta | Modo | Nota anterior do VC | Nota nova do VC | Variação | Mudança principal |\n|---|---|---:|---:|---:|---|\n${rows.map(r=>`| ${r.question} | ${r.mode==='agil'?'Ágil':'Pleno'} | ${score(r.old.vc.total)} | ${score(r.new.vc.total)} | ${r.delta>0?'+':''}${score(r.delta)} | ${r.change} |`).join('\n')}\n\n## Mudanças e revisões\n\n${rows.map(r=>`### ${r.question} · ${r.mode==='agil'?'Ágil':'Pleno'}\n\n${r.change}\n\nJustificativa do juiz (síntese editorial): ${r.support}\n\nRevisões antiga e nova (síntese editorial): ${r.review}\n\n[Textos integrais e fontes](https://relalia.github.io/relatorios/${id}/#${r.id})`).join('\n\n')}\n\n## Integridade e metodologia\n\n${data.editorial.integrity.map(s=>'- '+s).join('\n\n')}\n\n${editorial.formal}\n\n${editorial.oscillation}\n\n## Conclusão e limitações\n\n${data.conclusion}\n\n${data.pending}\n\n[Página e evidências](https://relalia.github.io/relatorios/${id}/) · [Índice de auditoria](https://relalia.github.io/reports/${id}-auditoria.json) · [PDF sucinto](https://relalia.github.io/reports/${id}.pdf)\n`;
fs.writeFileSync(`public/reports/${id}.md`,markdown);
catalog.reports.push({id,date:data.date,dateNote:'Run 02',title:data.title,module:'VadeChat',comparisonId:id,status:'Reteste comparativo',count:'5 perguntas · 10 pares de avaliações',summary:editorial.lead,highlights,note:data.caveat,
  files:[{label:'Comparativo sucinto · PDF',path:`/reports/${id}.pdf`,kind:'pdf',origin:'generated'}],
  findings:rows.map(r=>({id:r.id,title:`${r.question} · ${r.mode==='agil'?'Ágil':'Pleno'}`,description:r.change,kind:'Comparação de execuções',status:'Resultados originais preservados',evidenceIds:[],retest:{execution:'performed',result:`Notas originais do juiz: ${score(r.old.vc.total)} para ${score(r.new.vc.total)}. ${r.support}`},comparisons:[{reportId:'benchmark-claude-2026-10-13',findingId:r.question,label:'Ver julgamento da execução inicial'}]}))});
fs.writeFileSync('content/reports.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Imported ${Object.keys(documents).length} pertinent sources, 10 pairs and the catalog entry. Backups and drafts excluded.`);
