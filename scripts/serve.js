// 내 컴퓨터에서 앱을 열어 보기 위한 아주 작은 웹 서버. (설치할 것 없음, Node.js만 있으면 됨)
// 실행: npm start  →  브라우저에서 http://localhost:8000 열기
// 끄기: 터미널에서 Ctrl + C
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

// 요청 주소를 프로젝트 안의 파일 경로로 바꾼다. 프로젝트 밖은 null.
export function resolvePath(root, urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(root, '.' + p);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

export function createHandler(root = ROOT) {
  return (req, res) => {
    const file = resolvePath(root, req.url);
    if (!file) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('파일을 찾을 수 없어요');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8000;
  http.createServer(createHandler()).listen(port, '127.0.0.1', () => {
    console.log('');
    console.log('  수학 앱이 켜졌어요!');
    console.log(`  브라우저에서 이 주소를 여세요 →  http://localhost:${port}`);
    console.log('  끄려면 이 창에서 Ctrl + C 를 누르세요.');
    console.log('');
  });
}
