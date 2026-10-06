import fs from 'node:fs';
import path from 'node:path';
import data from '../content/reports.json' with {type:'json'};
import {validateData,verifyOriginals} from './validate-data.mjs';
const root=path.resolve('out');
const exists=p=>fs.existsSync(path.join(root,p));
validateData(data,p=>exists(p.slice(1)));
if(!exists('index.html') || !exists('.nojekyll')) throw Error('Missing static root');
for(const report of data.reports) {
  const route=`relatorios/${report.id}/index.html`;
  if(!exists(route)) throw Error(`Missing static route ${route}`);
  const html=fs.readFileSync(path.join(root,route),'utf8');
  for(const finding of report.findings) if(!html.includes(`id="${finding.id}"`)) throw Error(`Missing exported finding ${report.id}/${finding.id}`);
}
const count=verifyOriginals(root,data);
console.log(`Verified ${data.reports.length} static report routes, ${data.reports.reduce((n,r)=>n+r.findings.length,0)} findings, ${data.evidence.length} evidence records and ${count} SHA-256 originals.`);
