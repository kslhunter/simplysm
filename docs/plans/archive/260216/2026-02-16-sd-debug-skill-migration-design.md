# sd-debug Skill Migration Design

## Summary

Migrate the `systematic-debugging` skill from [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) into `.claude/skills/sd-debug/`, adapted to this project's conventions.

## Source

- Repository: `obra/superpowers`
- Path: `skills/systematic-debugging/`
- Core methodology: 4-phase systematic debugging (Root Cause → Pattern Analysis → Hypothesis Testing → Implementation)

## Decisions

| Decision | Choice |
|----------|--------|
| Invocation method | Manual (`/sd-debug`) + auto-trigger from `sd-check` |
| Supporting files | All included (3 technique docs + example code + shell script) |
| External skill refs | Mapped to `sd-*` equivalents |

### Skill Reference Mapping

| Original | Mapped to |
|----------|-----------|
| `superpowers:test-driven-development` | `sd-tdd` |
| `superpowers:verification-before-completion` | `sd-check` |

### Expression Changes

- `your human partner` → `the user`

## File Changes

### Created (6 files)

| File | Description |
|------|-------------|
| `.claude/skills/sd-debug/SKILL.md` | Main skill — 4-phase debugging process |
| `.claude/skills/sd-debug/root-cause-tracing.md` | Technique: backward call-stack tracing |
| `.claude/skills/sd-debug/defense-in-depth.md` | Technique: 4-layer validation |
| `.claude/skills/sd-debug/condition-based-waiting.md` | Technique: condition-based waiting (replaces arbitrary timeouts) |
| `.claude/skills/sd-debug/condition-based-waiting-example.ts` | Code example for condition-based waiting |
| `.claude/skills/sd-debug/find-polluter.sh` | Shell script for test pollution bisection |

### Modified (2 files)

| File | Change |
|------|--------|
| `.claude/skills/sd-check/SKILL.md` | Add `/sd-debug` recommendation on difficult test failures |
| `.claude/skills/sd-use/SKILL.md` | Add `sd-debug` entry to skill catalog |

### Excluded from source

| File | Reason |
|------|--------|
| `CREATION-LOG.md` | Creation history, not needed |
| `test-academic.md` | Skill test scenario |
| `test-pressure-1.md` | Skill test scenario |
| `test-pressure-2.md` | Skill test scenario |
| `test-pressure-3.md` | Skill test scenario |

## SKILL.md Frontmatter

```yaml
---
name: sd-debug
description: Use when encountering any bug, test failure, or unexpected behavior. Enforces root-cause investigation before proposing fixes.
model: opus
---
```

## sd-check Integration

Add to "Step 2: Collect Results and Fix Errors" test failure section:

> **If test failures are difficult to diagnose** (root cause unclear, multiple failed attempts), recommend the user invoke `/sd-debug` for systematic root cause investigation before attempting more fixes.

## sd-use Integration

Add to Skills catalog table:

```
| `sd-debug` | Bug, test failure, unexpected behavior — **systematic root cause investigation** |
```
