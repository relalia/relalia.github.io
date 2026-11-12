import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import data from '../content/reports.json' with {type:'json'};
import manifest from '../content/originals.sha256.json' with {type:'json'};
import {validateData,verifyOriginals} from './validate-data.mjs';
test('catalog and original attachments have valid links and bytes',()=>{validateData(data);assert.equal(verifyOriginals('public',data),manifest.length);});
test('additional rounds accepted without fixed count or initial/retest logic',()=>{
  const next=structuredClone(data);
  next.reports.push({...structuredClone(data.reports.at(-1)),id:'future-round',date:'2026-10-07',findings:[{id:'NEW-001',title:'Novo registro',description:'Observação',status:'Aguardando reteste',evidenceIds:[],retest:{execution:'not-performed'},comparisons:[{reportId:'vadechat-2026-10-06',findingId:'VC-UX-05',label:'Comparar'}]}]});
  assert.doesNotThrow(()=>validateData(next));
});
test('duplicate report IDs and missing comparison targets rejected',()=>{
  const duplicate=structuredClone(data);duplicate.reports.push(duplicate.reports[0]);assert.throws(()=>validateData(duplicate),/Duplicate report/);
  const missing=structuredClone(data);missing.reports[0].findings[0].comparisons[0].findingId='ABSENT';assert.throws(()=>validateData(missing),/Missing comparison/);
});
test('standalone HTML attachments must be generated inside reports',()=>{
  const copy=structuredClone(data);
  const file=copy.reports.find(report=>report.id==='estrutura-vadechat-2026-11-12').files[0];
  assert.doesNotThrow(()=>validateData(copy));
  file.origin='original';
  assert.throws(()=>validateData(copy),/HTML attachment must be generated/);
  file.origin='generated';file.path='/originals/report.html';
  assert.throws(()=>validateData(copy),/Generated document must stay in/);
  file.path='/reports/%2e%2e/originals/report.html';
  assert.throws(()=>validateData(copy),/Missing\/invalid attachment/);
  file.path='/reports//report.html';
  assert.throws(()=>validateData(copy),/Missing\/invalid attachment/);
});
test('standalone structure report embeds both current prototypes and the original video',()=>{
  const report=fs.readFileSync('public/reports/estrutura-vadechat-2026-11-12.html','utf8');
  const copy=report.match(/<script type="application\/octet-stream" id="prototype-data">([A-Za-z0-9+/=]+)<\/script>/)?.[1];
  const giro=report.match(/<script type="application\/octet-stream" id="giro-data">([A-Za-z0-9+/=]+)<\/script>/)?.[1];
  const video=report.match(/src="data:video\/mp4;base64,([A-Za-z0-9+/=]+)"/)?.[1];
  assert(copy && giro && video);
  assert.deepEqual(Buffer.from(copy,'base64'),fs.readFileSync('public/reports/prototipo-vadechat-estrutura-2026-11-12.html'));
  assert.deepEqual(Buffer.from(giro,'base64'),fs.readFileSync('public/reports/prototipo-giro-estrutura-2026-11-12.html'));
  assert.equal(createHash('sha256').update(Buffer.from(video,'base64')).digest('hex'),'818c7d7115918fda8b7d6798d5a3a1b0561b9928cdb514d9a21f342d7221fcf1');
});
test('standalone documents do not depend on external styles, scripts, images or media',()=>{
  for(const file of [
    'public/reports/estrutura-vadechat-2026-11-12.html',
    'public/reports/prototipo-vadechat-estrutura-2026-11-12.html',
    'public/reports/prototipo-giro-estrutura-2026-11-12.html',
  ]) {
    const html=fs.readFileSync(file,'utf8');
    let inspected=0, styles=0;
    for(const [,,attributes] of html.matchAll(/<(img|video|audio|source|iframe|script|link)\b([^>]*)>/gi)) {
      inspected++;
      for(const [,name,value] of attributes.matchAll(/\b(src|srcset|poster|href)\s*=\s*["']([^"']*)["']/gi)) {
        assert(value.startsWith('data:'),`${file} has external ${name}: ${value.slice(0,100)}`);
      }
    }
    for(const [,style] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      styles++;
      for(const [,target] of style.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
        assert(target.startsWith('data:') || target.startsWith('#'),`${file} has external CSS resource: ${target}`);
      }
    }
    assert(inspected>0 && styles>0,`${file} did not expose the expected embedded resources`);
    for(const [,attributes,source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if(!/type="application\/octet-stream"/i.test(attributes)) {
        assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/.test(source),`${file} contains a network API`);
      }
    }
  }
});
test('embedded HTML byte equality is preserved across Git checkouts',()=>{
  const attributes=fs.readFileSync('.gitattributes','utf8').split(/\r?\n/);
  const git=spawnSync('git',['rev-parse','--is-inside-work-tree'],{encoding:'utf8'});
  for(const file of [
    'public/reports/estrutura-vadechat-2026-11-12.html',
    'public/reports/prototipo-vadechat-estrutura-2026-11-12.html',
    'public/reports/prototipo-giro-estrutura-2026-11-12.html',
  ]) {
    assert(attributes.includes(`${file} -text`),`Missing byte-preserving rule for ${file}`);
    if(git.status===0 && git.stdout.trim()==='true') {
      assert.match(execFileSync('git',['check-attr','text','--',file],{encoding:'utf8'}),/: text: unset\s*$/);
    }
  }
});
test('prototype synchronization updates both copies and preserves the report on invalid input',()=>{
  const tmpRoot=path.resolve('tmp');fs.mkdirSync(tmpRoot,{recursive:true});
  const fixture=fs.mkdtempSync(path.join(tmpRoot,'sync-prototype-'));
  const reports=path.join(fixture,'public','reports');fs.mkdirSync(reports,{recursive:true});
  const target=path.join(reports,'estrutura-vadechat-2026-11-12.html');
  const script=path.resolve('scripts/sync-estrutura-prototipo.mjs');
  try {
    fs.writeFileSync(target,'<script type="application/octet-stream" id="prototype-data">b2xk</script><script type="application/octet-stream" id="giro-data">b2xk</script>');
    if(process.platform!=='win32') fs.chmodSync(target,0o644);
    fs.writeFileSync(path.join(reports,'prototipo-vadechat-estrutura-2026-11-12.html'),'Chat atualizado');
    fs.writeFileSync(path.join(reports,'prototipo-giro-estrutura-2026-11-12.html'),'GIRO atualizado');
    const previousMask=process.platform!=='win32' ? process.umask(0o077) : null;
    try { execFileSync(process.execPath,[script],{cwd:fixture}); }
    finally { if(previousMask!==null) process.umask(previousMask); }
    const updated=fs.readFileSync(target,'utf8');
    if(process.platform!=='win32') assert.equal(fs.statSync(target).mode & 0o777,0o644);
    assert(updated.includes(Buffer.from('Chat atualizado').toString('base64')));
    assert(updated.includes(Buffer.from('GIRO atualizado').toString('base64')));
    execFileSync(process.execPath,[script],{cwd:fixture});
    assert.equal(fs.readFileSync(target,'utf8'),updated);
    fs.writeFileSync(path.join(reports,'prototipo-giro-estrutura-2026-11-12.html'),'');
    assert.throws(()=>execFileSync(process.execPath,[script],{cwd:fixture,stdio:'pipe'}));
    assert.equal(fs.readFileSync(target,'utf8'),updated);
    const invalid=updated.replace('id="giro-data"','id="outro"');
    fs.writeFileSync(target,invalid);
    assert.throws(()=>execFileSync(process.execPath,[script],{cwd:fixture,stdio:'pipe'}));
    assert.equal(fs.readFileSync(target,'utf8'),invalid);
    assert(!fs.readdirSync(reports).some(name=>name.endsWith('.tmp')));
  } finally {
    assert(path.resolve(fixture).startsWith(tmpRoot+path.sep));
    fs.rmSync(fixture,{recursive:true,force:true});
  }
});
test('Chat dialog traps keyboard focus without selecting disabled or hidden controls',()=>{
  const html=fs.readFileSync('public/reports/prototipo-vadechat-estrutura-2026-11-12.html','utf8');
  const start=html.indexOf('document.addEventListener("keydown", function(e) {');
  const end=html.indexOf('    // Botão "Ir para o fim da conversa"',start);
  assert(start>=0 && end>start,'Missing Chat keyboard controller');
  let handler,closedModal=0,closedSidebar=0;
  const doc={activeElement:null,addEventListener:(type,fn)=>{if(type==='keydown')handler=fn;}};
  function control(disabled=false,tabIndex=0,hidden=false) {
    return {disabled,tabIndex,closest:()=>hidden?{}:null,getClientRects:()=>[{}],focus(){doc.activeElement=this;}};
  }
  const disabled=control(true),first=control(),hidden=control(false,0,true),last=control();
  const controls=[disabled,first,hidden,last];
  const modal={hidden:false,querySelectorAll:()=>controls,contains:el=>controls.includes(el)};
  const sidebar={classList:{contains:()=>false}};
  vm.runInNewContext(html.slice(start,end),{
    document:doc,modal,sidebar,
    hideModal:()=>{closedModal++;modal.hidden=true;},
    closeSidebar:()=>{closedSidebar++;},
    getComputedStyle:()=>({visibility:'visible'}),
  });
  assert.equal(typeof handler,'function');
  function key(shiftKey=false) {let prevented=false;handler({key:'Tab',shiftKey,preventDefault:()=>{prevented=true;}});assert(prevented);}
  doc.activeElement={};key();assert.equal(doc.activeElement,first);
  doc.activeElement=first;key(true);assert.equal(doc.activeElement,last);
  doc.activeElement=last;key();assert.equal(doc.activeElement,first);
  handler({key:'Escape'});assert.equal(closedModal,1);assert.equal(closedSidebar,0);
  handler({key:'Escape'});assert.equal(closedSidebar,1);
});
test('duplicate findings and evidence IDs rejected',()=>{
  const duplicate=structuredClone(data);duplicate.reports[0].findings.push(duplicate.reports[0].findings[0]);assert.throws(()=>validateData(duplicate),/Duplicate finding/);
  const ev=structuredClone(data);ev.evidence.push(ev.evidence[0]);assert.throws(()=>validateData(ev),/Duplicate\/invalid evidence/);
});
test('executive reports reject wrong totals, reordered criteria and broken sources',()=>{
  const next=structuredClone(data);
  const report=next.reports.find(report=>report.executive);
  const mode=report.executive.modes[0];
  mode.wins++;
  assert.throws(()=>validateData(next),/Invalid benchmark coverage or outcomes/);
  mode.wins--;
  mode.criteria.reverse();
  assert.throws(()=>validateData(next),/Mismatched benchmark criteria/);
  mode.criteria.reverse();
  report.executive.source.conclusionsPage=report.executive.source.pages+1;
  assert.throws(()=>validateData(next),/Invalid benchmark source pages/);
  const summary=next.reports.find(report=>report.benchmarkSources);
  summary.benchmarkSources.pop();
  report.executive.source.conclusionsPage=report.executive.source.pages;
  assert.throws(()=>validateData(next),/Expected three benchmark sources/);
});
test('original Atlas images and description-only EV-27 preserved',()=>{
  const atlas=data.evidence.filter(e=>e.reportId==='atlas');assert.equal(atlas.filter(e=>e.kind==='image').length,43);assert.equal(atlas.find(e=>e.id==='EV-27').path,null);
  assert.equal(data.reports.find(r=>r.id==='today').findings.length,4);
  assert.deepEqual(data.reports.find(r=>r.id==='today').findings.find(f=>f.id==='VC-CHAT-03').evidenceIds,['VC-EV-01']);
  const newRound=data.reports.find(r=>r.id==='vadechat-2026-10-06');assert.equal(newRound.findings.length,8);assert.equal(newRound.findings.filter(f=>f.status==='Proposta de melhoria').length,5);
});
test('performed retest can retain persistent failures and probable cause remains hypothesis',()=>{
  const retest=data.reports.find(r=>r.id==='retest').findings[0];assert.equal(retest.retest.execution,'performed');assert.equal(retest.retest.result,'Persistência');
  const ac22=data.reports.find(r=>r.id==='atlas').findings.find(f=>f.id==='AC-022');assert.match(ac22.hypothesis,/causa provável/);assert.match(ac22.originalRecord.descricao,/Causa provável/);
});
