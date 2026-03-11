"""SessionStart hook: instructs Claude to read all .claude/rules/*.md files."""

import glob
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
rules_dir = os.path.join(script_dir, "..", "rules")
rules_dir = os.path.normpath(rules_dir)

md_files = sorted(glob.glob(os.path.join(rules_dir, "*.md")))

if not md_files:
    sys.exit(0)

print("Read the following rule files before proceeding:\n")
for filepath in md_files:
    print(f"- {os.path.relpath(filepath, os.path.join(script_dir, '..', '..')).replace(os.sep, '/')}")
