// Runs its own static preview unless RELALIA_TEST_URL is supplied. The gate uses a disposable credential in this
// isolated browser context; the real password/configuration is never read or changed.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes,randomUUID,pbkdf2Sync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const benchmarkId=process.argv[2] || 'benchmark-2026-10-09';
const benchmark=JSON.parse(fs.readFileSync(`content/${benchmarkId}.json`,'utf8'));
const alternativeLabel=benchmark.alternativeLabel || 'ChatGPT gratuito';
const alternativeKey=benchmark.questions[0].alternative?'alternative':'chatgpt';
import {statistics,formatScore} from '../lib/benchmark-math.mjs';
const base=process.env.RELALIA_TEST_URL || 'http://127.0.0.1:4174';
const server=process.env.RELALIA_TEST_URL?null:spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,RELALIA_PORT:'4174'},stdio:['ignore','pipe','inherit']});
if(server) await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`Static preview exited ${code}`);})]);
const password=randomBytes(32).toString('base64'),salt=randomBytes(16);
const config={algorithm:'PBKDF2',hash:'SHA-256',iterations:600000,length:256,salt:salt.toString('base64'),verifier:pbkdf2Sync(password,salt,600000,32,'sha256').toString('base64'),version:randomUUID()};
const browser=await chromium.launch({headless:true,...(process.env.RELALIA_BROWSER_CHANNEL?{channel:process.env.RELALIA_BROWSER_CHANNEL}:{})});
fs.mkdirSync('tmp/benchmark-ui',{recursive:true});
const errors=[];
try {
  for(const width of (process.env.RELALIA_TEST_WIDTHS?process.env.RELALIA_TEST_WIDTHS.split(',').map(Number):[320,390,768,1440])) {
    const context=await browser.newContext({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write']});
    await context.route('**/access-config.json?*',route=>route.fulfill({json:config}));
    const page=await context.newPage();
    await page.emulateMedia({reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/relatorios/${benchmark.id}/`);
    await page.getByLabel('Senha',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.locator('.benchmark').waitFor();
    assert.ok(await page.getByRole('heading',{name:/Run do Benchmark/}).isVisible());
    assert.equal(await page.locator('.benchmark-chart svg').count(),2);
    assert.equal(await page.locator('.benchmark-point').count(),20);
    const noOverflow=async label=>{
      const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
      assert.ok(sizes.scroll<=sizes.client+1,`${width}px ${label}: page overflow ${JSON.stringify(sizes)}`);
    };
    await noOverflow('initial');
    if(width<=800) {
      const article=await page.locator('article').boundingBox(),timeline=await page.locator('.timeline-pane').boundingBox();
      assert.ok(article.y<timeline.y,'Mobile report results must precede timeline');
    }
    // Keyboard tooltips and their accessible name include the entire question and original class.
    const point=page.locator('.benchmark-point').first();
    await point.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.ok((await point.getAttribute('aria-label')).includes(benchmark.questions[0].comparisons.agil.scores.vadechat.classification));
    assert.ok((await page.locator('#tooltip-agil').innerText()).includes(formatScore(benchmark.questions[0].comparisons.agil.scores.vadechat.total)));
    const focusOutline=await point.evaluate(el=>getComputedStyle(el.querySelector('circle')).stroke);
    assert.equal(focusOutline,'rgb(166, 107, 23)');
    await point.press('Escape');
    assert.match(await page.locator('#tooltip-agil').innerText(),/Toque/);
    const textualMarkers=page.locator('.benchmark-point-list').first();
    await textualMarkers.locator('summary').click();
    const textualButton=textualMarkers.getByRole('button').first();
    assert.ok((await textualButton.boundingBox()).height>=44);
    await textualButton.click();
    assert.ok((await page.locator('#tooltip-agil').innerText()).includes(formatScore(benchmark.questions[0].comparisons.agil.scores.vadechat.total)));
    await textualMarkers.locator('summary').click();
    for(const mode of ['agil','pleno']) {
      await page.locator('#benchmark-results').getByRole('button',{name:`${mode==='agil'?'Ágil':'Pleno'} × ${alternativeLabel}`,exact:true}).click();
      const means=await page.locator('#benchmark-results .benchmark-score-grid strong').allTextContents();
      assert.ok(means[0].startsWith(formatScore(statistics(benchmark.questions,mode,'vadechat').mean)));
      assert.ok(means[1].startsWith(formatScore(statistics(benchmark.questions,mode,alternativeKey).mean)));
      for(const q of benchmark.questions) {
        const card=page.locator(`#${q.id}`);
        assert.equal(await card.locator('.benchmark-question-text').innerText(),q.question.text.trim());
        const classes=await card.locator('.benchmark-score-grid span:last-child').allTextContents();
        assert.ok(classes[0].startsWith(q.comparisons[mode].scores.vadechat.classification));
        assert.ok(classes[1].startsWith(q.comparisons[mode].scores[alternativeKey].classification));
        const sources=[q.question,q.human,q.comparisons[mode].response,q[alternativeKey],q.comparisons[mode].document,q.comparisons[mode].review];
        for(const [index,doc] of sources.entries()) {
          const detail=card.locator('details.benchmark-source').nth(index);
          await detail.locator('summary').first().click();
          assert.equal(await detail.locator('a[download]').getAttribute('href'),doc.path);
          await detail.getByRole('button',{name:'Ver texto original',exact:true}).click();
          // HTML parsing/clipboard platforms may normalize newlines; all text remains verbatim.
          assert.equal((await detail.locator('pre').textContent()).replace(/\r\n/g,'\n'),doc.text.replace(/\r\n/g,'\n'));
          if(q.id==='Q01' && index===0) {
            await detail.getByRole('button',{name:'Copiar texto',exact:true}).click();
            assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),doc.text.replace(/\r\n/g,'\n'));
            const [download]=await Promise.all([page.waitForEvent('download'),detail.locator('a[download]').click()]);
            assert.equal(download.suggestedFilename(),doc.originalName);
            assert.deepEqual(fs.readFileSync(await download.path()),fs.readFileSync(`public${doc.path}`));
          }
          await noOverflow(`expanded ${mode}/${q.id}/${index}`);
          await detail.getByRole('button',{name:'Ver Markdown',exact:true}).click();
          await detail.locator('summary').first().click();
        }
      }
    }
    // Render the most table-heavy Markdown and check safe element output/contained scrolling.
    const markdown=page.locator('#Q02 .benchmark-source').nth(3);
    await markdown.locator('summary').first().click();
    assert.equal(await markdown.locator('.benchmark-markdown script,.benchmark-markdown iframe').count(),0);
    await noOverflow('Markdown tables and long URLs');
    await markdown.locator('summary').first().click();
    const reconstruction=page.locator('#benchmark-protocol .benchmark-source').last();
    await reconstruction.locator('summary').first().click();
    await reconstruction.getByLabel(/^Pergunta/).selectOption('Q02');
    await reconstruction.getByLabel(/^Modo/).selectOption('pleno');
    const prompt=await reconstruction.locator('pre').textContent();
    assert.ok(prompt.replace(/\r\n/g,'\n').includes(benchmark.questions[1].comparisons.pleno.response.text.replace(/\r\n/g,'\n')));
    assert.ok(!prompt.includes('[cole a'));
    await noOverflow('reconstructed prompt');
    await reconstruction.locator('summary').first().click();
    await page.locator('#benchmark-results').getByRole('button',{name:`Ágil × ${alternativeLabel}`,exact:true}).click();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`tmp/benchmark-ui/${benchmarkId}-${width}-results.png`,fullPage:false});
    await page.locator('#benchmark-charts').evaluate(el=>el.scrollIntoView({block:'start'}));
    await page.screenshot({path:`tmp/benchmark-ui/${benchmarkId}-${width}-charts.png`,fullPage:false});
    const filter=page.getByRole('combobox',{name:'Filtrar pergunta',exact:true});
    await filter.click();await page.getByRole('option',{name:new RegExp('Q04')}).click();
    assert.equal(await page.locator('.benchmark-question').count(),1);
    assert.equal(await page.locator('#Q04').count(),1);
    await filter.click();await page.getByRole('option',{name:'Todas as cinco perguntas',exact:true}).click();
    assert.equal(await page.locator('.benchmark-question').count(),5);
    await noOverflow('custom dropdown filter');
    if(alternativeKey==='alternative') {
      const roles=await page.locator('.benchmark-roles').innerText();
      assert.ok(roles.includes('Claude gratuito') && roles.includes('ChatGPT Grátis') && roles.includes('GPT-6.1 Alta'));
      assert.ok(roles.includes('Sonnet 5.5 Médio') && roles.includes('modelo não identificado'));
      await page.goto(`${base}/relatorios/benchmark-2026-10-09/`);await page.locator('.benchmark').waitFor();
      assert.ok((await page.locator('.benchmark-roles').innerText()).includes('ChatGPT gratuito'));
      await page.goto(`${base}/relatorios/${benchmark.id}/`);await page.locator('.benchmark').waitFor();
    }
    await page.reload();
    await page.locator('.benchmark').waitFor();
    await page.goto(`${base}/`);
    await page.locator('.benchmark').waitFor();
    await page.locator('.timeline a[href="/relatorios/alia-2026-10-08/"]').click();
    await page.getByRole('heading',{name:'Achados e resultados',exact:true}).waitFor();
    assert.equal(await page.locator('.benchmark').count(),0);
    assert.ok(await page.locator('#GIRO-UX-01').count());
    console.log(`${width}px: no overflow; both modes, 60 evidence panels, keyboard, copy/download, reconstruction, direct route/reload/home/history verified`);
    await context.close();
  }
  assert.deepEqual(errors,[],'Browser runtime errors');
} finally {await browser.close();server?.kill();}
