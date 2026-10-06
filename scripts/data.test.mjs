import {test} from 'node:test';
import assert from 'node:assert/strict';
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
test('duplicate findings and evidence IDs rejected',()=>{
  const duplicate=structuredClone(data);duplicate.reports[0].findings.push(duplicate.reports[0].findings[0]);assert.throws(()=>validateData(duplicate),/Duplicate finding/);
  const ev=structuredClone(data);ev.evidence.push(ev.evidence[0]);assert.throws(()=>validateData(ev),/Duplicate\/invalid evidence/);
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
