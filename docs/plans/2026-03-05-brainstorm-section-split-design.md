# Brainstorm Section Split Design

## Overview

sd-brainstorm SKILL.md to support section-based splitting for large designs. When Claude judges a design is large, it proposes splitting into a main design + per-section sub-designs, enabling each section to go through its own brainstorm → plan → plan-dev cycle independently (potentially across different Claude sessions).

## Changes

**File:** `.claude/skills/sd-brainstorm/SKILL.md` (only file modified)

No changes to sd-plan, sd-plan-dev, or any other skills.

## Design

### 1. Scale Assessment (new step)

Insert between "Presenting the design" and "After the Design":

- After design presentation is complete, Claude assesses the scale
- Judgment criteria: estimated file count, logic complexity, scope of impact (no hard numeric threshold — Claude's holistic judgment)
- If large → propose split to user with two choices: "proceed as-is" or "split into sections"
- If small → proceed to existing Path A/B flow unchanged

### 2. Section Division Proposal

When user chooses "split into sections":

1. Claude proposes 2-3 section division approaches (e.g., "by feature", "by layer", "by dependency order")
2. Each approach includes concrete section lists with names and scope summaries
3. User selects preferred approach

### 3. Main Design Document Update

After section approach is selected:

- Keep existing design content as-is (do NOT restructure)
- Append a "Section Split Plan" at the end with:
  - `[ ]`/`[x]` checklist of sections
  - Scope summary per section
  - Dependency order notes in parentheses
- Save to existing path: `docs/plans/YYYY-MM-DD-<topic>-design.md` (same filename convention)
- Commit the updated design document

### 4. Post-Split Guide

Instead of Path A/B, show:

```
Design has been split into sections.

Main design: docs/plans/YYYY-MM-DD-<topic>-design.md

Section progress:
- [ ] Section 1: <name>
- [ ] Section 2: <name> (after section 1)
- [ ] Section 3: <name> (after section 1, 2)

Run each section in order:
  sd-brainstorm docs/plans/YYYY-MM-DD-<topic>-design.md section1

After each section's brainstorm completes, you can choose Path A/B
to run plan → plan-dev → check → commit.
```

Brainstorm ends here. User triggers each section separately.

### 5. Sub-Design Brainstorm

When brainstorm is invoked with a main design document as context (via argument or already in conversation):

1. **Read main design** — understand goals, structure, section scope
2. **Read actual code** — check current codebase state (NOT previous section designs)
3. **Normal brainstorm process** — same questions, gap review, approach exploration, design presentation. Scope is limited to the target section
4. **Conflict detection** — if main design direction conflicts with actual code state, alert user and ask for direction
5. **Save sub-design** — `docs/plans/YYYY-MM-DD-<topic>-section-N-design.md`
6. **Update main design** — mark section `[ ]` → `[x]`
7. **Show Path A/B** — normal existing flow (yolo works as usual)

Key: sub-design brainstorm is not a separate "mode". It's a normal brainstorm where the main design serves as context input.

## File Structure Example

```
docs/plans/
  2026-03-05-auth-system-design.md           # main design (with section plan appended)
  2026-03-05-auth-system-section-1-design.md  # section 1 sub-design
  2026-03-05-auth-system-section-2-design.md  # section 2 sub-design
```
