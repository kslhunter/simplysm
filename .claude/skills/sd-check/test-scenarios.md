# sd-check Pressure Test Scenarios

## Scenario 1: Basic Application - Full Project Check (Time Pressure)

**Setup:**
- Simulated project with typecheck, lint, test configured
- No existing errors

**Pressure:**
- Time constraint: "Need results quickly for deployment"

**Agent Prompt:**
```
I need to verify the entire simplysm project before deployment. Can you run all checks? We need to deploy soon, so please be fast.
```

**Expected Baseline Failures (without skill):**
- May run checks sequentially instead of parallel (slower)
- May skip environment pre-checks
- May not use haiku model (more expensive)

**Success Criteria (with skill):**
- Runs environment pre-checks first
- Launches 3 haiku agents in parallel
- Reports results correctly

---

## Scenario 2: Variation - Specific Path Check (Complex Path)

**Setup:**
- Project with multiple packages
- Target path: `packages/solid-demo`

**Pressure:**
- Complex path with potential typos
- User expects path to be handled correctly

**Agent Prompt:**
```
Can you verify just the packages/solid-demo directory? I only changed files there.
```

**Expected Baseline Failures:**
- May forget to pass path argument to commands
- May run full project check instead
- May incorrectly format path in commands

**Success Criteria:**
- Correctly passes `packages/solid-demo` to all 3 commands
- Only reports errors from that path

---

## Scenario 3: Edge Case - Typecheck Errors (Fix Priority)

**Setup:**
- Simulated project with typecheck errors that cascade to lint/test

**Pressure:**
- Multiple failing checks (frustration)
- Desire to "just make it work"

**Agent Prompt:**
```
Please verify the project. (Note: project has typecheck errors that cause lint and test failures)
```

**Expected Baseline Failures:**
- May fix lint or test errors first (wrong priority)
- May not understand cascade relationship
- May fix all errors simultaneously without priority

**Success Criteria:**
- Fixes typecheck errors first
- Recognizes cascade relationship
- Re-verifies after each fix round

---

## Scenario 4: Edge Case - Repeated Failures (Loop Exit)

**Setup:**
- Simulated project with obscure test failure
- Root cause is unclear

**Pressure:**
- Repeated verification failures (fatigue)
- Temptation to give up or skip

**Agent Prompt:**
```
Verify the project. (Note: test failures persist after 2-3 fix attempts)
```

**Expected Baseline Failures:**
- May keep trying same fix repeatedly (infinite loop)
- May skip re-verification to "save time"
- May not recommend sd-debug

**Success Criteria:**
- After 2-3 failed attempts, recommends `/sd-debug`
- Does not enter infinite loop
- Always re-verifies after fixes

---

## Scenario 5: Missing Information Test - No Path Argument

**Setup:**
- Standard project setup

**Pressure:**
- Ambiguous user request

**Agent Prompt:**
```
Run sd-check.
```

**Expected Baseline Failures:**
- May ask user for path (skill should default to full project)
- May incorrectly assume a path

**Success Criteria:**
- Runs on entire project (no path argument)
- Does not ask user for clarification

---

## Scenario 6: Missing Information Test - Invalid Environment

**Setup:**
- Project missing pnpm-lock.yaml or vitest.config.ts

**Pressure:**
- User expects check to work

**Agent Prompt:**
```
Please run sd-check on the project.
```

**Expected Baseline Failures:**
- May proceed without environment checks
- May report confusing errors from missing dependencies

**Success Criteria:**
- Runs environment pre-checks
- Stops with clear error message if environment invalid
- Reports which specific check failed

---

## Testing Methodology

### RED Phase (Current)
1. Run each scenario WITHOUT sd-check skill loaded
2. Document exact agent behavior verbatim
3. Record rationalizations used
4. Identify patterns in failures

### GREEN Phase
1. Write skill addressing specific baseline failures
2. Run same scenarios WITH skill
3. Verify compliance

### REFACTOR Phase
1. Identify new rationalizations from GREEN testing
2. Add explicit counters
3. Build rationalization table
4. Re-test until bulletproof
