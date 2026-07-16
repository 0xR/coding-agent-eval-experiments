// Promptfoo extension hook. Invoked as hook(hookName, context).
// After each test, delete the agent's working directory unless KEEP_RUNS is set
// (handy for inspecting a failed run). Cleanup runs even when the assertion
// failed, because the dir path lives in the result regardless of pass/fail.

const fs = require('node:fs');
const path = require('node:path');

const RUNS_DIR = path.resolve(process.cwd(), 'runs');

function runDirFromResult(result) {
  return (
    result?.response?.metadata?.runDir ||
    (typeof result?.response?.output === 'string' ? result.response.output : undefined)
  );
}

module.exports = async function hook(hookName, context) {
  if (hookName !== 'afterEach') return;
  if (process.env.KEEP_RUNS) return;

  const dir = runDirFromResult(context.result);
  if (!dir) return;

  // Safety: only ever remove directories inside ./runs.
  const resolved = path.resolve(dir);
  if (resolved === RUNS_DIR || !resolved.startsWith(RUNS_DIR + path.sep)) return;

  await fs.promises.rm(resolved, { recursive: true, force: true });
};
