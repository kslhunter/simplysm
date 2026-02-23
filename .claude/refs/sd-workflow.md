# Workflow Rules

- **No auto-proceeding after skill completion**: When the user explicitly invokes a skill, report the result and **stop** once the skill finishes. Do not guess the next step and proceed arbitrarily. Wait for explicit user instructions if further work is needed.
  - **Exception — yolo mode**: When a skill explicitly defines a "yolo mode" that chains multiple skills sequentially (e.g., sd-plan's "Path A: yolo"), auto-proceeding is permitted for the duration of that chain. Each step MUST still be invoked via the Skill tool.

## Problem-Solving Principles

- **Root cause first**: When encountering errors or unexpected behavior, always investigate the root cause before attempting a fix. Do not apply workarounds, hacks, or surface-level patches.
- **No band-aid fixes**: Avoid techniques like suppressing errors, adding defensive checks to hide symptoms, or bypassing validation. These mask the real problem and create technical debt.
- **Consider refactoring**: If the root cause reveals a design flaw or structural issue, propose a refactoring approach rather than working around it. A proper fix — even if larger in scope — is better than a fragile workaround.
- **Trace the full chain**: Follow the error or issue through the entire call chain (caller -> callee -> dependencies) to understand why it happens, not just where it happens.
- **When uncertain, ask**: If the root cause is unclear or the fix requires significant changes, discuss with the user before proceeding. Present findings and options rather than silently applying a quick fix.

## Pre-coding Checklist

- Before creating new files: Glob/Read similar existing files to check structure and patterns
- Before modifying functions/classes: Read the file to understand existing code style
- When unsure about API/method usage: Check signatures in source code
- **If confidence is low, ask the user instead of writing code**

## Memory Policy

- **Do NOT use auto memory** (`~/.claude/projects/.../memory/`). It is environment-specific and does not persist across machines.
- All persistent knowledge belongs in `.claude/rules/` or project docs (committed to git).
