// Promptfoo custom provider that runs a coding agent (Claude Code or Codex) as a
// PR reviewer. The agent reviews the diff of the branch under review in the
// shared, read-only ./xke-pwa checkout (cloned once by `npm run setup:review`)
// using the vendored code-review skill, and the provider returns the agent's
// review TEXT as its output. The four llm-rubric assertions in
// promptfooconfig.review.yaml then judge that text, one per planted comment.
//
// Configured (four times) from promptfooconfig.review.yaml via:
//   - id: file://providers/agent.js
//     label: <human label>
//     config: { agent: 'claude' | 'codex', model: '<model id>' }

const path = require('node:path');

const { assertRepoReady } = require('../src/repo');
const { buildReviewPrompt, loadSkill } = require('../src/review-prompt');

const AGENT_TIMEOUT_MS = 300_000;
const REPO_DIR = path.resolve(process.cwd(), process.env.REVIEW_REPO_DIR || 'xke-pwa');
const REVIEW_BRANCH = process.env.REVIEW_BRANCH || 'feature/push';
const REVIEW_BASE_BRANCH = process.env.REVIEW_BASE_BRANCH || 'main';

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

  async callApi() {
    if (this.agent !== 'claude' && this.agent !== 'codex') {
      return { error: `unknown agent "${this.agent}" (expected "claude" or "codex")` };
    }

    let prompt;
    try {
      // Fail fast with a clear message if the checkout is missing.
      assertRepoReady(REPO_DIR);
      prompt = buildReviewPrompt({
        skillText: loadSkill(),
        branch: REVIEW_BRANCH,
        baseBranch: REVIEW_BASE_BRANCH,
      });
    } catch (err) {
      return { error: err.message };
    }

    try {
      const runner = this.agent === 'claude' ? runClaude : runCodex;
      // The agents run in the shared, read-only checkout; the prompt forbids
      // edits. The output IS the review text, which the assertions grade.
      const { resultText, cost } = await runner({
        prompt,
        model: this.model,
        reasoningEffort: this.reasoningEffort,
        dir: REPO_DIR,
      });
      return { output: resultText, cost, metadata: { repoDir: REPO_DIR } };
    } catch (err) {
      return { error: `${this.agent} run failed: ${err.message}` };
    }
  }
}

module.exports = AgentProvider;
