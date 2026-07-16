const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const START_TIMEOUT_MS = 30_000;

function runNpmStart(dir, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['start'], {
      cwd: dir,
      env: process.env,
      // Own process group so we can kill npm AND any grandchildren (e.g. a
      // server the agent spawned that would otherwise never exit).
      detached: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    const killGroup = () => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Group already gone.
      }
    };

    const timer = setTimeout(() => {
      killGroup();
      resolve({ timedOut: true, code: null, stdout, stderr });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ timedOut: false, code, stdout, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ timedOut: false, code: null, stdout, stderr: stderr + err.message });
    });
  });
}

function hasJsFile(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasJsFile(full)) return true;
    } else if (entry.name.endsWith('.js')) {
      return true;
    }
  }
  return false;
}

async function gradeProject(dir, { startTimeoutMs = START_TIMEOUT_MS } = {}) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return { pass: false, score: 0, reason: 'package.json is missing' };
  }

  if (!hasJsFile(dir)) {
    return { pass: false, score: 0, reason: 'no .js file found' };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    return { pass: false, score: 0, reason: `package.json is not valid JSON: ${err.message}` };
  }
  if (!pkg.scripts || typeof pkg.scripts.start !== 'string') {
    return { pass: false, score: 0, reason: 'no start script defined in package.json' };
  }

  const run = await runNpmStart(dir, startTimeoutMs);
  // Normalize: lowercase and collapse any run of non-alphanumerics to a single
  // space, so "Hello, World!" matches "hello world".
  const output = (run.stdout + run.stderr).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  if (run.timedOut) {
    return {
      pass: false,
      score: 0,
      reason: `npm start did not exit within ${startTimeoutMs}ms`,
    };
  }
  if (run.code !== 0) {
    return {
      pass: false,
      score: 0,
      reason: `npm start exited with code ${run.code}`,
    };
  }
  if (!output.includes('hello world')) {
    return {
      pass: false,
      score: 0,
      reason: 'npm start did not print "hello world"',
    };
  }

  return { pass: true, score: 1, reason: 'npm start printed "hello world" and exited cleanly' };
}

module.exports = { gradeProject };
