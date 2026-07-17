# Coding Agent Eval Experiments

[Promptfoo](https://www.promptfoo.dev/) evaluations for coding agents.

- A deterministic, credential-free smoke eval using Promptfoo's built-in `echo` provider (`promptfooconfig.yaml`).
- A **PR code-review eval** where Claude Code and Codex review a real pull request and an LLM judge checks whether they find a set of planted issues (`promptfooconfig.review.yaml`).

## Requirements

- Node.js 20 or newer
- npm
- An SSH key registered with GitHub that can read `git@github.com:xebia/xke-pwa.git` (for the review eval)

## Setup

```bash
npm install
```

## Run the smoke evaluation

```bash
npm test
```

## The PR code-review evaluation

Four coding agents review **PR #622 "Add Push Messages"** (branch `feature/push`) of
[`xke-pwa`](https://github.com/xebia/xke-pwa) and an LLM judge grades whether each agent
surfaced the issues listed in [`pr-622-review-fixes.md`](./pr-622-review-fixes.md).

Agents under test (same matrix as the smoke agent evals):

- **Claude Code** (via `@anthropic-ai/claude-agent-sdk`) — `claude-opus-4-8` and `claude-haiku-4-5`
- **Codex** (via `@openai/codex-sdk`, using your `codex login` session) — `gpt-5.6-sol` at
  `high` and `gpt-5.6-luna` at `low` reasoning effort

Each agent is given the vendored [code-review skill](./skills/code-review/SKILL.md)
(from [mattpocock/skills](https://github.com/mattpocock/skills), external references
stripped) injected into its prompt, and reviews the `feature/push` diff.

### How it works

1. **Clone once, out of band.** `npm run setup:review` clones `xke-pwa` into `./xke-pwa`
   (git-ignored) and checks out `feature/push`. It is idempotent and does **not** auto-refresh —
   delete `./xke-pwa` to force a fresh clone.
2. **Review once per agent.** The custom provider (`providers/agent.js`) runs each agent once
   in the shared, read-only checkout with a prompt built by `src/review-prompt.js` (skill +
   three-dot diff against the base branch). The provider returns the agent's **review text**.
3. **Judge each planted issue.** The single review text is graded by **four `llm-rubric`
   assertions** — one per comment in `pr-622-review-fixes.md`. Each passes when the agent
   **identifies the problem and its location** (the exact fix wording is not required). The
   judge is pinned to `anthropic:messages:claude-haiku-4-5-20251001`.

### Run it

```bash
npm run setup:review   # once (or after deleting ./xke-pwa)
npm run eval:review
```

Claude Code and the LLM judge authenticate with `ANTHROPIC_API_KEY` from `.env`; Codex uses
your existing `codex login` session (check with `codex login status`):

```dotenv
ANTHROPIC_API_KEY=your_api_key_here
```

The base branch to diff against defaults to `main`. Override with env vars if needed:
`REVIEW_BRANCH`, `REVIEW_BASE_BRANCH`, `REVIEW_REPO_DIR`.

> **Note:** the Codex comparison uses account-specific model ids (`gpt-5.6-sol`,
> `gpt-5.6-luna`) through the Codex CLI's ChatGPT authentication. Adjust them in
> `promptfooconfig.review.yaml` if the Codex CLI rejects them.

## Unit tests

The pure logic behind the review eval (the prompt builder and the repo-ready guard) has fast,
offline unit tests — no API keys, no agents, no network:

```bash
npm run test:unit
```

## View results

```bash
npm run view
```
