const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gradeProject } = require('./grader');

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grader-test-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

test('passes a valid hello world project', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'node index.js' } }),
    'index.js': "console.log('hello world');",
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, true, result.reason);
});

test('fails when package.json is missing', async () => {
  const dir = makeProject({ 'index.js': "console.log('hello world');" });
  const result = await gradeProject(dir);
  assert.equal(result.pass, false);
  assert.match(result.reason, /package\.json/);
});

test('fails when there is no .js file', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'echo hello world' } }),
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, false);
  assert.match(result.reason, /\.js/);
});

test('fails when the start script is not defined', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw' }),
    'index.js': "console.log('hello world');",
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, false);
  assert.match(result.reason, /start/);
});

test('fails when npm start does not print hello world', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'node index.js' } }),
    'index.js': "console.log('goodbye');",
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, false);
  assert.match(result.reason, /hello world/i);
});

test('fails when npm start exits with a non-zero code', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'node index.js' } }),
    'index.js': "console.log('hello world'); process.exit(1);",
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, false);
  assert.match(result.reason, /code 1/);
});

test('fails (strict) when npm start prints hello world but never exits', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'node index.js' } }),
    'index.js': "console.log('hello world'); setInterval(() => {}, 1000);",
  });
  const result = await gradeProject(dir, { startTimeoutMs: 1500 });
  assert.equal(result.pass, false);
  assert.match(result.reason, /did not exit/);
});

test('passes with different casing and punctuation', async () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ name: 'hw', scripts: { start: 'node index.js' } }),
    'index.js': "console.log('Hello, World!');",
  });
  const result = await gradeProject(dir);
  assert.equal(result.pass, true, result.reason);
});
