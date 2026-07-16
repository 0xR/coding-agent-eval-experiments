# Coding Agent Eval Experiments

A minimal [Promptfoo](https://www.promptfoo.dev/) project with smoke evaluations:

- A deterministic, credential-free evaluation using Promptfoo's built-in `echo` provider.
- An OpenAI Responses API evaluation using `gpt-4.1-mini` and `OPENAI_API_KEY` from `.env`.
- An Anthropic Messages API evaluation using `claude-haiku-4-5` and `ANTHROPIC_API_KEY` from `.env`.
- A **coding-agent** evaluation where Claude Code and Codex each build a Node.js hello-world project, graded on whether `npm start` prints "hello world". See [below](#run-the-coding-agent-evaluation).

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
```

## Run the evaluation

```bash
npm test
```

You can also run the equivalent explicit command:

```bash
npm run eval
```

Both tests should pass. Edit `promptfooconfig.yaml` to add prompts, providers, test variables, and assertions for real evaluations.

## Run the OpenAI evaluation

Create a local `.env` file containing your API key:

```dotenv
OPENAI_API_KEY=your_api_key_here
```

Then run:

```bash
npm run eval:openai
```

The `.env` file and Promptfoo's local state directory are ignored by Git. The OpenAI smoke test uses the Responses API and checks that the model follows an exact-output instruction.

## Run the Anthropic evaluation

Add your Anthropic API key to the local `.env` file:

```dotenv
ANTHROPIC_API_KEY=your_api_key_here
```

Then run:

```bash
npm run eval:anthropic
```

The Anthropic smoke test uses the Messages API (`claude-haiku-4-5`) and checks that the model follows an exact-output instruction. Edit `promptfooconfig.anthropic.yaml` to add your own prompts, providers, and assertions.

## Run the coding-agent evaluation

This eval asks four coding agents to build a Node.js hello-world project and grades the result:

- **Claude Code** (via `@anthropic-ai/claude-agent-sdk`) — `claude-opus-4-8` and `claude-haiku-4-5`
- **Codex** (via `@openai/codex-sdk`, using your `codex login` session) — `gpt-5.6-sol`
  at `high` and `low` reasoning effort

Each agent runs in its own empty directory under `runs/` and gets the same prompt:

> Create a Node.js 'hello world' project in the current directory. It should be
> runnable with `npm start`, which should print hello world to the console.

The grader (`src/grader.js`) enforces a strict contract on whatever the agent left behind:

1. `package.json` exists
2. at least one `.js` file exists
3. a `start` script is defined
4. `npm start` prints "hello world" (case-insensitive) **and exits 0 within 30s**
   — a process that never exits is a failure

Claude Code authenticates with `ANTHROPIC_API_KEY` from `.env`; Codex uses your
existing `codex login` session (run `codex login status` to check):

```dotenv
ANTHROPIC_API_KEY=your_api_key_here
```

Then run:

```bash
npm run eval:agents
```

Each run directory is deleted afterward by the `afterEach` hook in `hooks.js`. To
keep them for inspection, set `KEEP_RUNS=1`:

```bash
KEEP_RUNS=1 npm run eval:agents
```

The grader has its own fast, offline unit tests (no API keys, no agents):

```bash
npm run test:grader
```

> **Note:** a Codex **ChatGPT account** only exposes a limited set of models
> (here `gpt-5.6-sol`, the CLI default), so the Codex tiers vary **reasoning
> effort** (`high` vs `low`) rather than the model. Model ids and supported
> effort levels are account-specific — adjust them in
> `promptfooconfig.hello-world.yaml` if the Codex CLI rejects them.
