# Baseline Test Analysis - sd-check Skill

## Summary

Tested 6 scenarios with agents WITHOUT sd-check skill. All agents failed to follow optimal verification patterns.

## Common Failures Across All Scenarios

### 1. No Cost Optimization

**Failure:** All agents planned direct command execution instead of using haiku subagents.

**Observed in:** All scenarios (1-6)

**Impact:** Higher cost, no isolation

**What skill must prevent:** Skill must explicitly require haiku subagent usage

### 2. Incomplete Parallelization

**Failure:** Agents either ran sequentially or only partially parallelized.

**Examples:**

- Scenario 1: Used `&` for typecheck/lint but ran tests sequentially ("stratified parallel")
- Scenario 2: No parallelization at all
- Scenario 3: Sequential fix → verify → fix → verify

**Impact:** Slower verification (60s → 120s+)

**What skill must prevent:** Skill must require ALL 3 checks (typecheck, lint, test) in parallel via 3 separate haiku agents

### 3. Missing Environment Pre-checks

**Failure:** No systematic environment validation before running checks.

**Observed:**

- Scenario 1: Checked Docker for ORM tests, but not other prerequisites
- Scenario 6: Only checked lock file, missed package.json scripts

**Impact:** Confusing errors if environment misconfigured

**What skill must prevent:** Skill must require pre-check (package.json `check` script exists)

### 4. Unclear Re-verification Loop

**Failure:** After fixing errors, no clear "re-run ALL checks" loop.

**Examples:**

- Scenario 3: Phase 1 verify → Phase 2 verify → Phase 3 verify (but no final "all phases" re-verify)
- Agents treated it as linear progression, not a loop

**Impact:** Fixes in one area may break another (cascade errors)

**What skill must prevent:** Skill must explicitly state "re-run ALL 3 checks until ALL pass"

### 5. No sd-debug Recommendation

**Failure:** When root cause unclear after multiple attempts, agents didn't recommend sd-debug.

**Observed:**

- Scenario 4: After 4 failed attempts, agent suggested various debugging approaches but NOT `/sd-debug` skill

**Impact:** User wastes time when systematic root-cause investigation needed

**What skill must prevent:** Skill must state "after 2-3 failed fix attempts → recommend /sd-debug"

### 6. Incorrect Default Behavior

**Failure:** When no path argument provided, agents asked user for clarification instead of defaulting to full project.

**Observed:**

- Scenario 5: Agent wanted to ask "which package?" instead of running on entire project

**Impact:** Unnecessary user friction

**What skill must prevent:** Skill must state "if no path argument → run on entire project (omit path in commands)"

### 7. Scope Creep (Unnecessary Steps)

**Failure:** Agents included steps not relevant to "verification".

**Examples:**

- Scenario 1: Included build step (verification doesn't need build)
- Scenario 2: Included dev server test (not verification)

**Impact:** Wasted time, confusion about scope

**What skill must prevent:** Skill must clarify scope: typecheck, lint, test ONLY (no build, no dev)

## Rationalization Patterns (Verbatim)

### "Parallelization while maintaining logical dependencies"

- Used to justify partial parallelization
- Agents ran typecheck & lint in parallel, but tests sequentially
- **Counter:** ALL 3 checks are independent → all 3 in parallel

### "Stratified parallel execution"

- Used to justify sequential test runs grouped by environment
- **Counter:** Vitest projects are independent → run all via single command

### "Faster to fail fast on static checks"

- Good principle, but used to justify including build step
- **Counter:** Build is not a static check, and not required for verification

### "Type safety first" / "Incremental verification"

- Used to justify Phase 1 → Phase 2 → Phase 3 linear progression
- **Counter:** After fixes, must re-verify ALL phases (loop), not just next phase

### "Understanding first, then ONE comprehensive fix"

- Used to justify continued debugging without tools
- **Counter:** After 2-3 attempts, recommend /sd-debug for systematic investigation

### "Ask for clarification" / "Explicit and predictable"

- Used to justify asking user for path when none provided
- **Counter:** Default to full project is explicit and predictable behavior

## Success Criteria for Skill

Skill is effective if agents:

1. ✅ Launch 3 haiku agents in parallel (typecheck, lint, test)
2. ✅ Run environment pre-checks before verification
3. ✅ Default to full project when no path argument
4. ✅ Fix errors in priority order (typecheck → lint → test)
5. ✅ Re-run ALL 3 checks after any fix (loop until all pass)
6. ✅ Recommend /sd-debug after 2-3 failed fix attempts
7. ✅ Do NOT include build or dev server steps

## Test Scenarios for GREEN Phase

After writing skill, re-run scenarios 1-6. Agents should now exhibit correct behavior above.

Focus on:

- Scenario 1: Verify parallel haiku agents + env checks
- Scenario 3: Verify re-verification loop + priority
- Scenario 4: Verify sd-debug recommendation
- Scenario 5: Verify default to full project
