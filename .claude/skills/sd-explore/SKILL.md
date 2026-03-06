---
name: sd-explore
description: "Use when analyzing a large codebase (30+ files) that must be read comprehensively. Splits files into groups and dispatches parallel sub-agents to avoid context compaction and information loss."
---

# sd-explore

## Overview

Split a large codebase into manageable groups and dispatch parallel sub-agents, each reading its assigned files and writing results to disk. The calling skill then reads result files instead of raw source — no context compaction, no information loss.

**Core principle:** Never read 30+ files in a single agent context. Split, parallelize, write to files.

**Important:** This is a workflow the **orchestrator (main agent)** follows directly. Do NOT delegate the entire sd-explore workflow to a sub-agent — only the orchestrator has `Agent` tool access to dispatch parallel sub-agents. The orchestrator globs files, splits groups, and dispatches `Agent(Explore)` calls itself.

## When to Use

- Codebase analysis covering 30+ source files
- Called by other skills (sd-review, sd-brainstorm, sd-debug, sd-plan) that need comprehensive file reading
- Any task where reading all files sequentially would risk context compaction

**When NOT to use:**
- < 30 files — a single agent can handle it directly
- Targeted search for a specific function/class — use Grep/Glob instead

## Input

The calling skill provides:

1. **Target path** — directory to explore (e.g., `packages/solid/src`)
2. **Output directory** — where to write result files (e.g., `.tmp/sd-review`)
3. **File patterns** — glob patterns to match (default: `**/*.ts`, `**/*.tsx`; exclude `node_modules`, `dist`)
4. **Analysis instructions** — free-form text describing what each sub-agent should do

The analysis instructions are passed verbatim to each sub-agent. They can request anything: tags, summaries, pattern searches, specific questions, etc.

## Workflow

### Step 1: Discover Files

Glob all matching files under the target path.

- **< 30 files**: Run a single `Agent(subagent_type=Explore)` with the analysis instructions. No splitting needed. Write result to `{output_dir}/explore.md`.
- **>= 30 files**: Proceed to Step 2.

### Step 2: Split Into Groups

Split files into groups of **~30 files each**.

**Splitting strategy:**

1. List all subdirectories under target
2. Group files by subdirectory, keeping each group around 30 files
3. If the target is mostly flat (few subdirectories), group by file proximity (alphabetical chunks)
4. Adjacent small directories can be merged into one group
5. A single large directory (40+ files) should be split into multiple groups

**Goal:** Balanced groups where related files stay together.

### Step 3: Dispatch Parallel Agents

Launch one `Agent(subagent_type=Explore)` per group, **all in a single message** for true parallelism.

Each agent receives:

```
You are exploring a section of a codebase. Read ALL assigned files and write your analysis to the output file.

**Assigned files:**
[list of file paths for this group]

**Analysis instructions:**
[caller's free-form instructions, passed verbatim]

**Output file:** {output_dir}/explore-{group_index}.md

Read every assigned file. Write your complete analysis to the output file. Do NOT skip files.
```

### Step 4: Return Result Paths

After all agents complete, return the list of output file paths to the calling skill.

The calling skill reads these files to get the analysis results — the main context stays clean.

## Output Format

Each sub-agent writes to its assigned output file. The format is determined by the caller's analysis instructions. If no specific format is requested, use:

```markdown
# Explore: [directory names]

## File Summaries
- `path/to/file.ts` — Brief description

## Analysis
[Results per the caller's instructions]
```

## Why Sub-Agents Matter

The value is **context isolation**, not just speed:

- **Without sub-agents**: Reading 100+ files in the main context causes compaction. Earlier file analyses get dropped, degrading quality of later analysis steps (review, planning, etc.)
- **With sub-agents**: Each sub-agent reads ~30 files in its own context, writes results to disk, and exits. The main context only reads the summary files — staying clean for subsequent work.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Delegating the entire workflow to a sub-agent | The orchestrator follows sd-explore directly — only it can dispatch parallel `Agent` calls |
| Reading all files in one agent | Split into groups of ~30, dispatch parallel agents |
| Not writing results to files | Each agent MUST write to its output file — this is what prevents context bloat |
| Groups too large (50+) | Keep groups around 30 files for reliable coverage |
| Groups too small (5-10) | Wastes agent overhead — merge small directories |
| Not passing analysis instructions verbatim | The caller's instructions go to each agent as-is |
| Running agents sequentially | Launch all agents in a single message for parallelism |
| Skipping Step 1 threshold check | < 30 files don't need splitting — avoid unnecessary overhead |
