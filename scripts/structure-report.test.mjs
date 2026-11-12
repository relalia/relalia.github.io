import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('components/StructureReport.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports, require });
const markup = renderToStaticMarkup(React.createElement(module.exports.default));
const standalone = fs.readFileSync('public/reports/estrutura-vadechat-2026-11-12.html', 'utf8');

test('relatório nativo apresenta comparações e mantém protótipos isolados', () => {
  assert.match(markup, /Ampliar a área de conversa/);
  assert.match(markup, /Ampliar a grade de cards/);
  assert.equal((markup.match(/<figure>/g) ?? []).length, 4);
  const frames = [...markup.matchAll(/<iframe\b[^>]*>/g)].map(match => match[0]);
  assert.equal(frames.length, 2);
  assert.ok(frames.every(frame => /sandbox="allow-scripts/.test(frame) && /prototipo-/.test(frame)));
  assert.ok(!frames.some(frame => /src="\/reports\/estrutura-vadechat/.test(frame)));
});

test('imagens nativas preservam os quadros do relatório autocontido', () => {
  const embedded = [...standalone.matchAll(/<img\b[^>]*src="data:image\/jpeg;base64,([^"]+)"/g)].map(match => Buffer.from(match[1], 'base64'));
  const names = ['chat-servico.jpg', 'chat-proposta.jpg', 'giro-original.jpg', 'giro-proposta.jpg'];
  assert.equal(embedded.length, names.length);
  names.forEach((name, index) => {
    assert.ok(markup.includes(`/evidence/estrutura-2026-11-12/${name}`));
    assert.deepEqual(fs.readFileSync(`public/evidence/estrutura-2026-11-12/${name}`), embedded[index]);
  });
});

test('vídeo nativo corresponde à gravação original registrada', () => {
  const path = '/originals/evidence/estrutura-2026-11-12/comparacao-chat.mp4';
  assert.ok(markup.includes(path));
  const hash = createHash('sha256').update(fs.readFileSync(`public${path}`)).digest('hex');
  assert.equal(hash, '818c7d7115918fda8b7d6798d5a3a1b0561b9928cdb514d9a21f342d7221fcf1');
  const manifest = JSON.parse(fs.readFileSync('content/originals.sha256.json', 'utf8'));
  assert.equal(manifest.find(entry => entry.path === path)?.sha256, hash);
});
