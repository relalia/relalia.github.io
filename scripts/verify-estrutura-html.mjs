import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const reportPath='public/reports/estrutura-vadechat-2026-11-12.html';
const report=fs.readFileSync(reportPath,'utf8');
for(const [id,file] of [
  ['prototype-data','public/reports/prototipo-vadechat-estrutura-2026-11-12.html'],
  ['giro-data','public/reports/prototipo-giro-estrutura-2026-11-12.html'],
]) {
  const marker=new RegExp(`<script type="application/octet-stream" id="${id}">([A-Za-z0-9+/=]+)</script>`);
  const encoded=report.match(marker)?.[1];
  assert(encoded,`Missing embedded prototype ${id}`);
  assert.deepEqual(Buffer.from(encoded,'base64'),fs.readFileSync(file),`${id} differs from its separate copy`);
}
const encodedVideo=report.match(/src="data:video\/mp4;base64,([A-Za-z0-9+/=]+)"/)?.[1];
assert(encodedVideo,'Missing embedded video');
assert.equal(createHash('sha256').update(Buffer.from(encodedVideo,'base64')).digest('hex'),'818c7d7115918fda8b7d6798d5a3a1b0561b9928cdb514d9a21f342d7221fcf1');

const browser=await chromium.launch({headless:true,...(process.env.RELALIA_BROWSER_CHANNEL?{channel:process.env.RELALIA_BROWSER_CHANNEL}:{})});
try {
  for(const width of [320,390,768,1440,1920]) {
    const context=await browser.newContext({viewport:{width,height:width===320?568:900},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.resolve(reportPath)).href);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'Report overflows horizontally');
    assert(await page.locator('video').evaluate(v=>Math.abs(v.duration-21.2)<0.1),'Video metadata unavailable');
    for(const id of ['open-chat','download-chat','open-giro','download-giro'])
      assert((await page.locator(`#${id}`).getAttribute('href')).startsWith('blob:'),`${id} is unavailable`);
    assert((await page.locator('#download-video').getAttribute('href')).startsWith('data:video/mp4;'));
    if(width===1440) {
      await page.locator('video').evaluate(async video=>{video.muted=true;await video.play();});
      await page.waitForTimeout(300);
      assert(await page.locator('video').evaluate(video=>{video.pause();return video.currentTime>0;}),'Embedded video did not play');
    }

    await page.locator('#chat-preview summary').click();
    const chat=page.frameLocator('#demo-chat');
    await chat.locator('textarea').waitFor();
    const chatSize=await chat.locator('body').evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(chatSize.width,chatSize.scroll,'Chat prototype overflows horizontally');
    assert.equal(await chat.locator('#tri7-modal-orientacoes').evaluate(el=>getComputedStyle(el).display),'none','Closed dialog remains visible');
    assert(await chat.getByLabel('Anexar arquivo').isDisabled(),'Unavailable attachment control should be disabled');
    const input=chat.getByLabel('Mensagem para demonstração');
    await chat.locator('button[class*="min-h-[44px]"]').first().click();
    assert((await input.inputValue()).length>0,'Shortcut did not fill the composer');
    const overlaps=await chat.locator('body').evaluate(()=>{
      const a=document.querySelector('button[aria-label="Enviar mensagem"]').getBoundingClientRect();
      const b=document.querySelector('button[aria-label="Abrir suporte"]').getBoundingClientRect();
      return a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom;
    });
    assert(!overlaps,'Support control overlaps send');
    await chat.getByLabel('Enviar mensagem').click();
    await chat.getByText('Resposta simulada para demonstração').waitFor();
    assert.equal(await chat.locator('#tri7-chat-stream > div[class*="min-h-full"]').evaluate(el=>getComputedStyle(el).display),'none');

    const help=chat.getByTitle('Orientações de uso do VadeChat');
    await help.click();
    assert(await chat.locator('#tri7-close-modal').evaluate(el=>el===document.activeElement),'Dialog did not receive focus');
    await page.keyboard.press('Shift+Tab');
    assert(await chat.locator('#tri7-btn-confirm-modal').evaluate(el=>el===document.activeElement),'Dialog focus did not wrap');
    await page.keyboard.press('Escape');
    assert(await chat.locator('#tri7-modal-orientacoes').evaluate(el=>el.hidden),'Escape did not close dialog');
    assert(await help.evaluate(el=>el===document.activeElement),'Dialog did not return focus');

    if(chatSize.width<768) {
      assert.equal(await chat.locator('.tri7-sidebar').evaluate(el=>getComputedStyle(el).visibility),'hidden','Closed history remains focusable');
      const open=chat.getByLabel('Abrir a lista de conversas');
      await open.click();
      assert.equal(await open.getAttribute('aria-expanded'),'true');
      await page.keyboard.press('Escape');
      assert.equal(await open.getAttribute('aria-expanded'),'false');
      assert(await open.evaluate(el=>el===document.activeElement),'History did not return focus');
      await open.click();
    }
    await chat.getByRole('button',{name:'Nova conversa'}).click();
    assert.equal(await chat.locator('.tri7-conversation-view').count(),0,'New conversation did not reset');
    if(chatSize.width<768) assert.equal(await chat.getByLabel('Abrir a lista de conversas').getAttribute('aria-expanded'),'false');

    if(width===1440) {
      await input.fill('<img src=x onerror=alert(1)>');
      await chat.getByLabel('Enviar mensagem').click();
      await chat.getByText('<img src=x onerror=alert(1)>',{exact:true}).waitFor();
      assert.equal(await chat.locator('.tri7-conversation-view img').count(),0,'Message HTML was executed');
      await chat.getByRole('button',{name:'Nova conversa'}).click();
      await input.evaluate(el=>{
        el.value='primeira';el.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('button[aria-label="Enviar mensagem"]').click();
        el.value='segunda';el.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('button[aria-label="Enviar mensagem"]').click();
      });
      await chat.getByText('Resposta simulada para demonstração').nth(1).waitFor();
      const sequence=await chat.locator('.tri7-conversation-view > div').allTextContents();
      assert(sequence[0].includes('primeira') && sequence[1].includes('Resposta simulada') && sequence[2].includes('segunda') && sequence[3].includes('Resposta simulada'),'Responses lost their order');
      await chat.getByRole('button',{name:'Nova conversa'}).click();
      await input.evaluate(el=>{
        el.value='pendente';el.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('button[aria-label="Enviar mensagem"]').click();
        Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Nova conversa')).click();
      });
      await page.waitForTimeout(500);
      assert.equal(await chat.locator('.tri7-conversation-view').count(),0,'A stale response survived a reset');
      await input.fill('composição');
      await input.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true})));
      assert.equal(await chat.locator('.tri7-conversation-view').count(),0,'Enter during text composition submitted the message');
      await input.evaluate(el=>{
        for(let i=0;i<5;i++) {
          el.value=`Mensagem ${i}: `+'conteúdo longo '.repeat(100);
          el.dispatchEvent(new Event('input',{bubbles:true}));
          document.querySelector('button[aria-label="Enviar mensagem"]').click();
        }
      });
      await chat.getByText('Resposta simulada para demonstração').nth(4).waitFor();
      await input.evaluate(el=>{
        el.value='nova resposta';el.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('button[aria-label="Enviar mensagem"]').click();
        window.scrollTo(0,0);
      });
      await page.waitForTimeout(550);
      assert((await input.evaluate(()=>window.scrollY))<10,'Response moved the reader away from earlier messages');
    }

    await page.locator('#giro-preview summary').click();
    const giro=page.frameLocator('#demo-giro');
    await giro.getByLabel('Buscar no Giro').waitFor();
    const giroSize=await giro.locator('body').evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(giroSize.width,giroSize.scroll,'GIRO prototype overflows horizontally');
    assert.equal(await giro.locator('article').count(),12);
    assert(await giro.getByRole('group',{name:'Segmento'}).getByRole('button',{name:'Notas',exact:true}).isDisabled());
    const search=giro.getByLabel('Buscar no Giro');
    await search.fill('cedulas');
    assert.equal(await giro.locator('article:visible').count(),1,'Accent-insensitive search failed');
    if(giroSize.width>=1200) {
      const cardWidth=await giro.locator('article:visible').first().evaluate(el=>el.getBoundingClientRect().width);
      assert(cardWidth<giroSize.width/2,'A single filtered card stretched across the page');
    }
    await search.fill('nenhum-item-corresponde-123');
    assert.equal(await giro.locator('article:visible').count(),0);
    assert.equal(await giro.locator('.relalia-giro-results').innerText(),'0 itens nesta cópia');
    await search.fill('');
    const firstCard=giro.locator('.relalia-giro-feed article').first();
    await firstCard.getByRole('button',{name:'Mostrar mais'}).click();
    assert.equal(await firstCard.getByRole('button',{name:'Mostrar menos'}).getAttribute('aria-expanded'),'true');
    assert.equal(await firstCard.locator('p.line-clamp-3').count(),0,'Summary did not expand');
    await firstCard.getByRole('button',{name:'Mostrar menos'}).click();
    assert.equal(await firstCard.locator('p.line-clamp-3').count(),1,'Summary did not collapse');
    const regions=giro.getByRole('group',{name:'Abrangência'});
    await regions.getByRole('button',{name:'GO',exact:true}).click();
    assert.equal(await giro.locator('article:visible').count(),1,'Region filter failed');
    await regions.getByRole('button',{name:'Tudo',exact:true}).click();
    assert.equal(await giro.locator('article:visible').count(),12);
    assert.deepEqual(external,[],'Offline report attempted a network request');
    assert.deepEqual(errors,[],'Unexpected JavaScript error');
    await context.close();
    console.log(`${width}px: report, Chat and GIRO interactions verified offline`);
  }
  for(const [width,expectedColumns] of [[320,1],[1440,4],[1920,5]]) {
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage(),external=[];
    page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
    await page.route(/^https?:/,route=>route.abort());
    await page.goto(pathToFileURL(path.resolve('public/reports/prototipo-giro-estrutura-2026-11-12.html')).href);
    const layout=await page.evaluate(()=>{
      const grid=document.querySelector('.relalia-giro-feed');
      return {width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gridWidth:grid.getBoundingClientRect().width};
    });
    assert.equal(layout.width,layout.scroll,`${width}px standalone GIRO overflows horizontally`);
    assert.equal(layout.columns,expectedColumns,`${width}px GIRO grid has unexpected columns`);
    assert(layout.gridWidth>width-100,`${width}px GIRO does not use the available width`);
    assert.deepEqual(external,[],'Standalone GIRO attempted a network request');
    await context.close();
  }
  console.log('Standalone GIRO: grid verified at 320, 1440 and 1920px');
  const noJs=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const staticPage=await noJs.newPage();
  await staticPage.goto(pathToFileURL(path.resolve(reportPath)).href);
  assert.equal(await staticPage.locator('.screen img').count(),4,'Static comparisons are missing without JavaScript');
  assert.equal(await staticPage.locator('.demo:visible').count(),0,'Interactive previews should not appear without JavaScript');
  assert(await staticPage.locator('video').evaluate(video=>Math.abs(video.duration-21.2)<0.1),'Video is unavailable without JavaScript');
  await noJs.close();
  console.log('Static comparisons and video verified without JavaScript');
} finally {
  await browser.close();
}
