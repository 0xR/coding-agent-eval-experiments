# Coding Agent Eval Experiments

A minimal [Promptfoo](https://www.promptfoo.dev/) project that runs without API keys. It uses Promptfoo's built-in `echo` provider so the initial evaluation is deterministic and suitable as a smoke test.

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
