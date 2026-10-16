// Disposable gate configuration in an isolated context; never reads the real password.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes,randomUUID,pbkdf2Sync,createHash} from 'node:crypto';
import d from '../content/sintese-benchmarks-interface-2026-10-16.json' with {type:'json'};
const base=process.env.RELALIA_TEST_URL||'http://127.0.0.1:4178';
const server=process.env.RELALIA_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,RELALIA_PORT:'4178'},stdio:['ignore','pipe','inherit']});
if(server)await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([c])=>{throw Error(`Preview failed ${c}`);})]);
const password=randomBytes(32).toString('base64'),salt=randomBytes(16);
const config={algorithm:'PBKDF2',hash:'SHA-256',iterations:600000,length:256,salt:salt.toString('base64'),verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'),version:randomUUID()};
const browser=await chromium.launch({channel:'chrome',headless:true});
fs.mkdirSync('tmp/overview-ui',{recursive:true});
const errors=[];
try{
  for(const width of (process.env.RELALIA_TEST_WIDTHS||'320,390,768,1440').split(',').map(Number)){
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.route('**/access-config.json?*',route=>route.fulfill({json:config}));
    const page=await context.newPage();page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/relatorios/${d.id}/`);
    await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.locator('.benchmark-overview').waitFor();
    assert(await page.getByRole('heading',{name:d.title,exact:true}).isVisible());
    assert.equal(await page.locator('.overview-metric').count(),4);
    assert.equal(await page.locator('#overview-figure .overview-value').count(),16);
    assert.equal(await page.locator('#overview-figure tbody tr').count(),8);
    const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`${width}: page overflow`);
    await noOverflow();
    await page.locator('#overview-figure').screenshot({path:`tmp/overview-ui/figure-${width}.png`});
    for(const b of d.benchmarks){
      const detail=page.locator('#details-'+b.key);assert(!(await detail.evaluate(el=>el.open)),'Detail should start collapsed');
      const values=await page.locator(`#figure-${b.key}`).locator('..').locator('..').locator('.overview-value').allTextContents();
      assert.deepEqual(values,b.series.flatMap(s=>s.values.map(v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}))));
      await detail.locator(':scope > summary').focus();await page.keyboard.press('Enter');assert(await detail.evaluate(el=>el.open));
      assert.equal(await detail.locator('svg.overview-svg').count(),2);assert.equal(await detail.locator('tbody tr').count(),22);
      const region=detail.getByRole('region').first();await region.focus();assert(await region.evaluate(el=>el===document.activeElement));
      await noOverflow();await detail.locator(':scope > summary').click();
    }
    assert.equal(await page.locator('#overview-ui .image-trigger').count(),6);
    for(const image of d.images){
      const trigger=page.getByRole('button',{name:'Ampliar '+image.id,exact:true});
      await trigger.focus();await page.keyboard.press('Enter');
      const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('img').getAttribute('src'),image.path);
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await trigger.evaluate(el=>el===document.activeElement));
    }
    await noOverflow();
    for(const item of d.improvements)assert((await page.locator('#'+item.id).innerText()).includes(item.limit));
    if(width===390||width===1440)await page.locator('#overview-ui').screenshot({path:`tmp/overview-ui/interface-${width}.png`});
    for(const label of ['Markdown editável','Dados e cálculos · JSON','Índice de fontes e SHA-256']){
      const download=page.waitForEvent('download');await page.getByRole('link',{name:label,exact:true}).click();assert((await download).suggestedFilename().startsWith(d.id));
    }
    const download=page.waitForEvent('download');await page.locator('#overview-ui .evidence-download').first().click();assert((await download).suggestedFilename().endsWith('.png'));
    for(const b of d.benchmarks){
      await page.getByRole('link',{name:`Comparativo completo · ${b.label} →`,exact:true}).click();await page.locator('.benchmark-comparison').waitFor();
      assert(page.url().includes(b.comparisonId));assert(await page.locator(`.timeline a[href="/relatorios/${d.id}/"]`).isVisible());
      await page.locator(`.timeline a[href="/relatorios/${d.id}/"]`).click();await page.locator('.benchmark-overview').waitFor();
    }
    await page.goto(base+'/');await page.locator('.benchmark-overview').waitFor();assert.equal(await page.locator('.timeline a[aria-current="page"]').getAttribute('href'),`/relatorios/${d.id}/`);
    await page.getByRole('combobox',{name:'Módulo'}).focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');
    await page.keyboard.press('End');
    await page.waitForFunction(()=>document.activeElement?.textContent?.includes('Alia'));
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('[role="combobox"]')?.textContent?.includes('Alia'));
    assert((await page.getByRole('combobox',{name:'Módulo'}).innerText()).includes('Alia'));
    assert(await page.locator(`.timeline a[href="/relatorios/${d.id}/"]`).isVisible());
    await noOverflow();await context.close();console.log(`${width}px: eight means, collapsed details, six image dialogs, keyboard, downloads, history, filter and overflow verified.`);
  }
  assert.deepEqual(errors,[]);
  const paths=[...d.images.map(i=>({path:i.path,sha256:i.sha256})),...['.pdf','.md','-dados.json','-fontes.json'].map(ext=>({path:`/reports/${d.id}${ext}`}))];
  for(const f of paths){const response=await fetch(base+f.path);assert.equal(response.status,200);const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(Buffer.from(await response.arrayBuffer())),f.sha256??sha(fs.readFileSync('public'+f.path)));}
  console.log('Six originals and PDF/Markdown/data/source index return HTTP 200 and expected SHA-256; no browser errors.');
}finally{await browser.close();server?.kill();}
