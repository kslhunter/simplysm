# Remove sd-explore Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** sd-explore 스킬을 제거하고 sd-review의 Step 1을 내장 Explore 에이전트로 대체한다.

**Architecture:** sd-explore 폴더 삭제, sd-review Step 1을 Task(subagent_type=Explore)로 교체, sd-use 라우팅 테이블에서 항목 제거.

**Tech Stack:** Claude Code skills (Markdown)

---

### Task 1: Delete sd-explore skill

**Files:**
- Delete: `.claude/skills/sd-explore/SKILL.md`

**Step 1: Delete the skill folder**

```bash
rm -rf .claude/skills/sd-explore
```

**Step 2: Verify deletion**

```bash
ls .claude/skills/sd-explore 2>&1
```
Expected: "No such file or directory"

---

### Task 2: Update sd-review Step 1 to use built-in Explore

**Files:**
- Modify: `.claude/skills/sd-review/SKILL.md`

**Step 1: Replace Overview paragraph**

Replace line 12:
```
Analyzes code via the `sd-explore` skill, then runs up to 4 subagents in parallel for specialized review. Collects subagent results, verifies each finding against actual code, and writes the final report.
```
With:
```
Analyzes code via the built-in Explore agent, then runs up to 4 subagents in parallel for specialized review. Collects subagent results, verifies each finding against actual code, and writes the final report.
```

**Step 2: Replace Step 1 section (lines 50-66)**

Replace the entire "Step 1: Code Analysis via sd-explore" section with:

```markdown
### Step 1: Code Analysis via Explore Agent

Invoke the built-in Explore agent via the Task tool to analyze the target path:

```
Task(subagent_type=Explore)
Prompt: "very thorough" analysis of <target-path>:
- Entry points, core files, module boundaries
- Call chains, data transformations, state changes
- Abstraction layers, design patterns, dependency graph
- Error handling, public API surface
```

This runs in a **separate context**, so it does not consume the main context window.
```

**Step 3: Update "sd-explore analysis" references**

Replace all remaining "sd-explore analysis" text with "Explore analysis":
- Line 68: "Include the sd-explore analysis results" → "Include the Explore analysis results"
- Line 73: "If the sd-explore analysis reveals" → "If the Explore analysis reveals"
- Line 92: "sd-explore analysis" → "Explore analysis"

---

### Task 3: Remove sd-explore from sd-use routing table

**Files:**
- Modify: `.claude/skills/sd-use/SKILL.md`

**Step 1: Delete the sd-explore row from the Skills table**

Remove line 30:
```
| `sd-explore`         | Deep codebase analysis — tracing execution paths, architecture, dependencies                                                                    |
```

---
