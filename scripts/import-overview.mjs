import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pairedSummary,parseJudge,mainPlot} from '../lib/overview-math.mjs';
const editorial=JSON.parse(fs.readFileSync('scripts/data/overview-2026-10-16-editorial.json','utf8'));
const id=editorial.id,root=process.argv[2]||'C:/Users/Rafae/Downloads/Benchmarks';
const catalog=JSON.parse(fs.readFileSync('content/reports.json','utf8'));
assert(!catalog.reports.some(r=>r.id===id),'Report already registered; do not overwrite silently');
const sha=b=>createHash('sha256').update(b).digest('hex');
function inventory(root,dir=''){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>{
    const file=path.posix.join(dir,e.name);if(e.isDirectory())return inventory(root,file);
    const b=fs.readFileSync(path.join(root,file));return [{path:file,bytes:b.length,sha256:sha(b)}];
  });
}
const auditRuns=[];
const publishedSources={};
const cases=[['chatgpt','ChatGPT','benchmark-comparativo-2026-10-14'],['claude','Claude','benchmark-comparativo-claude-2026-10-15']];
const benchmarks=cases.map(([key,alternative,comparisonId])=>{
  const comparison=JSON.parse(fs.readFileSync(`content/${comparisonId}.json`,'utf8'));
  const runs=comparison.runs.map((r,i)=>{
    const folder=`Benchmark_Manual_VC_x_${alternative}_${r.date}_${r.identifier}`;
    const dir=path.join(root,folder),bytes=fs.readFileSync(path.join(dir,'benchmark.json')),m=JSON.parse(bytes);
    assert.equal(m.benchmarkId,comparison.benchmarkId);assert.equal(m.id,r.id);assert.equal(sha(bytes),r.manifest.sha256);
    const files=inventory(dir),byPath=new Map(files.map(f=>[f.path,f]));
    for(const f of m.evidence){assert.equal(byPath.get(f.path)?.sha256,f.hash,f.path);assert.equal(byPath.get(f.path)?.bytes,f.bytes);}
    for(const record of Object.values(m.records))for(const v of record.versions){
      assert.equal(sha(fs.readFileSync(path.join(dir,v.file))),v.hash,v.file);assert.equal(fs.readFileSync(path.join(dir,v.file),'utf8'),v.text);
    }
    for(const p of m.prompts){assert.equal(sha(fs.readFileSync(path.join(dir,p.file))),p.hash);assert.equal(fs.readFileSync(path.join(dir,p.file),'utf8'),p.text);assert.equal(p.executionId,m.id);assert.equal(p.benchmarkId,m.benchmarkId);}
    auditRuns.push({benchmark:key,execution:m.id,folder,config:m.config,manifest:{path:'benchmark.json',sha256:sha(bytes)},fileCount:files.length,files,
      unusedPrompts:m.prompts.filter(p=>!Object.values(m.records).some(r=>r.versions.some(v=>v.promptId===p.id))).map(p=>({id:p.id,file:p.file,sentDeclared:!!p.sentAt,reason:'Nenhuma versão de julgamento ou revisão vinculada; texto não publicado nesta síntese.'}))});
    return {m,dir,folder,date:r.date,index:i};
  });
  assert.equal(runs[1].m.config.previous,runs[0].m.id);
  const get=(run,q,slot,hash)=>{
    const record=q?run.m.records[`${q.id}/${slot}`]:run.m.records[`config/${slot}`];assert(record);
    const version=hash?record.versions.find(v=>v.hash===hash):record.versions.at(-1);
    if(!version)return null;
    const current=fs.readFileSync(path.join(run.dir,record.path));
    assert.equal(sha(current),record.versions.at(-1).hash,record.path);
    return {record,version,sha256:version.hash,text:version.text};
  };
  const source=(row,p,slot,actual)=>{
    const doc=comparison.documents[row.sources[p][slot]];assert(doc,`${key}/${row.id}/${slot}`);
    assert.equal(doc.sha256,actual.sha256);assert.equal(doc.text,actual.text);
    assert.equal(sha(fs.readFileSync('public'+doc.path)),actual.sha256);
    publishedSources[`${key}/${row.sources[p][slot]}`]={benchmark:key,run:p,slot,path:doc.path,sha256:doc.sha256,bytes:doc.bytes,originalName:doc.originalName};
    return {path:doc.path,sha256:doc.sha256,record:actual.record.key,version:actual.version.id};
  };
  const rows=comparison.rows.map(row=>{
    const values={},sources={};
    for(const [i,p] of ['old','new'].entries()){
      const run=runs[i],q=run.m.questions.find(q=>q.label===row.question);
      assert(q&&q.ordinal===Number(row.question.slice(1)));
      const jd=get(run,q,`judgment:${row.mode}`),rv=get(run,q,`review:${row.mode}`);
      const prompt=run.m.prompts.find(p=>p.id===jd.version.promptId);
      const mapping=prompt?.mapping??(get(run,q,'mapping').text==='opponent'?{A:'opponent',B:row.mode}:{A:row.mode,B:'opponent'});
      assert.deepEqual(mapping,row.mapping);
      if(prompt){
        assert.equal(prompt.question,q.id);assert.equal(prompt.mode,row.mode);assert.equal(prompt.kind,'judgment');assert(prompt.sentAt);
        assert.deepEqual(jd.version.dependencies,prompt.dependencies);assert.deepEqual(jd.version.identity,prompt.identity);
      }else assert.equal(i,0,'A retest judgment must have a linked prompt');
      const slots=['question','reference','opponent',row.mode,'mapping',`judgment:${row.mode}`,`review:${row.mode}`];
      const actual=Object.fromEntries(slots.map(slot=>[slot,slot===`judgment:${row.mode}`?jd:slot===`review:${row.mode}`?rv:get(run,q,slot,prompt?.dependencies[`${q.id}/${slot}`])]));
      for(const slot of ['question','reference','opponent',row.mode])if(prompt)assert(prompt.text.includes(actual[slot].text));
      if(prompt){
        assert(prompt.text.includes(`RESPOSTA A:\r\n${actual[mapping.A].text}\r\n\r\nRESPOSTA B:\r\n${actual[mapping.B].text}`));
        const rp=run.m.prompts.find(p=>p.id===rv.version.promptId);assert(rp&&rp.judgmentVersion===jd.version.id&&rp.judgmentPromptId===prompt.id);
        assert(rp.text.includes(prompt.text)&&rp.text.includes(jd.text));assert.deepEqual(rv.version.identity,rp.identity);
        for(const [key,hash] of Object.entries(prompt.dependencies))if(hash!=='ausente')assert(run.m.records[key]?.versions.some(v=>v.hash===hash));
        for(const [fileKey,promptRecord] of [[row.prompt,prompt],[row.reviewPrompt,rp]]){
          const doc=comparison.documents[fileKey];assert.equal(doc.text,promptRecord.text);assert.equal(doc.sha256,promptRecord.hash);
          publishedSources[`${key}/${fileKey}`]={benchmark:key,run:p,slot:promptRecord.kind,path:doc.path,sha256:doc.sha256,bytes:doc.bytes,originalName:doc.originalName};
        }
      }
      const parsed=parseJudge(jd.text,mapping,row.mode);
      assert.deepEqual(parsed,row[p],`${key}/${row.id}/${p}: source and published totals differ`);
      for(const s of Object.values(parsed.ab)){assert(s.criteria.every(Number.isFinite)&&Number.isFinite(s.total));assert.equal(s.sum,s.total);}
      assert.equal(parsed.winner,parsed.vc.total===parsed.opponent.total?'tie':parsed.vc.total>parsed.opponent.total?'vc':'opponent');
      values[p]=parsed;
      sources[p]={questionIdentity:q.id,execution:run.m.id,mapping,promptId:prompt?.id??null,reviewPromptId:rv.version.promptId??null,
        documents:Object.fromEntries(slots.map(slot=>[slot,source(row,p,slot,actual[slot])]))};
    }
    for(const slot of ['question','reference','opponent','mapping'])assert.equal(sources.old.documents[slot].sha256,sources.new.documents[slot].sha256);
    const oldQ=runs[0].m.questions.find(q=>q.label===row.question),newQ=runs[1].m.questions.find(q=>q.label===row.question);
    for(const slot of ['facts','referencePrompt'])assert.equal(get(runs[0],oldQ,slot)?.text??'',get(runs[1],newQ,slot)?.text??'');
    const reuse=get(runs[1],newQ,'opponent').record.versions.filter(v=>v.reused);
    assert(reuse.length);
    for(const v of reuse){assert.equal(v.reused.run,runs[0].m.id);assert.equal(v.reused.record,`${oldQ.id}/opponent`);assert.equal(runs[0].m.records[v.reused.record].versions.find(o=>o.id===v.reused.version)?.hash,v.hash);}
    return {id:row.id,question:row.question,mode:row.mode,...values,delta:values.new.vc.total-values.old.vc.total,
      contribution:(values.new.vc.total-values.old.vc.total)/5,opponentDelta:values.new.opponent.total-values.old.opponent.total,
      change:row.change,shortChange:row.shortChange??row.change,review:row.review,sources,provenance:row.provenance};
  });
  for(const slot of ['global','alternation']){
    const a=get(runs[0],null,slot),b=get(runs[1],null,slot);assert.equal(a.sha256,b.sha256);
  }
  // Index the protocol texts as well, reusing the exact published original URLs.
  for(const [docKey,doc] of Object.entries(comparison.documents))if(!publishedSources[`${key}/${docKey}`]){
    assert.equal(sha(fs.readFileSync('public'+doc.path)),doc.sha256);
    publishedSources[`${key}/${docKey}`]={benchmark:key,run:docKey.startsWith('run01')?'old':'new',slot:'protocol',path:doc.path,sha256:doc.sha256,bytes:doc.bytes,originalName:doc.originalName};
  }
  const summaries=Object.fromEntries(['agil','pleno'].map(mode=>[mode,pairedSummary(rows.filter(r=>r.mode===mode))]));
  for(const mode of ['agil','pleno']){assert.equal(summaries[mode].denominator,5);for(const k of ['old','new','delta','up','down','same'])assert.equal(summaries[mode][k],comparison.summary[mode][k]);}
  const definitions=[['vc-agil','VadeChat Ágil','agil','vc','#17645b','circle',''],['vc-pleno','VadeChat Pleno','pleno','vc','#235ca0','square',''],['op-agil',`${alternative} gratuito contra Ágil`,'agil','opponent','#7852a1','diamond','8 5'],['op-pleno',`${alternative} gratuito contra Pleno`,'pleno','opponent','#9a6112','triangle','3 5']];
  const series=definitions.map(([id,label,mode,participant,color,marker,dash])=>{
    const s=pairedSummary(rows.filter(r=>r.mode===mode),participant);return {id,label,mode,participant,color,marker,dash,values:[s.old,s.new],delta:s.delta,denominator:s.denominator};
  });
  const contributions=Object.fromEntries(['agil','pleno'].map(mode=>[mode,rows.filter(r=>r.mode===mode).map(r=>({question:r.question,delta:r.delta,contribution:r.contribution}))]));
  return {key,label:`VadeChat × ${alternative}`,alternative:`${alternative} gratuito`,comparisonId,benchmarkId:comparison.benchmarkId,
    dates:runs.map(r=>r.date),runs:runs.map(r=>({id:r.m.id,config:r.m.config})),...editorial.benchmarks[key],summaries,series,plot:mainPlot(series),rows,contributions,
    changedOpponent:rows.filter(r=>r.opponentDelta!==0).length,sourceComparisonHash:sha(fs.readFileSync(`content/${comparisonId}.json`))};
});
assert.notEqual(benchmarks[0].benchmarkId,benchmarks[1].benchmarkId);
for(let i=0;i<5;i++)assert.notEqual(benchmarks[0].rows[i*2].sources.old.documents.question.sha256,benchmarks[1].rows[i*2].sources.old.documents.question.sha256);
const pngs=['1f02ae98-20c8-4a58-b119-aab4ff4a94cc','472c297d-8ae6-4359-8ec4-8be629d6e942','0626ffbf-530a-4294-bb4c-dcd821ed78fb','1f3ffbed-d944-48ad-9662-1a18ce22beb9','7d83df2c-a636-48a0-97aa-dfbc64d2e99e','3f5de951-96ba-4958-aa4f-ea354ac7f967'];
const originals=JSON.parse(fs.readFileSync('content/originals.sha256.json','utf8'));
const images=pngs.map((suffix,i)=>{
  const source=`C:/Users/Rafae/AppData/Local/Temp/codex-clipboard-${suffix}.png`,hash=sha(fs.readFileSync(source));
  const historical=originals.find(o=>o.sha256===hash);
  const target=historical?.path??`/originals/2026-10-16/captura-${String(i+1).padStart(2,'0')}.png`;
  const result=spawnSync(process.execPath,['scripts/register-original.mjs',source,target],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  return {id:`ALIA16-EV-0${i+1}`,number:i+1,caption:editorial.imageCaptions[i],...JSON.parse(result.stdout)};
});
const data={id,date:editorial.date,title:editorial.title,lead:editorial.lead,period:editorial.period,caveat:editorial.caveat,method:editorial.method,benchmarks,images,improvements:editorial.improvements,
  formula:'Média = soma das notas válidas / quantidade utilizada. Variação = média do Run 02 − média do Run 01, nas mesmas perguntas. Contribuição por pergunta = diferença da nota / 5.',
  figureNote:'Segmentos retos ligam apenas Run 01 e Run 02 da mesma série. Não há interpolação temporal, tendência estimada ou comparação direta entre os conjuntos.',
  auditPath:`/reports/${id}-fontes.json`,dataPath:`/reports/${id}-dados.json`};
fs.writeFileSync(`content/${id}.json`,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(`public/reports/${id}-dados.json`,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(`public/reports/${id}-fontes.json`,JSON.stringify({id,derivation:'Índice gerado para esta síntese; não é manifesto original nem comprovação independente de envio.',sourceRoot:'Downloads/Benchmarks (somente as quatro pastas com execução identificada)',runs:auditRuns,documents:publishedSources,images,bindings:benchmarks.map(b=>({benchmark:b.key,comparisonId:b.comparisonId,sourceComparisonHash:b.sourceComparisonHash,rows:b.rows.map(r=>({question:r.question,mode:r.mode,sources:r.sources,provenance:r.provenance}))})),limitations:editorial.method},null,2)+'\n');
const fmt=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
const delta=n=>(n>0?'+':'')+fmt(n);
let md=`# ${data.title}\n\n${data.date}\n\n${data.lead}\n\n${data.period}\n\n${data.caveat}\n\n## Médias das quatro séries por benchmark\n\n| Benchmark | Série | Run 01 | Run 02 | Variação | Denominador em cada execução |\n|---|---|---:|---:|---:|---:|\n`;
const summaryMd='## Resumo do VadeChat\n\n| Benchmark | Modo | Run 01 | Run 02 | Variação | Subiram / caíram / iguais | n por execução |\n|---|---|---:|---:|---:|---|---:|\n'+benchmarks.flatMap(b=>['agil','pleno'].map(mode=>{const s=b.summaries[mode];return `| ${b.label} | ${mode==='agil'?'Ágil':'Pleno'} | ${fmt(s.old)} | ${fmt(s.new)} | ${delta(s.delta)} | ${s.up} / ${s.down} / ${s.same} | ${s.denominator} |`;})).join('\n')+'\n\n';
md=md.replace('## Médias das quatro séries por benchmark',summaryMd+'## Médias das quatro séries por benchmark');
for(const b of benchmarks){for(const s of b.series)md+=`| ${b.label} | ${s.label} | ${fmt(s.values[0])} | ${fmt(s.values[1])} | ${delta(s.delta)} | ${s.denominator} |\n`;}
md+=`\n${data.figureNote}\n\n${data.formula}\n`;
for(const b of benchmarks){
  md+=`\n## ${b.label}\n\nExecuções: ${b.dates.join(' e ')}. Juiz: ${b.judge}. Adversário: ${b.opponent}. Revisor: ${b.reviewer}.\n\n${b.concentration}\n\n${b.changedOpponent}/10 embates mudaram a nota da resposta adversária idêntica.\n\n| Questão | Modo | VC Run 01 | VC Run 02 | Diferença | Contribuição à média | Adversário Run 01 → Run 02 |\n|---|---|---:|---:|---:|---:|---|\n`;
  for(const r of b.rows)md+=`| ${r.question} | ${r.mode==='agil'?'Ágil':'Pleno'} | ${fmt(r.old.vc.total)} | ${fmt(r.new.vc.total)} | ${delta(r.delta)} | ${delta(r.contribution)} | ${fmt(r.old.opponent.total)} → ${fmt(r.new.opponent.total)} |\n`;
  md+=`\nRevisões — síntese editorial: ${b.review}\n\n[Comparativo completo e evidências](https://relalia.github.io/relatorios/${b.comparisonId}/)\n`;
}
md+='\n## Melhorias de interface\n';
for(const item of data.improvements){md+=`\n### ${item.id} · ${item.title}\n\n${item.status}\n\n**Imagem:** ${item.description}\n\n**Relato:** ${item.reported}\n\n**Utilidade:** ${item.benefit}\n\n**Limites:** ${item.limit}\n\n`;for(const eid of item.evidenceIds){const img=images.find(i=>i.id===eid);md+=`[${eid} — captura original](https://relalia.github.io${img.path}) · SHA-256: ${img.sha256}\n\n`;}for(const c of item.comparisons)md+=`[${c.label}](https://relalia.github.io/relatorios/${c.reportId}/#${c.findingId})\n\n`;}
md+='\n## Método e limitações\n\n'+data.method.map(s=>'- '+s).join('\n\n')+`\n\n[Página e gráficos](https://relalia.github.io/relatorios/${id}/) · [PDF](https://relalia.github.io/reports/${id}.pdf) · [Dados](https://relalia.github.io${data.dataPath}) · [Índice gerado](https://relalia.github.io${data.auditPath})\n`;
fs.writeFileSync(`public/reports/${id}.md`,md);
catalog.reports.push({id,date:data.date,title:data.title,module:'Alia',overviewId:id,status:'Síntese e acompanhamento',count:'2 benchmarks · 6 capturas',summary:data.lead,highlights:[...benchmarks.flatMap(b=>['agil','pleno'].map(m=>`${b.label} · ${m==='agil'?'Ágil':'Pleno'}: ${fmt(b.summaries[m].old)} → ${fmt(b.summaries[m].new)} (${delta(b.summaries[m].delta)}).`))],note:data.caveat,
  files:[{label:'Síntese visual · PDF',path:`/reports/${id}.pdf`,kind:'pdf',origin:'generated'}],
  findings:data.improvements.map(({reported,benefit,limit,...item})=>({...item,observationLabel:'Capturas da interface',sourceFields:[{label:'Relato do usuário',value:reported},{label:'Utilidade esperada',value:benefit},{label:'Limites e escopo histórico',value:limit}]}))});
for(const image of images){const item=data.improvements.find(f=>f.evidenceIds.includes(image.id));catalog.evidence.push({id:image.id,reportId:id,findingIds:[item.id],description:`Captura ${image.number} · ${image.caption}`,kind:'image',path:image.path,originalName:image.originalName,sha256:image.sha256});}
fs.writeFileSync('content/reports.json',JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({id,sources: Object.keys(publishedSources).length,filesAudited:auditRuns.map(r=>r.fileCount),benchmarks:benchmarks.map(b=>({key:b.key,means:b.series.map(s=>({label:s.label,values:s.values,delta:s.delta})),changedOpponent:b.changedOpponent}))},null,2));
