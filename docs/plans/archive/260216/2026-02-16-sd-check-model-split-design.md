# sd-check Model Split Design

## Goal

Split sd-check skill to use haiku for running verification commands and opus for analyzing/fixing errors.

## Architecture

```
opus (main, SKILL.md model)
  │
  ├─ Environment Pre-check (opus, direct)
  │
  ├─ Parallel verification (3x haiku Task agents)
  │   ├─ haiku: pnpm typecheck [path]
  │   ├─ haiku: pnpm lint --fix [path]
  │   └─ haiku: pnpm vitest [path] --run
  │
  ├─ Collect results → analyze errors (opus)
  │   ├─ Priority: typecheck → lint → test
  │   └─ Fix with Edit
  │
  └─ Re-verify loop (haiku agents again)
      └─ Repeat until all pass
```

## Changes to SKILL.md

1. `model: sonnet` → `model: opus`
2. Code Verification section rewritten:
   - Step 1: Launch 3 haiku Task agents in parallel (`subagent_type: Bash`, `model: haiku`)
   - Step 2: opus analyzes all errors, fixes code (typecheck priority)
   - Step 3: Re-run Step 1, repeat until clean
3. Test failure logic preserved (git diff check for intentional changes)

## Agent Design

- haiku agents: Run command, return full raw output, no analysis
- opus (main): Read files, analyze root cause, Edit fixes
- Re-verification: All 3 checks re-run each cycle (fixes may affect other checks)
