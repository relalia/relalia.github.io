import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import manifest from '../content/originals.sha256.json' with {type:'json'};

const assert = (condition,message) => {if (!condition) throw Error(message);};
const text = value => typeof value === 'string' && value.trim().length > 0;
const assetPath = value => text(value) && value.startsWith('/') && !value.includes('..') && !/[?#\\]/.test(value);
const natural = value => Number.isSafeInteger(value) && value >= 0;
const score = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;

function validateExecutive(report) {
  const {scaleMax, questions, modes, source} = report.executive;
  assert(scaleMax===10 && natural(questions) && questions>0,`Invalid benchmark scale or question count ${report.id}`);
  assert(Array.isArray(modes) && modes.length===2 && ['agil','pleno'].every(key=>modes.some(mode=>mode.key===key)),`Invalid benchmark modes ${report.id}`);
  assert(source && report.files.some(file=>file.origin==='original' && file.kind==='pdf' && file.path===source.path && file.sha256===source.sha256),`Invalid benchmark PDF source ${report.id}`);
  assert(natural(source.pages) && [source.qualityPage ?? 2,source.conclusionsPage ?? 3].every(page=>natural(page) && page>=1 && page<=source.pages),`Invalid benchmark source pages ${report.id}`);

  for(const mode of modes) {
    const label=`${report.id}/${mode.key}`;
    assert([mode.wins,mode.ties,mode.losses,mode.n,mode.coverageTotal].every(natural) &&
      mode.wins+mode.ties+mode.losses===mode.n && mode.n>0 && mode.n<=mode.coverageTotal && mode.coverageTotal<=questions,`Invalid benchmark coverage or outcomes ${label}`);
    assert(score(mode.vcMean,scaleMax) && score(mode.opponentMean,scaleMax),`Invalid benchmark mean ${label}`);
    assert([mode.reviewsCompleted,mode.reviewsTotal,mode.pendingReviews,mode.contests,mode.pendingDecisions].every(natural) &&
      mode.reviewsCompleted+mode.pendingReviews===mode.reviewsTotal && mode.contests<=mode.reviewsCompleted && mode.pendingDecisions<=mode.contests,`Invalid benchmark review counts ${label}`);
    assert(Array.isArray(mode.criteria) && mode.criteria.length>0 && mode.criteria.every(criterion=>
      text(criterion.code) && text(criterion.label) && natural(criterion.max) && criterion.max>0 && natural(criterion.n) && criterion.n>0 && criterion.n<=mode.n &&
      score(criterion.vc,criterion.max) && score(criterion.opponent,criterion.max)),`Invalid benchmark criteria ${label}`);
    assert(new Set(mode.criteria.map(criterion=>criterion.code)).size===mode.criteria.length &&
      mode.criteria.reduce((total,criterion)=>total+criterion.max,0)===scaleMax,`Invalid benchmark criterion scale ${label}`);
  }
  const criteriaSignature=mode=>mode.criteria.map(({code,label,max})=>JSON.stringify([code,label,max])).join('|');
  assert(criteriaSignature(modes[0])===criteriaSignature(modes[1]),`Mismatched benchmark criteria ${report.id}`);
}

function validateLatency(report) {
  const { vadechat, opponent, scaleSeconds, questions } = report.latency;
  assert(!['executive', 'benchmarkSources', 'overviewId', 'comparisonId', 'benchmarkId'].some(key => report[key]), `Conflicting latency layout ${report.id}`);
  assert([vadechat, opponent].every(participant => participant && text(participant.label) &&
    natural(participant.meanMs) && natural(participant.totalMs)), `Invalid latency participants ${report.id}`);
  assert(text(opponent.model) && natural(scaleSeconds) && scaleSeconds > 0 && scaleSeconds % 4 === 0, `Invalid latency model or scale ${report.id}`);
  assert(Array.isArray(questions) && questions.length > 0 && questions.every(question =>
    text(question.label) && [question.vadechatMs, question.opponentMs].every(ms => natural(ms) && ms <= scaleSeconds * 1000)), `Invalid latency questions ${report.id}`);
  assert(new Set(questions.map(question => question.label)).size === questions.length, `Duplicate latency questions ${report.id}`);
  assert(report.files.some(file => file.kind === 'pdf' && file.origin === 'original'), `Missing latency source ${report.id}`);
}

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
    assert(['Atlas','VadeChat','Base de Conhecimento','Alia'].includes(report.module),`Invalid module ${report.id}`);
    assert(Array.isArray(report.highlights) && report.highlights.every(text),`Invalid highlights ${report.id}`);
    assert(Array.isArray(report.findings) && Array.isArray(report.files) && (report.benchmarkSources || report.files.some(f=>f.kind==='pdf')),`Missing findings/PDF ${report.id}`);
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
    if(report.executive) validateExecutive(report);
    if(report.latency) validateLatency(report);
  }
  for(const report of data.reports.filter(report=>report.benchmarkSources)) {
    const sources=report.benchmarkSources;
    assert(Array.isArray(sources) && sources.length===3,`Expected three benchmark sources ${report.id}`);
    assert(new Set(sources.map(source=>source.reportId)).size===sources.length,`Duplicate benchmark source ${report.id}`);
    for(const source of sources) {
      const benchmark=reports.get(source.reportId);
      assert(text(source.label) && source.reportId!==report.id && benchmark?.executive && benchmark.date<=report.date,`Invalid benchmark source ${report.id}/${source.reportId}`);
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
  const checksums=fs.readFileSync(path.join(directory,'originals','SHA256SUMS.txt'),'utf8').replaceAll('\r\n','\n');
  const expected=manifest.map(item=>`${item.sha256}  ${item.path.slice('/originals/'.length)}`).join('\n')+'\n';
  assert(checksums===expected,'Published SHA-256 list differs from the catalog manifest');
  return manifest.length;
}
