// Builds the code-review prompt injected into both agents (Claude Code and
// Codex). It embeds the vendored code-review skill verbatim, pins the fixed
// point to the PR's base branch, and asks the agent to review the three-dot
// diff and emit its findings as text without touching the checked-out code.
//
// Pure function: no I/O, no clock — so it is unit-testable in isolation.

const fs = require('node:fs');
const path = require('node:path');

const SKILL_PATH = path.resolve(__dirname, '..', 'skills', 'code-review', 'SKILL.md');

function loadSkill(skillPath = SKILL_PATH) {
  return fs.readFileSync(skillPath, 'utf8');
}

function buildReviewPrompt({ skillText, branch, baseBranch } = {}) {
  if (!skillText || !skillText.trim()) {
    throw new Error('buildReviewPrompt: skillText is required (the vendored code-review skill)');
  }
  if (!branch) {
    throw new Error('buildReviewPrompt: branch is required (the PR branch under review)');
  }
  if (!baseBranch) {
    throw new Error('buildReviewPrompt: baseBranch is required (the fixed point to diff against)');
  }

  const diffCommand = `git diff ${baseBranch}...${branch}`;

  return [
    'You are reviewing a pull request. Apply the code-review skill below as your methodology.',
    '',
    'The repository is already checked out in your current working directory, with the',
    `branch under review (\`${branch}\`) checked out. The fixed point for the review is the`,
    `base branch \`${baseBranch}\`.`,
    '',
    `Use \`${diffCommand}\` (three-dot, against the merge-base) as the diff to review, and`,
    `\`git log ${baseBranch}..${branch} --oneline\` for the commit list.`,
    '',
    'Rules for this run:',
    '- This is a read-only review. Do NOT edit, modify, or change any files in the checkout.',
    '- Do NOT commit, push, or create branches.',
    '- Produce your full review as your final text message — it is the only output that is captured.',
    '  Report your findings clearly, citing the file and location for each one.',
    '',
    '--- BEGIN CODE-REVIEW SKILL ---',
    skillText,
    '--- END CODE-REVIEW SKILL ---',
  ].join('\n');
}

module.exports = { buildReviewPrompt, loadSkill, SKILL_PATH };
