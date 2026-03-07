# TDD Skill Files Improvement Design

## Goal

Improve effectiveness of `sd-tdd/SKILL.md` and `sd-tdd/testing-anti-patterns.md`.

## Changes

### SKILL.md

#### 1. GREEN example type signature fix

Change `fn: () => Promise<T>` → `fn: () => T | Promise<T>` to match the sync test function in the RED example.

```typescript
async function retryOperation<T>(fn: () => T | Promise<T>): Promise<T> {
```

#### 2. "Code Written Before Test" → requirements-based principle

Replace "delete it, start over, never look at it" with practical guidance:

```markdown
## Code Written Before Test

When production code already exists:

1. Write tests based on **requirements/specs**, NOT by reverse-engineering the existing code
2. NEVER copy-paste existing logic into tests
3. NEVER shape tests to match current implementation
4. If the test reveals the existing code is wrong, fix the code to match the spec
```

#### 3. Generalize hardcoded vitest command

Replace `npx vitest path/to/test.spec.ts --run` with:

```bash
# Run the test file with the project's test runner
```

In both Verify RED and Verify GREEN sections.

### testing-anti-patterns.md

#### 4. Add `async` to Anti-Pattern 3 examples

Both Bad and Good test callbacks need `async`:

```typescript
test("detects duplicate server", async () => {
```

#### 5. Anti-Pattern 1 → framework-neutral example

Replace React Testing Library example with mock-call-verification vs real-result-verification:

Bad: `expect(mockRepo.findById).toHaveBeenCalledWith('1')` — verifies mock was called
Good: `expect(user.name).toBe('Alice')` — tests real behavior with test double

#### 6. Add Anti-Pattern 5: Testing Implementation Details

Bad: `expect(repo.findById).toHaveBeenCalledTimes(1)` — tests HOW it caches
Good: `expect(first).toBe(second)` — tests THAT it caches (observable behavior)

Also update:
- **The Rules**: Add rule 5 — "NEVER assert on internal state or call counts — assert on observable outcomes"
- **Quick Reference**: Add row for implementation detail testing
- **Red Flags**: Add related red flag items
