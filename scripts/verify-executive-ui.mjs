import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID,pbkdf2Sync} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
const id=process.argv[2]||'vadechat-ux-2026-11-02',base=process.env.RELALIA_TEST_URL||'http://127.0.0.1:4185';
const data=JSON.parse(fs.readFileSync('content/reports.json','utf8')),r=data.reports.find(r=>r.id===id),ev=data.evidence.filter(e=>e.reportId===id);
assert(r?.executive,'Select an executive report');
const latest=[...data.reports].sort((a,b)=>b.date.localeCompare(a.date))[0];
const before=JSON.parse(execFileSync('git',['show','HEAD:content/reports.json'],{encoding:'utf8'}));
for(const previous of before.reports.filter(r=>r.id!==id))assert.deepEqual(data.reports.find(r=>r.id===previous.id),previous);
for(const previous of before.evidence.filter(e=>e.reportId!==id))assert.deepEqual(data.evidence.find(e=>e.id===previous.id),previous);
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const report of before.reports)for(const f of report.files){if(report.id===id&&f.origin==='generated')continue;assert.equal(hash(fs.readFileSync('public'+f.path)),hash(execFileSync('git',['show','HEAD:public'+f.path],{maxBuffer:40*1024*1024})));}
// Historical inputs may have left Windows Temp; use the hash-registered originals.
const sources=ev.map(e=>'public'+e.path);
for(let i=0;i<ev.length;i++){assert.equal(hash(fs.readFileSync(sources[i])),ev[i].sha256);assert.equal(hash(fs.readFileSync('public'+ev[i].path)),ev[i].sha256);}
const output='tmp/executive-ui/'+id;fs.mkdirSync(output,{recursive:true});
const server=process.env.RELALIA_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,RELALIA_PORT:'4185'},windowsHide:true,stdio:['ignore','pipe','inherit']});if(server)await once(server.stdout,'data');
const browser=await chromium.launch({channel:'chrome',headless:true});
const password=randomBytes(24).toString('base64'),salt=randomBytes(16),config={algorithm:'PBKDF2',hash:'SHA-256',iterations:600000,length:256,salt:salt.toString('base64'),verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'),version:randomUUID()};
const errors=[];
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:1000}});await ctx.route('**/access-config.json?*',route=>route.fulfill({json:config}));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/relatorios/'+id+'/');await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Resultados do benchmark',exact:true}).waitFor();
  assert.equal(await page.locator('.executive-card').count(),2);
  if(r.executive.pendingNotice)await page.getByText(r.executive.pendingNotice,{exact:true}).waitFor();
  if(r.executive.completionNote){await page.getByText(r.executive.completionNote,{exact:true}).waitFor();assert.equal(await page.locator('.meta .tag').first().innerText(),'Execução finalizada');}
  for(const [i,m] of r.executive.modes.entries()){
   const card=page.locator('.executive-card').nth(i);
   assert.equal(await card.locator('.executive-score>strong').innerText(),m.vcMean.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));
   assert((await card.innerText()).includes(m.wins+' '+(m.wins===1?'vitória':'vitórias')+' · '+m.ties+' '+(m.ties===1?'empate':'empates')+' · '+m.losses+' '+(m.losses===1?'derrota':'derrotas')));
  }
  const tables=page.locator('.executive-results .benchmark-table-wrap');
  for(let i=0;i<2;i++){await tables.nth(i).focus();assert(await tables.nth(i).evaluate(e=>e===document.activeElement));}
  for(const detail of await page.locator('.executive-detail').all()){
   assert.equal(await detail.evaluate(e=>e.open),false);await detail.locator('summary').focus();await page.keyboard.press('Enter');assert(await detail.evaluate(e=>e.open));
   await detail.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await detail.evaluate(e=>e.open),false);
  }
  await page.locator('.executive-results').screenshot({path:output+'/results-'+width+'.png'});
  if(ev.length){
  const finding=page.locator('#VC-MSG-01');await finding.waitFor();await finding.locator(':scope > summary').focus();await page.keyboard.press('Enter');assert(await finding.evaluate(e=>e.open));
  assert.equal(await page.locator('video').count(),1);const video=page.locator('video');assert.notEqual(await video.getAttribute('controls'),null);await video.evaluate(v=>{v.muted=true;return v.play();});
  await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.3);
  const duration=await video.evaluate(v=>{v.pause();v.currentTime=6;return v.duration;});assert(Math.abs(duration-9.266633)<0.1);
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&Math.abs(v.currentTime-6)<0.1&&v.readyState>=2;});
  const trigger=page.getByRole('button',{name:'Ampliar VCUX1102-EV-02',exact:true});await trigger.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('dialog img'));assert(await trigger.evaluate(e=>e===document.activeElement));
  for(const e of ev){const [download]=await Promise.all([page.waitForEvent('download'),page.locator('a.evidence-download[href="'+e.path+'"]').click()]);assert.equal(hash(fs.readFileSync(await download.path())),e.sha256);}
  await finding.screenshot({path:output+'/ux-'+width+'.png'});
  }else{assert.equal(await page.locator('.finding').count(),0);assert.equal(await page.getByRole('heading',{name:'UX do VadeChat',exact:true}).count(),0);}
  const [pdf]=await Promise.all([page.waitForEvent('download'),page.locator('.downloads a[download][href="/reports/'+id+'.pdf"]').click()]);assert.equal(hash(fs.readFileSync(await pdf.path())),hash(fs.readFileSync('public/reports/'+id+'.pdf')));
  const [source]=await Promise.all([page.waitForEvent('download'),page.locator('.downloads a[download][href="'+r.executive.source.path+'"]').click()]);assert.equal(hash(fs.readFileSync(await source.path())),r.executive.source.sha256);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await page.reload();await page.getByRole('heading',{name:r.title,exact:true}).waitFor();
  await page.goto(base+'/');await page.getByRole('heading',{name:latest.title,exact:true}).waitFor();assert.equal(await page.locator('.timeline a[aria-current="page"]').getAttribute('href'),'/relatorios/'+latest.id+'/');
  await page.locator('.timeline a[href="/relatorios/'+id+'/"]').click();await page.getByRole('heading',{name:r.title,exact:true}).waitFor();
  await ctx.close();console.log(width+'px: results, keyboard tables/details, PDF downloads, direct route/reload, timeline, homepage and overflow verified'+(ev.length?'; video playback/seek and image zoom verified.':'.'));
 }
 assert.deepEqual(errors,[]);
 if(ev.length){const response=await fetch(base+ev[0].path,{headers:{Range:'bytes=0-1023'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 0-1023/10172616');assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(fs.readFileSync(sources[0]).subarray(0,1024)));}
 const original=await fetch(base+r.executive.source.path);assert.equal(original.status,200);assert.equal(hash(Buffer.from(await original.arrayBuffer())),r.executive.source.sha256);
 console.log('Original PDF SHA-256 verified; earlier catalog records and attachments unchanged.');
}finally{await browser.close();server?.kill();}
