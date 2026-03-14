---
name: sd-plan-dev
description: Used when requesting "execute plan", "sd-plan-dev", "implement plan", "run plan", etc.
---

# SD Plan Dev — Parallel Implementation Executor

Reads an implementation plan file, analyzes dependencies and file overlap between items, and executes independent items in parallel using subagents. Each subagent invokes `/sd-dev` to implement its item with TDD. After all items complete, runs a simplification pass on all changed code.

ARGUMENTS: Path to a `_plan.md` file (optional). If not provided, inferred from conversation context or asked.

---

## Step 1: Obtain Plan File

- Obtain the plan file path in the following priority order:
  1. **ARGUMENTS**: File path provided when invoking the skill
  2. **Current conversation**: Identify the most recently mentioned `_plan.md` file path
  3. **AskUserQuestion**: Ask "Which plan file should I execute? Please provide the file path."
- Read the plan file and parse all items with their `Depends on`, `Target files`, and `Acceptance Criteria` metadata.

---

## Step 2: Build Execution Graph

### 2-1. Parse Dependencies

For each item in the plan, extract:
- **Item number/name**
- **Depends on**: List of items that must complete before this item can start
- **Target files**: List of file paths this item will create or modify
- **Acceptance Criteria**: Verification statement list for the item

### 2-2. Determine Parallel Groups

An item is eligible for parallel execution when:
1. **All dependencies are resolved** (all items in `Depends on` have completed successfully)
2. **No file overlap** with any currently running item (no shared paths in `Target files`)

Group items into execution batches:
- **Batch 1**: All items with no dependencies and no file overlap with each other
- **Batch 2**: Items whose dependencies were in Batch 1, with no file overlap among themselves
- Continue until all items are scheduled

If two independent items share target files, they MUST run sequentially (add to separate batches).

---

## Step 3: Execute Items

### Execution Loop

For each batch:

1. **Launch parallel subagents**: For each item in the batch, launch an Agent with `run_in_background: true`.
   - Each subagent receives the full item description from the plan and invokes `/sd-dev` via the Skill tool, passing the item's task description, acceptance criteria, and target files as args.

2. **Wait for all subagents in the batch to complete.**

3. **Move to next batch**: Update the dependency graph (mark completed items) and launch the next eligible batch.

4. **Repeat** until all items are complete.

### Single-Item Optimization

If the plan has only 1 item, or all items are sequential (linear dependency chain), invoke `/sd-dev` directly without subagent overhead.

---

## Step 4: Simplification Pass

After all items are complete, run `/simplify` on all changed code to review for reuse, quality, and efficiency improvements.

---

## Step 5: Post-Completion Guidance

Output the following guidance. Include only the items whose conditions are met, numbered sequentially:

| Condition | Recommendation |
|-----------|----------------|
| Public API changed (exports, public methods/properties, component props, etc.) | `/sd-readme` — Update README documentation |
| Always | `/sd-commit` — Commit changes |

Example:
```
All items implemented successfully. Recommended next steps:
1. /sd-readme — Update README documentation
2. /sd-commit — Commit changes
```
