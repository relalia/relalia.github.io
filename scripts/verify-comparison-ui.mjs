// Uses a disposable gate configuration in an isolated browser, never the real password.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,pbkdf2Sync,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const id=process.argv[2]||'benchmark-comparativo-2026-10-14';
assert(/^[a-z0-9-]+$/.test(id));
const d=JSON.parse(fs.readFileSync(`content/${id}.json`,'utf8'));
const catalog=JSON.parse(fs.readFileSync('content/reports.json','utf8'));
const latest=[...catalog.reports].sort((a,b)=>b.date.localeCompare(a.date))[0];
const base=process.env.RELALIA_TEST_URL||'http://127.0.0.1:4175';
const server=process.env.RELALIA_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,RELALIA_PORT:'4175'},stdio:['ignore','pipe','inherit']});
if(server)await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`Preview exited ${code}`);})]);
const password=randomBytes(32).toString('base64'),salt=randomBytes(16);
const config={algorithm:'PBKDF2',hash:'SHA-256',iterations:600000,length:256,salt:salt.toString('base64'),verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'),version:randomUUID()};
const browser=await chromium.launch({headless:true,channel:process.env.RELALIA_BROWSER_CHANNEL||'chrome'});
fs.mkdirSync('tmp/comparison-ui',{recursive:true});
const norm=s=>s.replace(/\r\n?/g,'\n').trim();
const errors=[];
try{
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write']});
    await context.route('**/access-config.json?*',route=>route.fulfill({json:config}));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/relatorios/${d.id}/`);
    await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.locator('.benchmark-comparison').waitFor();
    assert(await page.getByRole('heading',{name:d.title,exact:true}).isVisible());
    assert.equal(await page.locator('#comparison-table tbody tr').count(),10);
    assert((await page.locator('#comparison-results').innerText()).includes(d.highlights[0]));
    if(d.alternativeLabel)assert(!(await page.locator('.benchmark-comparison').innerText()).includes('inconclusividade global'));
    const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`${width}: horizontal overflow`);
    await noOverflow();
    if(width<=768){const a=await page.locator('article').boundingBox(),t=await page.locator('.timeline-pane').boundingBox();assert(a.y<t.y);}
    const card=page.locator('#Q04-PLENO');
    await card.locator(':scope > summary').focus();await page.keyboard.press('Enter');assert(await card.evaluate(el=>el.open));
    const widthDocs=width===1440?d.rows:[d.rows.find(r=>r.id==='Q04-PLENO')];
    for(const row of widthDocs){
      const c=page.locator('#'+row.id);await c.evaluate(el=>el.open=true);
      const sourcePanels=await c.locator('.benchmark-source').all();
      const expected=['old','new'].flatMap(p=>['question','reference','opponent',row.mode,`judgment:${row.mode}`,`review:${row.mode}`,'mapping'].map(slot=>d.documents[row.sources[p][slot]])).concat([d.documents[row.prompt],d.documents[row.reviewPrompt]]);
      assert.equal(sourcePanels.length,16);
      for(const [i,panel] of sourcePanels.entries()){
        await panel.locator(':scope > summary').click();
        await panel.getByRole('button',{name:'Ver texto original',exact:true}).click();
        assert.equal(norm(await panel.locator('pre').textContent()),norm(expected[i].text));
        assert.equal(await panel.getByRole('link',{name:'Baixar arquivo de origem'}).getAttribute('href'),expected[i].path);
        await panel.locator(':scope > summary').click();
      }
      await noOverflow();await c.evaluate(el=>el.open=false);
    }
    await card.evaluate(el=>el.open=true);
    const copy=card.locator('.benchmark-source').first();await copy.locator(':scope > summary').click();
    await copy.getByRole('button',{name:'Copiar texto',exact:true}).click();
    assert.equal(norm(await page.evaluate(()=>navigator.clipboard.readText())),norm(d.documents[d.rows.find(r=>r.id==='Q04-PLENO').sources.new.question].text));
    const downloadPromise=page.waitForEvent('download');await copy.getByRole('link',{name:'Baixar arquivo de origem'}).click();assert((await downloadPromise).suggestedFilename().endsWith('.txt'));
    await card.evaluate(el=>el.open=false);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tmp/comparison-ui/${d.id}-${width}.png`});
    await page.reload();await page.locator('.benchmark-comparison').waitFor();
    await page.goto(base+'/');await page.locator('.timeline a[aria-current="page"]').waitFor();assert(await page.locator('.timeline a[aria-current="page"]').getAttribute('href')===`/relatorios/${latest.id}/`);
    if(d.id!==latest.id){await page.locator(`.timeline a[href="/relatorios/${d.id}/"]`).click();await page.getByRole('heading',{name:d.title,exact:true}).waitFor();}
    await page.getByRole('link',{name:d.related[0].label,exact:true}).click();await page.locator('.benchmark:not(.benchmark-comparison)').waitFor();
    assert(page.url().includes(d.related[0].id));
    assert(await page.locator(`.timeline a[href="/relatorios/${d.id}/"]`).isVisible(),'New catalog card missing on historical report');
    await context.close();
    console.log(`${width}px: route, home, keyboard, sources, copy/download, history and overflow verified`);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  for(const doc of Object.values(d.documents)){
    const res=await fetch(base+encodeURI(doc.path));assert.equal(res.status,200,doc.path);
    assert.equal(createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex'),doc.sha256,doc.path);
  }
  const pdf=await fetch(`${base}/reports/${d.id}.pdf`);assert.equal(pdf.status,200);assert.equal(createHash('sha256').update(Buffer.from(await pdf.arrayBuffer())).digest('hex'),createHash('sha256').update(fs.readFileSync(`public/reports/${d.id}.pdf`)).digest('hex'));
  console.log('125 originals and succinct PDF: HTTP 200 and matching SHA-256; no page errors.');
}finally{await browser.close();server?.kill();}
