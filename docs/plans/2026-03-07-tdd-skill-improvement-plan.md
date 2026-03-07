# TDD Skill Files Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix code examples, improve practicality, and add missing anti-pattern in sd-tdd skill files.

**Architecture:** Direct edits to two markdown files — SKILL.md and testing-anti-patterns.md.

**Tech Stack:** Markdown documentation

---

### Task 1: Fix GREEN example type signature in SKILL.md

**Files:**
- Modify: `.claude/skills/sd-tdd/SKILL.md:77`

**Step 1: Edit type signature**

Change line 77 from:
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
```
to:
```typescript
async function retryOperation<T>(fn: () => T | Promise<T>): Promise<T> {
```

Also change line 94 (Bad example) from:
```typescript
  fn: () => Promise<T>,
```
to:
```typescript
  fn: () => T | Promise<T>,
```

**Step 2: Commit**

```bash
git add .claude/skills/sd-tdd/SKILL.md
git commit -m "docs(sd-tdd): fix type mismatch between RED/GREEN examples"
```

---

### Task 2: Generalize hardcoded vitest command in SKILL.md

**Files:**
- Modify: `.claude/skills/sd-tdd/SKILL.md:58-59,111-112`

**Step 1: Replace both vitest command blocks**

Change lines 58-59 (Verify RED) from:
````markdown
```bash
npx vitest path/to/test.spec.ts --run
```
````
to:
````markdown
```bash
# Run the test file with the project's test runner
```
````

Change lines 111-112 (Verify GREEN) the same way.

**Step 2: Commit**

```bash
git add .claude/skills/sd-tdd/SKILL.md
git commit -m "docs(sd-tdd): generalize test runner command"
```

---

### Task 3: Replace "Code Written Before Test" section in SKILL.md

**Files:**
- Modify: `.claude/skills/sd-tdd/SKILL.md:132-140`

**Step 1: Replace section content**

Replace lines 132-140 with:

```markdown
## Code Written Before Test

When production code already exists:

1. Write tests based on **requirements/specs**, NOT by reverse-engineering the existing code
2. NEVER copy-paste existing logic into tests
3. NEVER shape tests to match current implementation
4. If the test reveals the existing code is wrong, fix the code to match the spec
```

**Step 2: Commit**

```bash
git add .claude/skills/sd-tdd/SKILL.md
git commit -m "docs(sd-tdd): replace 'delete it' with requirements-based principle"
```

---

### Task 4: Add async to Anti-Pattern 3 examples in testing-anti-patterns.md

**Files:**
- Modify: `.claude/skills/sd-tdd/testing-anti-patterns.md:82,97`

**Step 1: Add async keyword**

Change line 82 (Bad) from:
```typescript
test("detects duplicate server", () => {
```
to:
```typescript
test("detects duplicate server", async () => {
```

Change line 97 (Good) from:
```typescript
test("detects duplicate server", () => {
```
to:
```typescript
test("detects duplicate server", async () => {
```

**Step 2: Commit**

```bash
git add .claude/skills/sd-tdd/testing-anti-patterns.md
git commit -m "docs(sd-tdd): fix missing async in anti-pattern 3 examples"
```

---

### Task 5: Replace Anti-Pattern 1 with framework-neutral example

**Files:**
- Modify: `.claude/skills/sd-tdd/testing-anti-patterns.md:14-38`

**Step 1: Replace Anti-Pattern 1 section**

Replace lines 14-38 with:

```markdown
## Anti-Pattern 1: Testing Mock Behavior

<Bad>
```typescript
test('fetches user data', async () => {
  const mockRepo = {
    findById: vi.fn().mockReturnValue({ id: '1', name: 'Alice' }),
  };
  const service = new UserService(mockRepo);

  await service.getUser('1');

  expect(mockRepo.findById).toHaveBeenCalledWith('1');
});
```
Verifies mock was called, not that the code works
</Bad>

<Good>
```typescript
test('fetches user data', async () => {
  const repo = new InMemoryUserRepo([{ id: '1', name: 'Alice' }]);
  const service = new UserService(repo);

  const user = await service.getUser('1');

  expect(user.name).toBe('Alice');
});
```
Tests real behavior with a test double
</Good>

**Gate — BEFORE asserting on any mock element:**
1. Ask: "Am I testing real behavior or mock existence?"
2. If mock existence → STOP. Delete the assertion. Unmock the component or test real behavior.
```

**Step 2: Commit**

```bash
git add .claude/skills/sd-tdd/testing-anti-patterns.md
git commit -m "docs(sd-tdd): replace React example with framework-neutral in anti-pattern 1"
```

---

### Task 6: Add Anti-Pattern 5 and update Rules/Quick Reference/Red Flags

**Files:**
- Modify: `.claude/skills/sd-tdd/testing-anti-patterns.md:7-12,148-165`

**Step 1: Add rule 5 to The Rules section**

Change lines 7-12 from:
````markdown
```
1. NEVER test mock behavior — test real behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding the dependency chain
4. NEVER create partial mocks — mirror the complete real structure
```
````
to:
````markdown
```
1. NEVER test mock behavior — test real behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding the dependency chain
4. NEVER create partial mocks — mirror the complete real structure
5. NEVER assert on internal state or call counts — assert on observable outcomes
```
````

**Step 2: Add Anti-Pattern 5 section after Anti-Pattern 4**

Insert after line 146 (after Anti-Pattern 4's gate):

```markdown

## Anti-Pattern 5: Testing Implementation Details

<Bad>
```typescript
test('caches user after first fetch', async () => {
  const service = new UserService(repo);

  await service.getUser('1');
  await service.getUser('1');

  // Tests HOW it caches, not THAT it caches
  expect(repo.findById).toHaveBeenCalledTimes(1);
});
```
Breaks when caching strategy changes
</Bad>

<Good>
```typescript
test('returns same user on repeated calls', async () => {
  const service = new UserService(repo);

  const first = await service.getUser('1');
  const second = await service.getUser('1');

  expect(first).toBe(second);
});
```
Tests the observable behavior (same reference)
</Good>

**Gate — BEFORE asserting on call counts or internal state:**
1. Ask: "Am I testing HOW it works or WHAT it produces?"
2. If HOW → STOP. Find an observable outcome to assert instead.
```

**Step 3: Update Quick Reference table**

Add row to the table:

```markdown
| Assert on call counts/state    | Assert on observable outcomes                   |
```

**Step 4: Update Red Flags section**

Add to the Red Flags list:

```markdown
- Assertions on `.toHaveBeenCalledTimes()` when outcome is testable
- Test breaks when internal implementation is refactored
```

**Step 5: Commit**

```bash
git add .claude/skills/sd-tdd/testing-anti-patterns.md
git commit -m "docs(sd-tdd): add anti-pattern 5 (testing implementation details)"
```
