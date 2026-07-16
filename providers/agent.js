// Promptfoo custom provider that runs a coding agent (Claude Code or Codex)
// inside a fresh, empty working directory and returns that directory's absolute
// path as the provider output. The hello-world assertion then grades the files
// the agent left behind, and the afterEach hook in hooks.js cleans the dir up.
//
// Configured (four times) from promptfooconfig.hello-world.yaml via:
//   - id: file://providers/agent.js
//     label: <human label>
//     config: { agent: 'claude' | 'codex', model: '<model id>' }

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const AGENT_TIMEOUT_MS = 120_000;
const RUNS_DIR = path.resolve(process.cwd(), 'runs');

function makeRunDir(agent, model) {
  const slug = String(model).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const dir = path.join(RUNS_DIR, `${agent}-${slug}-${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function runClaude({ prompt, model, dir }) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), AGENT_TIMEOUT_MS);
  let resultText = '';
  let cost;
  try {
    for await (const message of query({
      prompt,
      options: {
        model,
        cwd: dir,
        abortController: ac,
        permissionMode: 'bypassPermissions',
        // Do not load the surrounding repo's CLAUDE.md / settings into the eval.
        settingSources: [],
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        tools: { type: 'preset', preset: 'claude_code' },
      },
    })) {
      if (message.type === 'result') {
        resultText = message.result ?? '';
        cost = message.total_cost_usd;
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return { resultText, cost };
}

async function runCodex({ prompt, model, reasoningEffort, dir }) {
  const { Codex } = await import('@openai/codex-sdk');
  // No apiKey: fall back to the Codex CLI's own auth (e.g. `codex login` /
  // ChatGPT account). Passing an undefined/stale key would override that.
  const codex = new Codex();
  const thread = codex.startThread({
    model,
    modelReasoningEffort: reasoningEffort,
    workingDirectory: dir,
    skipGitRepoCheck: true,
    sandboxMode: 'workspace-write',
    approvalPolicy: 'never',
    networkAccessEnabled: true,
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`agent timed out after ${AGENT_TIMEOUT_MS}ms`)), AGENT_TIMEOUT_MS),
  );
  const turn = await Promise.race([thread.run(prompt), timeout]);
  const finalMessage = turn.items
    ?.filter((i) => i.type === 'agent_message')
    .map((i) => i.text)
    .join('\n');
  return { resultText: finalMessage ?? '', cost: turn.usage?.total_cost_usd };
}

class AgentProvider {
  constructor(options = {}) {
    this.config = options.config || {};
    this.agent = this.config.agent;
    this.model = this.config.model;
    this.reasoningEffort = this.config.reasoningEffort;
    this.label = options.label;
    this.providerId = options.label || `${this.agent}:${this.model}`;
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt) {
    if (this.agent !== 'claude' && this.agent !== 'codex') {
      return { error: `unknown agent "${this.agent}" (expected "claude" or "codex")` };
    }
    const dir = makeRunDir(this.agent, this.model);
    try {
      const runner = this.agent === 'claude' ? runClaude : runCodex;
      const { resultText, cost } = await runner({
        prompt,
        model: this.model,
        reasoningEffort: this.reasoningEffort,
        dir,
      });
      // The output IS the working directory; the assertion grades its contents.
      return { output: dir, cost, metadata: { runDir: dir, agentSummary: resultText } };
    } catch (err) {
      // Return the dir too, so cleanup can still find it and the failure is
      // attributable, but surface the error so auth/timeout issues are visible.
      return { error: `${this.agent} run failed: ${err.message}`, output: dir, metadata: { runDir: dir } };
    }
  }
}

module.exports = AgentProvider;
