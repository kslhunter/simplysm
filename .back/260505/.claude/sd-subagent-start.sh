#!/bin/bash
if [ -f "CLAUDE.md" ]; then
  echo "Project instructions from CLAUDE.md (auto-injected because subagent context omits it):"
  echo
  cat CLAUDE.md
fi
