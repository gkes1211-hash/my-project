// 내 컴퓨터용 실행 서버 검사 (실제로 포트를 열지 않고 요청 처리만 확인)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler, resolvePath } from '../scripts/serve.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function request(url) {
  return new Promise((resolve) => {
    const res = {
      status: 0,
      headers: {},
      writeHead(s, h = {}) { this.status = s; this.headers = h; },
      end(body) { resolve({ status: this.status, headers: this.headers, body: String(body ?? '') }); },
    };
    createHandler(ROOT)({ url }, res);
  });
}

test('첫 화면과 스크립트를 알맞은 형식으로 보낸다', async () => {
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers['Content-Type'], /text\/html/);
  assert.match(home.body, /5학년 2학기 수학/);
  const js = await request('/js/app.js');
  assert.equal(js.status, 200);
  assert.match(js.headers['Content-Type'], /javascript/);
});

test('없는 파일은 404, 프로젝트 밖은 막는다', async () => {
  assert.equal((await request('/nope.js')).status, 404);
  assert.equal((await request('/../../etc/passwd')).status, 403);
  assert.equal(resolvePath(ROOT, '/%2e%2e/secret'), null);
});
