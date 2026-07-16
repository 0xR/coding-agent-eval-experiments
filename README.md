# Coding Agent Eval Experiments

A minimal [Promptfoo](https://www.promptfoo.dev/) project with smoke evaluations:

- A deterministic, credential-free evaluation using Promptfoo's built-in `echo` provider.
- An OpenAI Responses API evaluation using `gpt-4.1-mini` and `OPENAI_API_KEY` from `.env`.
- An Anthropic Messages API evaluation using `claude-haiku-4-5` and `ANTHROPIC_API_KEY` from `.env`.

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
