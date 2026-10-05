import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('out');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf', '.png': 'image/png', '.txt': 'text/plain' };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  const target = path.resolve(root, `.${pathname}`, 'index.html');
  const file = pathname.endsWith('/') ? target : path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
  const selected = fs.existsSync(file) && fs.statSync(file).isFile() ? file : fs.existsSync(path.join(file, 'index.html')) ? path.join(file, 'index.html') : null;
  if (!selected) { response.writeHead(404).end('Not found'); return; }
  response.setHeader('Content-Type', `${mime[path.extname(selected)] || 'application/octet-stream'}; charset=utf-8`);
  fs.createReadStream(selected).pipe(response);
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
