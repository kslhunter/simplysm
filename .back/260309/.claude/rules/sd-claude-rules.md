# Claude Code Rules

## Language

Respond in the **system-configured language** (Claude Code's language setting).

- Keep technical terms, code identifiers (variable names, function names, etc.), and library names in their original form
- Display English error messages and logs as-is, but provide explanations in the system language

## Common Principles for All Tasks

- During analysis, never check `past history` or `.back` folders — analyze only the current base.
- When spawning subagents (Agent tool), the prompt **must** instruct the agent to read all `.md` files in `.claude/rules/` before starting work.
- If the user's request is ambiguous, you must ask the user via `AskUserQuestion`. Never guess and proceed.

## Missing References

If a referenced file or document cannot be found, **stop immediately and ask the user for the correct path.**

- Do not make your own judgment to skip or proceed.
- Always confirm with the user before proceeding.
- Bad example: "I couldn't find the file, so I'll skip it"
- Good example: "I cannot find the referenced file `X`. Please provide the correct path."

## Task Scope

**Only do what is explicitly requested.** Never perform unrequested work.

### Questions vs. Code Requests — Core Rule

- **When the user asks a question** (e.g., "Why is this like this?", "What is this?", "How does this work?") → **respond with text only**. Do not modify, write, or create files.
- **When the user shares discussion, explanation, or opinions** → **respond with text only**. Do not modify, write, or create files.
- **Only modify/write/create files when the user explicitly requests code changes** (e.g., "fix this", "create this", "change this", "add this").
- Reading files is always permitted.

> User: "How does this function work?"
> - Bad example: Refactor the function and modify the code
> - Good example: Explain the function's behavior in text

### General Rules

- When the user says "ask", "request", or "check" → **ask the user**. Do not decide or generate on your own.
- Do not add features, refactor, improve, or document beyond the requested scope.
- If unsure, **ask first** before proceeding.
- Bad example: "I'll create it myself", "I'll add that too"
- Good example: "I only modified the requested X. Let me know if you need anything else."

### Analysis and Comparison

- When performing analysis, comparison, diffing, or verification: **list every item without exception**. Do not provide superficial summaries — enumerate every difference, even minor ones.
  - Example: v12 vs v13 migration gap → list every API, type, and pattern difference item by item
  - Bad example: "Here are the 3 key differences..." / "They are mostly similar with some differences"
  - Good example: List every changed API, removed type, and added method one per line

## Worktree Rules

All git worktrees must be created in the **`.worktrees/`** directory (project root). Creating worktrees in any other location is prohibited.
- When using `isolation: "worktree"` in Agent tool calls, the worktree must be created in `.worktrees/`.
- **After work is complete, you must delete the worktree and its associated branch.** Do not leave worktrees behind.
- You must use the **`.claude/scripts/sd-worktree.py`** script to create/delete worktrees.

## Asking Clarification Questions

When you need to ask the user a question, you must use the `AskUserQuestion` tool. Do not ask questions in plain text.

- **Wrong:** Writing a question in the response text
- **Right:** Calling the `AskUserQuestion` tool

**Output `---` on the last line before every `AskUserQuestion` call.** The widget trims text above it. No exceptions.

## Memory Policy

- **Never use automatic memory** (`~/.claude/projects/.../memory/`). It is environment-dependent and does not persist across machines.
- All persistent knowledge belongs in `.claude/rules/` or project documentation (committed to git).


## Playwright

- Playwright MCP output directory: all output files (e.g., screenshots, snapshots, logs) must always be saved to the `.tmp/playwright/` directory.

## Workflow Rules

- **No auto-progression after skill completion**: When the user explicitly invokes a skill, report the result when the skill completes and **stop**. Never guess the next step and proceed arbitrarily. Wait for the user's explicit instruction if additional work is needed.
  - **Exception — yolo mode**: If a skill explicitly defines a "yolo mode" that chains multiple skills sequentially (e.g., sd-plan's "Path A: yolo"), auto-progression is allowed during that chain.

> After `/sd-plan` completes:
> - Bad example: "I'll proceed to run `/sd-plan-dev`" (auto-progression)
> - Good example: "Plan is complete. [result summary]" (report and stop)

## Troubleshooting Principles

- **Root cause first**: When encountering an error or unexpected behavior, you must investigate the root cause before attempting a fix. Do not apply workarounds, band-aids, or surface-level patches.
- **No band-aids**: Do not use techniques such as error suppression, adding defensive checks to hide symptoms, bypassing validation, or inflating timeout values. These methods hide real problems and create technical debt.
  - Bad example: `try { ... } catch { /* ignore */ }`, `timeout: 30000 → 60000`
  - Good example: Trace the error origin and fix it at the source, resolve the root cause of timeout overruns (e.g., slow queries)
- **Consider refactoring**: If the root cause reveals a design flaw or structural issue, suggest a refactoring approach rather than working around it. A proper fix is better than a fragile workaround, even if the scope is larger.
- **Trace the full call chain**: Follow the entire call chain (caller → callee → dependencies) to understand not just where an error occurs but why it occurs.
- **Ask when unsure**: If the root cause is unclear or the fix requires significant changes, discuss with the user before proceeding. Present findings and options rather than silently applying a quick fix.

## Pre-Coding Checklist

- Before creating a new file: use Glob/Read to check for similar existing files to understand structure and patterns
- Before modifying a function/class: read the file to understand the existing code style
- When unsure about API/method usage: verify the signature in source code
- **Always search the local codebase first.** Do not search the web or external documentation until you confirm the answer is not in the local code.
- **When confidence is low, ask the user rather than writing code**
