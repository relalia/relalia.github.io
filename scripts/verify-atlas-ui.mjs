// Isolated disposable access configuration; never reads or changes the real password.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes,randomUUID,pbkdf2Sync,createHash} from 'node:crypto';
import {openTimeline} from './timeline-ui.mjs';
const id='alia-atlas-2026-10-19',base=process.env.RELALIA_TEST_URL||'http://127.0.0.1:4182';
const data=JSON.parse(fs.readFileSync('content/reports.json','utf8')),report=data.reports.find(r=>r.id===id),evidence=data.evidence.filter(e=>e.reportId===id);
const latest=[...data.reports].sort((a,b)=>b.date.localeCompare(a.date))[0];
fs.mkdirSync('tmp/alia-atlas-2026-10-19',{recursive:true});
const server=process.env.RELALIA_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,RELALIA_PORT:'4182'},windowsHide:true,stdio:['ignore','pipe','inherit']});
if(server)await once(server.stdout,'data');
const browser=await chromium.launch({channel:'chrome',headless:true});
const password=randomBytes(24).toString('base64'),salt=randomBytes(16);
const config={algorithm:'PBKDF2',hash:'SHA-256',iterations:600000,length:256,salt:salt.toString('base64'),verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'),version:randomUUID()};
const errors=[],prefix=process.env.RELALIA_TEST_URL?'public':'local',proof=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
try{
 for(const width of (process.env.RELALIA_TEST_WIDTHS||'320,390,768,1440').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.route('**/access-config.json?*',route=>route.fulfill({json:config}));
  const page=await context.newPage();page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/relatorios/'+id+'/');
  await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:report.title,exact:true}).waitFor();
  assert.equal(await page.locator('.finding').count(),14);assert.equal(await page.locator('.finding[open]').count(),0);
  assert(await page.getByText(report.status,{exact:true}).isVisible());
  const overflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),width+'px overflow');
  await overflow();await page.screenshot({path:`tmp/alia-atlas-2026-10-19/${prefix}-card-${width}.png`});
  const search=page.locator('.finding-tools input[type=search]');await search.fill('ATLAS-UX-12');
  await page.waitForFunction(()=>document.querySelector('#ATLAS-NAV-09')?.hidden===true);assert(await page.locator('#ATLAS-UX-12').isVisible());
  await search.fill('');await page.waitForFunction(()=>document.querySelectorAll('.finding:not([hidden])').length===14);
  for(const f of report.findings){const summary=page.locator('#'+f.id+' > summary');await summary.focus();await page.keyboard.press('Enter');assert(await page.locator('#'+f.id).evaluate(e=>e.open));}
  assert.equal(await page.locator('.image-trigger').count(),21);
  for(const ev of evidence){
   const trigger=page.getByRole('button',{name:'Ampliar '+ev.id,exact:true});await trigger.focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog').waitFor();await page.waitForFunction(()=>document.querySelector('dialog[open] img')?.naturalWidth>0);
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('dialog img'));assert(await trigger.evaluate(e=>e===document.activeElement));
  }
  await overflow();
  for(const finding of ['ATLAS-UX-12','ATLAS-UX-13','ATLAS-UX-14'])await page.locator('#'+finding).screenshot({path:`tmp/alia-atlas-2026-10-19/${prefix}-${finding}-${width}.png`});
  const thirteen=page.locator('#ATLAS-UX-13');await thirteen.locator(':scope > summary').click();assert(!(await thirteen.evaluate(e=>e.open)));
  await page.locator('#ATLAS-UX-14 .related a[href="/relatorios/'+id+'/#ATLAS-UX-13"]').click();await page.waitForFunction(()=>document.querySelector('#ATLAS-UX-13')?.open);
  assert(await thirteen.locator(':scope > summary').evaluate(e=>e===document.activeElement));
  await thirteen.locator(':scope > summary').click();await search.fill('repetição simultânea');
  await page.waitForFunction(()=>document.querySelector('#ATLAS-UX-13')?.hidden===true);
  const repeatedLink=page.locator('#ATLAS-UX-14 .related a[href="/relatorios/'+id+'/#ATLAS-UX-13"]');await repeatedLink.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#ATLAS-UX-13')?.open&&!document.querySelector('#ATLAS-UX-13')?.hidden);assert.equal(await search.inputValue(),'');
  assert(await thirteen.locator(':scope > summary').evaluate(e=>e===document.activeElement));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.downloads .download-actions a[download]').click()]);
  assert.equal(hash(fs.readFileSync(await download.path())),hash(fs.readFileSync('public/reports/'+id+'.pdf')));
  const [original]=await Promise.all([page.waitForEvent('download'),page.locator('#ATLAS-UX-14 .evidence-download').click()]);assert.equal(hash(fs.readFileSync(await original.path())),evidence.find(e=>e.id==='ATLAS19-EV-21').sha256);
  await page.locator('#ATLAS-UX-06 .compare').click();await page.waitForFunction(()=>document.querySelector('#AC-006')?.open);
  await openTimeline(page,width);
  await page.locator('.timeline a[href="/relatorios/'+id+'/"]').click();await page.getByRole('heading',{name:report.title,exact:true}).waitFor();
  await page.reload();await page.getByRole('heading',{name:report.title,exact:true}).waitFor();
  await page.goto(base+'/');await openTimeline(page,width);assert.equal(await page.locator('.timeline a[aria-current="page"]').getAttribute('href'),'/relatorios/'+latest.id+'/');
  const filter=page.getByRole('combobox',{name:'Módulo'});await filter.focus();await page.keyboard.press('Enter');const option=page.getByRole('option',{name:'Alia',exact:true});await option.focus();await page.keyboard.press('Enter');
  assert((await filter.innerText()).includes('Alia'));assert(await page.locator('.timeline a[href="/relatorios/'+id+'/"]').isVisible());
  await overflow();await context.close();console.log(`${prefix} ${width}px: 14 findings, 21 keyboard dialogs, search/filter, links, reload/home, downloads and no overflow verified.`);
 }
 assert.deepEqual(errors,[]);
 const files=[...evidence,...data.reports.flatMap(r=>r.files),{path:'/originals/SHA256SUMS.txt'}];
 const unique=[...new Map(files.map(f=>[f.path,f])).values()];
 for(let start=0;start<unique.length;start+=6){
  const checks=await Promise.allSettled(unique.slice(start,start+6).map(async f=>{const res=await fetch(base+encodeURI(f.path),{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(res.status,200,f.path);const expected=f.sha256||hash(fs.readFileSync('public'+f.path));assert.equal(hash(Buffer.from(await res.arrayBuffer())),expected,f.path);return {path:f.path,sha256:expected,status:200};}));
  for(const result of checks){if(result.status==='rejected')throw result.reason;proof.push(result.value);}
 }
 for(const r of data.reports){const response=await fetch(base+'/relatorios/'+r.id+'/',{cache:'no-store'});assert.equal(response.status,200,r.id);}
 fs.writeFileSync(`tmp/alia-atlas-2026-10-19/${prefix}-publication-proof.json`,JSON.stringify({base,findings:14,evidence:21,routes:data.reports.length,files:proof,browserErrors:errors},null,2)+'\n');
 console.log(`${prefix}: ${unique.length} downloads match SHA-256; all ${data.reports.length} report routes return HTTP 200, including historical PDFs.`);
}finally{await browser.close();server?.kill();}
