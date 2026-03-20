#!/bin/bash
echo "Read the following rule files before proceeding:"
files=$(ls -1 .claude/rules/*.md 2>/dev/null)
if [ -n "$files" ]; then
  echo "$files" | while read f; do echo "- $f"; done
fi
echo
if [ -f "CLAUDE.md" ]; then
  echo "- CLAUDE.md"
fi