const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildReviewPrompt } = require('./review-prompt');

const validArgs = {
  skillText: '# Code Review Skill\nSMELL BASELINE: Mysterious Name, Duplicated Code.',
  branch: 'feature/push',
  baseBranch: 'main',
};

test('embeds the vendored skill text verbatim', () => {
  const prompt = buildReviewPrompt(validArgs);
  assert.ok(
    prompt.includes(validArgs.skillText),
    'prompt should contain the full skill text so the agent uses the methodology',
  );
});

test('targets the three-dot diff of the branch against its base', () => {
  const prompt = buildReviewPrompt(validArgs);
  assert.match(prompt, /git diff main\.\.\.feature\/push/);
});

test('names both the branch under review and the base branch', () => {
  const prompt = buildReviewPrompt(validArgs);
  assert.match(prompt, /feature\/push/);
  assert.match(prompt, /main/);
});

test('instructs the agent to emit its findings as text (no file edits)', () => {
  const prompt = buildReviewPrompt(validArgs).toLowerCase();
  // The provider returns the agent's text; the review must land in the message,
  // and the agent must not modify the checked-out code.
  assert.match(prompt, /do not (edit|modify|change)/);
  assert.ok(
    prompt.includes('review') && (prompt.includes('finding') || prompt.includes('report')),
    'prompt should ask for a review report of findings',
  );
});

test('throws a clear error when skill text is missing or empty', () => {
  assert.throws(() => buildReviewPrompt({ ...validArgs, skillText: '' }), /skill/i);
  assert.throws(() => buildReviewPrompt({ ...validArgs, skillText: undefined }), /skill/i);
});

test('throws when the branch or base branch is missing', () => {
  assert.throws(() => buildReviewPrompt({ ...validArgs, branch: '' }), /branch/i);
  assert.throws(() => buildReviewPrompt({ ...validArgs, baseBranch: undefined }), /base/i);
});
