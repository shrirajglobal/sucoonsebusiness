#!/bin/bash
set -euo pipefail

# Only relevant for Claude Code on the web / remote sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# GH_PUSH_TOKEN must be set as a persistent environment variable on the
# Claude Code environment (Environment settings -> Environment variables),
# not pasted into chat. If it's not set, leave git auth as the platform
# default and do nothing.
if [ -n "${GH_PUSH_TOKEN:-}" ]; then
  git remote set-url origin "https://${GH_PUSH_TOKEN}@github.com/shrirajglobal/sucoonsebusiness.git"
fi
