import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = normalize(process.cwd());
const PORT = Number(process.env.PORT || 8137);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};

createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = p === '/' ? '/casa-3d.html' : p;
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const buf = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'content-length': String(buf.length),
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`SERVER_READY http://localhost:${PORT}/casa-3d.html`);
});
