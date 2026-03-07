# sd-skill Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Simplify sd-skill from 5 files (~760 lines) to 1 file (~80 lines) by leveraging sd-tdd as foundation.

**Architecture:** Rewrite SKILL.md with 3-section structure (Overview, Differences from Code TDD, SKILL.md Format), then delete 4 supporting files. Documentation-only change — no code logic, no tests needed.

**Tech Stack:** Markdown

---

### Task 1: Rewrite SKILL.md

**Files:**
- Modify: `.claude/skills/sd-skill/SKILL.md`

**Step 1: Rewrite SKILL.md with simplified content**

Replace the entire file with the new 3-section structure. The content must include:

**Section 1 — Overview (~3 lines):**
- One-line explanation: TDD applied to skill documents
- REQUIRED BACKGROUND: sd-tdd
- When to create a skill vs not (keep existing criteria, condensed)

**Section 2 — Differences from Code TDD (~35 lines):**
- TDD mapping table (Code TDD vs Skill TDD)
- Pressure scenario rules: MUST create situations where agent wants to violate (not academic questions). Combine 3+ pressure types.
- Pressure types table: Time, Sunk cost, Authority, Economic, Exhaustion, Social, Pragmatic
- One condensed example pressure scenario (the A/B/C choice from current `testing-skills-with-subagents.md:40-54`)
- Meta-testing: when agent fails despite skill, ask "how could the skill be written differently?" Three response types: ignored it → stronger principle, should have said X → add suggestion, didn't see section Y → improve organization
- Retrieval vs pressure test: pure reference skills need retrieval test only
- No `isolation: "worktree"` for subagents (one line)

**Section 3 — SKILL.md Format (~35 lines):**
- Frontmatter rules: `name` (letters/numbers/hyphens), `description` (MUST start with "Use when...", NEVER workflow summary)
- One BAD/GOOD description example pair
- Why workflow summary is dangerous (Claude follows description, skips skill body)
- Body structure template (Overview → When to Use → Core Pattern → Quick Reference → Common Mistakes)
- CSO essentials: search-friendly words, verb-first naming, gerunds
- File organization: single file default, supporting file only for 100+ lines reference or reusable tools

**Step 2: Verify line count**

Run: `wc -l .claude/skills/sd-skill/SKILL.md`
Expected: ~80 lines (between 60-100 is acceptable)

**Step 3: Commit**

```bash
git add .claude/skills/sd-skill/SKILL.md
git commit -m "refactor(sd-skill): simplify SKILL.md to 3-section structure"
```

---

### Task 2: Delete supporting files

**Files:**
- Delete: `.claude/skills/sd-skill/cso-guide.md`
- Delete: `.claude/skills/sd-skill/anthropic-best-practices.md`
- Delete: `.claude/skills/sd-skill/writing-guide.md`
- Delete: `.claude/skills/sd-skill/testing-skills-with-subagents.md`

**Step 1: Delete all 4 files**

```bash
git rm .claude/skills/sd-skill/cso-guide.md
git rm .claude/skills/sd-skill/anthropic-best-practices.md
git rm .claude/skills/sd-skill/writing-guide.md
git rm .claude/skills/sd-skill/testing-skills-with-subagents.md
```

**Step 2: Verify only SKILL.md remains**

Run: `ls .claude/skills/sd-skill/`
Expected: only `SKILL.md`

**Step 3: Commit**

```bash
git add -A .claude/skills/sd-skill/
git commit -m "refactor(sd-skill): remove 4 supporting files absorbed into SKILL.md"
```
