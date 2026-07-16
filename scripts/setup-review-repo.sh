#!/usr/bin/env bash
# Clone the repository under review once, out of band of promptfoo.
#
# Idempotent: if ./xke-pwa already exists it is left untouched (clone-once, no
# auto-refresh — delete the directory to force a fresh pull). Uses SSH; you need
# an SSH key registered with GitHub that can read git@github.com:xebia/xke-pwa.git.
set -euo pipefail

REPO_URL="git@github.com:xebia/xke-pwa.git"
BRANCH="${REVIEW_BRANCH:-feature/push}"
DEST="${REVIEW_REPO_DIR:-xke-pwa}"

if [ -d "${DEST}/.git" ]; then
  echo "✓ ${DEST} already present — leaving it untouched (delete it to re-clone)."
  echo "  On branch: $(git -C "${DEST}" rev-parse --abbrev-ref HEAD)"
  exit 0
fi

echo "Cloning ${REPO_URL} into ${DEST} ..."
git clone "${REPO_URL}" "${DEST}"

echo "Checking out ${BRANCH} ..."
git -C "${DEST}" checkout "${BRANCH}"

echo "✓ Ready. ${DEST} is on $(git -C "${DEST}" rev-parse --abbrev-ref HEAD)."
