/* Ejecuta tests/indexdb.test.html en Edge headless real y muestra los resultados.
   Usa el protocolo DevTools (CDP) vía WebSocket para esperar a que la suite
   termine (los flagas --timeout / --virtual-time-budget no fiabilizan IndexedDB).

   Uso: node tests/run-browser.js */
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APP_DIR = path.resolve(__dirname, '..');
const EDGE = process.env.CC_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(dir, p);
      try {
        if (!file.startsWith(dir) || !fs.statSync(file).isFile()) throw new Error('nf');
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
      } catch (e) {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let seq = 0;
const pending = new Map();

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error('WebSocket: ' + (e.message || 'error')));
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      }
    };
  });
}

function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
  });
}

async function evaluate(ws, expression) {
  const res = await send(ws, 'Runtime.evaluate', { expression: expression, returnByValue: true });
  if (res.exceptionDetails) throw new Error('evaluate: ' + (res.exceptionDetails.text || 'exception'));
  return res.result ? res.result.value : undefined;
}

async function main() {
  const server = await startServer(APP_DIR, 0);
  const HTTP_PORT = server.address().port;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-edge-'));
  const url = 'http://127.0.0.1:' + HTTP_PORT + '/tests/indexdb.test.html';
  console.log('Edge: ' + EDGE);
  console.log('URL : ' + url);

  /* Puerto CDP dinámico: DevTools escribe DevToolsActivePort en el perfil */
  const edge = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    '--remote-debugging-port=0',
    '--user-data-dir=' + userData,
    url
  ], { stdio: 'ignore' });

  edge.on('error', (e) => {
    console.error('No se pudo lanzar Edge:', e.message);
    server.close();
    process.exit(2);
  });

  let page;
  try {
    const portFile = path.join(userData, 'DevToolsActivePort');
    let dbgPort = null;
    for (let i = 0; i < 80; i++) {
      try {
        if (fs.existsSync(portFile)) {
          dbgPort = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
          break;
        }
      } catch (e) { /* reintentar */ }
      await sleep(250);
    }
    if (!dbgPort) throw new Error('Edge no abrió el puerto de depuración (' + portFile + ').');
    let targets = [];
    for (let i = 0; i < 40; i++) {
      try {
        targets = await fetchJson('http://127.0.0.1:' + dbgPort + '/json');
        if (targets.length) break;
      } catch (e) { /* aún arrancando */ }
      await sleep(250);
    }
    page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('No se encontró el target de la página.');
  } catch (e) {
    console.error('Fallo al conectar con el depurador:', e.message);
    edge.kill();
    server.close();
    process.exit(2);
  }

  const ws = await connect(page.webSocketDebuggerUrl);
  await send(ws, 'Runtime.enable');
  await send(ws, 'Page.enable');

  let state = '';
  let lines = '';
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await sleep(250);
    try {
      const val = await evaluate(ws,
        'JSON.stringify({ t: document.title, r: document.getElementById("results") ? document.getElementById("results").textContent : "" })');
      if (val) {
        const o = JSON.parse(val);
        state = o.t;
        lines = o.r;
        if (state === 'PASS' || state === 'FAIL') break;
      }
    } catch (e) { /* página recargando */ }
  }

  if (lines) console.log(lines);
  else console.log('No se obtuvieron resultados de la suite.');
  console.log('\nESTADO DEL TÍTULO: ' + (state || '?'));

  edge.kill();
  server.close();
  process.exit(state === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e && e.stack ? e.stack : e);
  process.exit(3);
});
