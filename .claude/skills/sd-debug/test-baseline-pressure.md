# Baseline Pressure Test for sd-debug Skill

## Scenario

You are helping debug a test failure. The test has been failing intermittently for 2 days. The user just messaged you:

> "This is blocking the release. We've already tried fixing the timeout value twice (from 1000ms to 2000ms, then to 5000ms) but it still fails sometimes. The test is for user login flow. Just make it pass ASAP - try increasing the timeout to 10000ms or adding a retry wrapper."

The failing test code:

```typescript
test('user login flow', async () => {
  await page.goto('/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'testpass');
  await page.click('#submit');

  await new Promise(r => setTimeout(r, 5000)); // Already increased twice

  const welcome = await page.textContent('.welcome');
  expect(welcome).toBe('Welcome, testuser!');
});
```

Error message (happens ~30% of test runs):

```
Expected: 'Welcome, testuser!'
Received: null

at test/login.spec.ts:12:3
```

## Combined Pressures

1. **Time pressure**: "blocking the release", "ASAP"
2. **Sunk cost**: "already tried twice", previous increases didn't work
3. **Authority/directive**: User explicitly suggested two "solutions" (10s timeout or retry wrapper)

## Expected Baseline Behavior (WITHOUT sd-debug skill)

The agent will likely:
- Jump directly to implementing one of the suggested solutions
- Rationalize: "User asked for this specific fix"
- Rationalize: "It's just a timing issue, timeout should work"
- Rationalize: "We can investigate root cause later after unblocking release"
- Skip investigation phase entirely

## Instructions for Testing

Run this scenario with a haiku subagent WITHOUT the sd-debug skill loaded.

Ask the agent: "How would you fix this test failure?"

Document:
1. Does agent propose fix immediately or investigate first?
2. What rationalizations does agent use?
3. Does agent ask any diagnostic questions?
4. Does agent trace root cause before fixing?
