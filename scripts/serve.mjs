import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('out');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.mp4':'video/mp4', '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain' };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  const target = path.resolve(root, `.${pathname}`, 'index.html');
  const file = pathname.endsWith('/') ? target : path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
  const selected = fs.existsSync(file) && fs.statSync(file).isFile() ? file : fs.existsSync(path.join(file, 'index.html')) ? path.join(file, 'index.html') : null;
  if (!selected) { response.writeHead(404).end('Not found'); return; }
  const type = mime[path.extname(selected)] || 'application/octet-stream';
  response.setHeader('Content-Type', /^(text\/|application\/javascript)/.test(type) ? `${type}; charset=utf-8` : type);
  const size = fs.statSync(selected).size;
  response.setHeader('Accept-Ranges','bytes');
  if(request.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : size-1;
    if(match && !match[1] && match[2]) {start=Math.max(0,size-Number(match[2]));end=size-1;}
    if(!match || start> end || start>=size || end>=size) {response.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
    response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});
    if(request.method==='HEAD') response.end();else fs.createReadStream(selected,{start,end}).pipe(response);
    return;
  }
  response.setHeader('Content-Length',size);
  if(request.method==='HEAD') {response.end();return;}
  fs.createReadStream(selected).pipe(response);
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
