const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { assertRepoReady } = require('./repo');

let tmp;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-guard-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('returns the repo path when a .git directory is present', () => {
  const repo = path.join(tmp, 'xke-pwa');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  assert.equal(assertRepoReady(repo), repo);
});

test('throws a helpful setup message when the checkout is missing entirely', () => {
  const repo = path.join(tmp, 'xke-pwa');
  assert.throws(() => assertRepoReady(repo), (err) => {
    assert.match(err.message, /npm run setup:review/);
    assert.match(err.message, new RegExp(repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    return true;
  });
});

test('throws when the path exists but is not a git checkout', () => {
  const repo = path.join(tmp, 'xke-pwa');
  fs.mkdirSync(repo, { recursive: true });
  fs.writeFileSync(path.join(repo, 'README.md'), 'not a git repo');
  assert.throws(() => assertRepoReady(repo), /npm run setup:review/);
});
