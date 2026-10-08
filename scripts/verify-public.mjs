import fs from 'node:fs';
import path from 'node:path';
import data from '../content/reports.json' with {type:'json'};
import {validateData,verifyOriginals} from './validate-data.mjs';
import {validateAccessConfig} from '../lib/access.mjs';
const root=path.resolve('out');
const exists=p=>fs.existsSync(path.join(root,p));
validateData(data,p=>exists(p.slice(1)));
if(!exists('index.html') || !exists('.nojekyll')) throw Error('Missing static root');
if (!exists('access-config.json') || !validateAccessConfig(JSON.parse(fs.readFileSync(path.join(root,'access-config.json'),'utf8')))) throw Error('Missing/invalid access configuration: run scripts/set-access-password.ps1 locally');
for(const report of data.reports) {
  const route=`relatorios/${report.id}/index.html`;
  if(!exists(route)) throw Error(`Missing static route ${route}`);
  const html=fs.readFileSync(path.join(root,route),'utf8');
  // Level 1 hides the interface on initial render. Report content remains public in RSC data.
  if (!html.includes('access-password') || !html.includes('JavaScript está desativado')) throw Error(`Missing access gate ${route}`);
  if (html.includes('class="shell"')) throw Error(`Portal interface rendered before unlock ${route}`);
  for(const finding of report.findings) if(!html.includes(finding.id)) throw Error(`Missing exported finding data ${report.id}/${finding.id}`);
}
const count=verifyOriginals(root,data);
console.log(`Verified ${data.reports.length} static report routes, ${data.reports.reduce((n,r)=>n+r.findings.length,0)} findings, ${data.evidence.length} evidence records and ${count} SHA-256 originals.`);
