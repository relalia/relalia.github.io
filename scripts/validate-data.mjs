import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import manifest from '../content/originals.sha256.json' with {type:'json'};

const assert = (condition,message) => {if (!condition) throw Error(message);};
const text = value => typeof value === 'string' && value.trim().length > 0;
const assetPath = value => text(value) && value.startsWith('/') && !value.includes('..') && !/[?#\\]/.test(value);
export function validateData(data,assetExists=()=>true) {
  assert(Array.isArray(data.reports) && data.reports.length>0,'Catalog needs reports');
  assert(Array.isArray(data.evidence),'Catalog needs evidence');
  const reports = new Map();
  for(const report of data.reports) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(report.id),'Invalid report ID');
    assert(!reports.has(report.id),`Duplicate report ${report.id}`);
    reports.set(report.id,report);
    for(const key of ['title','summary','status','count']) assert(text(report[key]),`Missing ${report.id}.${key}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(report.date) && !isNaN(Date.parse(report.date)),`Invalid date ${report.id}`);
    assert(['Atlas','VadeChat','Base de Conhecimento'].includes(report.module),`Invalid module ${report.id}`);
    assert(Array.isArray(report.highlights) && report.highlights.every(text),`Invalid highlights ${report.id}`);
    assert(Array.isArray(report.findings) && Array.isArray(report.files) && report.files.some(f=>f.kind==='pdf'),`Missing findings/PDF ${report.id}`);
    const ids=new Set();
    for(const finding of report.findings) {
      assert(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(finding.id),`Invalid finding ID ${finding.id}`);
      assert(!ids.has(finding.id),`Duplicate finding ${report.id}/${finding.id}`); ids.add(finding.id);
      for(const key of ['title','description','status']) assert(text(finding[key]),`Missing ${report.id}/${finding.id}.${key}`);
      assert(Array.isArray(finding.evidenceIds),`Invalid evidence links ${finding.id}`);
      assert(['not-performed','performed','not-applicable'].includes(finding.retest?.execution),`Invalid retest ${finding.id}`);
      if(finding.retest.execution==='performed') assert(text(finding.retest.result),`Retest needs result ${finding.id}`);
    }
    const filePaths=new Set();
    for(const file of report.files) {
      assert(text(file.label) && ['pdf','xlsx'].includes(file.kind) && ['original','generated'].includes(file.origin),`Invalid attachment ${report.id}`);
      assert(assetPath(file.path) && assetExists(file.path),`Missing/invalid attachment ${file.path}`);
      assert(!filePaths.has(file.path),`Duplicate attachment ${file.path}`); filePaths.add(file.path);
      assert(file.path.endsWith(`.${file.kind}`),`Attachment type mismatch ${file.path}`);
      if(file.origin==='generated') assert(file.path.startsWith('/reports/') && file.kind==='pdf',`Generated PDF must stay in /reports/: ${file.path}`);
      if(file.origin==='original') assert(/^[a-f0-9]{64}$/.test(file.sha256) && text(file.originalName),`Original needs SHA-256 and name ${file.path}`);
    }
  }
  const evidence = new Map();
  for(const item of data.evidence) {
    assert(text(item.id) && !evidence.has(item.id),`Duplicate/invalid evidence ${item.id}`);evidence.set(item.id,item);
    assert(reports.has(item.reportId) && text(item.description) && Array.isArray(item.findingIds),`Invalid evidence ${item.id}`);
    for(const id of item.findingIds) assert(reports.get(item.reportId).findings.some(f=>f.id===id),`Missing evidence finding ${item.reportId}/${id}`);
    assert(['image','video','description'].includes(item.kind),`Invalid evidence type ${item.id}`);
    if(item.kind==='description') assert(item.path===null,`Description evidence has file ${item.id}`);
    else assert(assetPath(item.path) && assetExists(item.path) && text(item.originalName) && /^[a-f0-9]{64}$/.test(item.sha256),`Missing/invalid evidence file ${item.id}`);
  }
  for(const report of data.reports) for(const finding of report.findings) {
    for(const id of finding.evidenceIds) assert(evidence.get(id)?.reportId===report.id,`Missing evidence ${id} for ${report.id}`);
    for(const id of finding.relatedIds || []) assert(report.findings.some(f=>f.id===id),`Missing linked finding ${report.id}/${id}`);
    for(const comparison of finding.comparisons || []) assert(text(comparison.label) && reports.get(comparison.reportId)?.findings.some(f=>f.id===comparison.findingId),`Missing comparison ${comparison.reportId}/${comparison.findingId}`);
  }
}

export function verifyOriginals(directory,data) {
  const entries=new Map();
  for(const item of manifest) {
    assert(!entries.has(item.path),`Duplicate manifest path ${item.path}`);entries.set(item.path,item);
    assert(assetPath(item.path),`Invalid manifest path ${item.path}`);
    const file=path.join(directory,item.path.slice(1));
    assert(fs.existsSync(file),`Original absent ${item.originalName}`);
    const bytes=fs.readFileSync(file);
    assert(bytes.length===item.bytes && createHash('sha256').update(bytes).digest('hex')===item.sha256,`SHA-256 mismatch ${item.path}`);
  }
  if(data) for(const file of [...data.reports.flatMap(r=>r.files.filter(f=>f.origin==='original')), ...data.evidence.filter(e=>e.path)]) {
    assert(entries.get(file.path)?.sha256===file.sha256,`Missing/mismatched manifest record ${file.path}`);
  }
  return manifest.length;
}
