import assert from 'node:assert/strict';
import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://localhost:4198';
const archive = path.resolve('out');
const output = 'tmp/weekly-ui';
const route = '/relatorios/resumo-benchmarks-vadechat-2026-11-19/';
const manualHash = '#teste-manual-cartorario';
const summaryHash = '#resumo-da-semana';
const title = 'Resumo da semana · VadeChat × 3 IAs e Teste jurídico cartorário manual com Qwen4 e Opus 5.5';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const password = randomBytes(24).toString('base64');
const salt = randomBytes(16);
const configuration = {
  algorithm: 'PBKDF2', hash: 'SHA-256', iterations: 600000, length: 256, salt: salt.toString('base64'),
  version: randomUUID(), verifier: pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('base64'),
};
const waitForTabFocus = (page, id) => page.waitForFunction(id => {
  const element = document.getElementById(id);
  return element === document.activeElement && element?.getAttribute('aria-selected') === 'true';
}, id, { timeout: 2500 });

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.RELALIA_BROWSER_CHANNEL || 'chrome', headless: true });
try {
  for (const width of [320, 390, 768, 801, 1440]) {
    const mobile = width <= 800;
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    await context.route('**/*', async request => {
      const url = new URL(request.request().url());
      if (url.origin !== origin) return request.abort();
      if (url.pathname === '/access-config.json') return request.fulfill({ json: configuration });
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(archive, `.${pathname}`, ...(pathname.endsWith('/') ? ['index.html'] : []));
      if (!file.startsWith(archive + path.sep)) return request.abort();
      try {
        return await request.fulfill({ body: await readFile(file), contentType: mime[path.extname(file)] ?? 'application/octet-stream' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return request.fulfill({ status: 404 });
      }
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + route + manualHash);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    const heading = page.getByRole('heading', { name: title, exact: true });
    await heading.waitFor();
    assert.equal(await page.title(), title);
    assert(await heading.evaluate(element => {
      const firstLine = getComputedStyle(element);
      const nextLine = getComputedStyle(element.querySelector('.report-title-line'));
      return nextLine.fontSize === firstLine.fontSize && nextLine.fontWeight === firstLine.fontWeight;
    }), `Title lines use different type sizes or weights at ${width}px`);
    const tablist = page.getByRole('tablist', { name: 'Relatórios da edição' });
    const summaryTab = tablist.getByRole('tab', { name: 'Resumo da semana' });
    const manualTab = tablist.getByRole('tab', { name: 'Teste jurídico cartorário manual' });
    const summaryPanel = page.locator('#resumo-da-semana');
    const manualPanel = page.locator('#teste-manual-cartorario');
    const manual = page.getByRole('region', { name: 'Teste jurídico cartorário manual' });
    await manual.waitFor();
    await waitForTabFocus(page, 'teste-manual-cartorario-tab');
    assert(await summaryPanel.isHidden());
    const [left, right] = await Promise.all([summaryTab.boundingBox(), manualTab.boundingBox()]);
    assert(left && right && Math.abs(left.y - right.y) < 1 && Math.abs(left.width - right.width) < 1 &&
      left.height >= 44 && left.height === right.height && right.x >= left.x + left.width && right.x + right.width <= width,
      `Tabs are not aligned side by side at ${width}px`);

    assert.deepEqual(await manual.locator('.manual-legal-scores dd').allInnerTexts(), ['4,53 / 10', '6,60 / 10', '8 / 10 perguntas\n2 empates em nota']);
    assert.deepEqual(await manual.locator('.manual-legal-incident strong').allTextContents(), ['8', '3', '3', '4', '2', '2', '0', '3']);
    assert.equal(await manual.locator('.manual-legal-actions li').count(), 7);
    assert.equal(await manual.locator('details').count(), 10);
    assert.equal(await manual.locator('details[open]').count(), 0);
    const bars = await manual.locator('.manual-legal-track').evaluateAll(tracks => tracks.map(track => [
      track.getBoundingClientRect().width, track.firstElementChild.getBoundingClientRect().width,
    ]));
    for (const [index, count] of [8, 3, 3, 4, 2, 2, 0, 3].entries()) {
      assert(bars[index][0] > 0 && Math.abs(bars[index][0] * count / 10 - bars[index][1]) < 1, `Incorrect bar ${index} at ${width}px`);
    }
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/manual-${width}.png` });
    }
    const critical = manual.locator('details').nth(7);
    await critical.locator('summary').focus();
    await page.keyboard.press('Enter');
    await critical.getByText('o silêncio do notificado é discordância', { exact: false }).waitFor();
    assert.equal(await manual.locator('details[open]').count(), 1);
    if (width === 390 || width === 1440) await critical.screenshot({ path: `${output}/critical-${width}.png` });

    await summaryTab.click();
    await page.waitForURL(`**/${summaryHash}`);
    assert(await manualPanel.isHidden());
    assert.equal(await summaryTab.getAttribute('aria-selected'), 'true');
    assert.equal(await manualTab.getAttribute('tabindex'), '-1');
    assert.equal(await summaryPanel.locator('.meta .tag').last().innerText(), '3 benchmarks · 30 embates comparáveis');
    const outcomes = summaryPanel.locator('.weekly-values tbody tr');
    assert.equal(await outcomes.count(), 6);
    const deepSeek = outcomes.filter({ hasText: 'DeepSeek V4.1 Flash' });
    assert.deepEqual(await deepSeek.filter({ hasText: 'Ágil' }).getByRole('cell').allTextContents(),
      ['DeepSeek V4.1 Flash venceu', '2–0–3', '7,20 × 6,80', '5/5']);
    assert.deepEqual(await deepSeek.filter({ hasText: 'Pleno' }).getByRole('cell').allTextContents(),
      ['Empate', '2–1–2', '8,80 × 6,00', '5/5']);
    assert.equal(await summaryPanel.locator('.weekly-sources a').count(), 3);
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/summary-${width}.png` });
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `Summary overflows at ${width}px`);

    await summaryTab.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForURL(`**/${manualHash}`);
    await waitForTabFocus(page, 'teste-manual-cartorario-tab');
    assert(await summaryPanel.isHidden());
    assert.equal(await critical.getAttribute('open'), '');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `Manual overflows at ${width}px`);
    await page.keyboard.press('Home');
    await waitForTabFocus(page, 'resumo-da-semana-tab');
    await page.keyboard.press('End');
    await waitForTabFocus(page, 'teste-manual-cartorario-tab');
    await page.goBack();
    await waitForTabFocus(page, 'resumo-da-semana-tab');
    await page.goForward();
    await waitForTabFocus(page, 'teste-manual-cartorario-tab');

    if (width === 1440) {
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      assert.equal(await manual.locator('details[open]').count(), 10);
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      assert.equal(await manual.locator('details[open]').count(), 1);
      assert.equal(await critical.getAttribute('open'), '');
      await page.pdf({ path: `${output}/weekly-print.pdf`, preferCSSPageSize: true });
      await page.goto(`${origin}/relatorios/resumo-benchmarks-vadechat-2026-11-06/`);
      await page.getByRole('heading', { name: 'Notas médias por rodada' }).waitFor();
      assert.equal(await page.locator('.manual-legal').count(), 0);
      assert.equal(await page.getByRole('tablist').count(), 0);
      assert.equal(await page.locator('.weekly-values tbody tr').count(), 6);
      await page.goto(origin);
      await page.getByRole('tab', { name: 'Resumo da semana', selected: true }).waitFor();
    }
    await page.goto(origin + route);
    await page.getByRole('tab', { name: 'Resumo da semana', selected: true }).waitFor();
    assert(await manualPanel.isHidden());
    await manualTab.click();
    await page.waitForURL(`**/${manualHash}`);
    await page.reload();
    await waitForTabFocus(page, 'teste-manual-cartorario-tab');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${width}px: equal tabs, exclusive panels, results, keyboard, history and deep link verified.`);
  }
} finally {
  await browser.close();
}
