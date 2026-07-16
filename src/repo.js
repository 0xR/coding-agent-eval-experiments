// Guard used by the review provider: fail fast, with a clear instruction, when
// the xke-pwa checkout the eval reviews is missing. Cloning is done out of band
// by `npm run setup:review` (scripts/setup-review-repo.sh), never here.

const fs = require('node:fs');
const path = require('node:path');

function assertRepoReady(repoPath) {
  const gitDir = path.join(repoPath, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error(
      `Review checkout not found at ${repoPath}. Run \`npm run setup:review\` first to clone xke-pwa.`,
    );
  }
  return repoPath;
}

module.exports = { assertRepoReady };
