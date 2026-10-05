import fs from 'node:fs';
import path from 'node:path';
import data from '../content/reports.json' with { type: 'json' };

const root = path.resolve('out');
const exists = relative => fs.existsSync(path.join(root, relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(data.reports.length === 4, 'Expected four published reports');
assert(exists('index.html') && exists('.nojekyll'), 'Missing static root');
const findings = new Set(data.reports.flatMap(report => report.findings.map(finding => finding.id)));
const evidence = new Map(data.evidence.map(item => [item.id, item]));
assert(data.reports.find(report => report.id === 'atlas')?.findings.length === 51, 'Atlas findings count changed');
assert(data.evidence.filter(item => item.id.startsWith('EV-')).length === 44, 'Atlas evidence count changed');
for (const report of data.reports) {
  assert(exists(`relatorios/${report.id}/index.html`), `Missing static route: ${report.id}`);
  for (const file of report.files) assert(exists(file.path.slice(1)), `Missing attachment: ${file.path}`);
  for (const finding of report.findings) {
    for (const id of finding.evidenceIds) assert(evidence.has(id), `Missing evidence ${id}`);
    for (const id of finding.relatedIds || []) assert(findings.has(id), `Missing linked finding ${id}`);
  }
}
for (const item of data.evidence) {
  for (const id of item.findingIds) assert(findings.has(id), `Missing finding ${id}`);
  if (item.image) assert(exists(item.image.slice(1)), `Missing image ${item.image}`);
}
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const entryPath = path.join(directory, entry.name);
  return entry.isDirectory() ? files(entryPath) : [entryPath];
});
const exported = files(root);
assert(!exported.some(file => /\.xlsx$|\/assets\/|\\assets\\|validacao-inicial\.pdf$|atlas-checklist-consolidado\.pdf$|reteste-vadechat-2026-10-02\.pdf$|melhorias-vadechat-2026-10-05\.pdf$/i.test(file)), 'Private source file found in export');
const searchable = exported.filter(file => /\.(html|txt|js|json)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
assert(!/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(searchable), 'CPF-like value in export');
assert(!/\b\d{3}\.\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(searchable), 'Registry identifier in export');
console.log(`Verified ${data.reports.length} routes, ${data.reports.reduce((count, r) => count + r.findings.length, 0)} findings, ${data.evidence.length} evidence records and all public assets.`);
