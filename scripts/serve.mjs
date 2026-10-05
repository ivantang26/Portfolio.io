import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

export function createPortfolioServer() {
  return http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      // Also emulate the repository subpath used by GitHub Pages.
      if (pathname === '/Portfolio.io') pathname = '/';
      else if (pathname.startsWith('/Portfolio.io/')) pathname = pathname.slice('/Portfolio.io'.length);
      if (pathname.split(/[\\/]/).some(part => part.startsWith('.') || part === 'node_modules') || pathname.includes('\0')) {
        response.writeHead(403); response.end('Forbidden'); return;
      }
      let file = path.resolve(root, '.' + pathname);
      const relative = path.relative(root, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403); response.end('Forbidden'); return; }
      let status = 200;
      try {
        if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
        await stat(file);
      } catch {
        status = 404;
        file = path.join(root, '404.html');
      }
      const content = await readFile(file);
      response.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(400); response.end('Bad request');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createPortfolioServer();
  server.listen(port, '127.0.0.1', () => console.log(`Portfolio: http://127.0.0.1:${port}\nGitHub Pages preview: http://127.0.0.1:${port}/Portfolio.io/`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
