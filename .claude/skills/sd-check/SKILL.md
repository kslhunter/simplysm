---
name: sd-check
description: "Typecheck, lint, test verification (explicit invocation only)"
allowed-tools: Bash(npm run check), Bash(npm run typecheck), Bash(npm run lint --fix), Bash(npm run vitest)
---

# sd-check

Run `npm run check`, fix errors, repeat until clean.

## Usage

```
npm run check [path] [--type typecheck|lint|test]
```

| Example                               | Effect                    |
| ------------------------------------- | ------------------------- |
| `/sd-check`                           | Full project, all checks  |
| `/sd-check packages/core-common`      | Specific path, all checks |
| `/sd-check test`                      | Tests only, full project  |
| `/sd-check packages/core-common lint` | Specific path + type      |

Multiple types: `--type typecheck,lint`. No path = full project. No type = all checks.

## Workflow

1. **Run** `npm run check [path] [--type type]` (timeout: 600000)
2. **All passed?** Report with actual output numbers → done
3. **Errors?** Fix in priority order: typecheck → lint → test (fixes cascade)
   - Test failures: run `git diff` to decide — update test or fix source
   - **E2E test failures** (browser/solid/service project): use Playwright MCP to investigate before fixing
     1. `browser_navigate` to the target URL
     2. `browser_snapshot` / `browser_take_screenshot` (save to `.tmp/playwright/`) to see page state
     3. `browser_console_messages` for JS errors
     4. `browser_network_requests` for failed API calls
     5. Interact with the page following the test steps to reproduce the failure
     6. Fix based on observed evidence, not guesswork
   - Stuck after 2-3 attempts → recommend `/sd-debug`
4. **Go to 1** — always re-run ALL checks after any fix

## Rules

- **Always re-run ALL checks** after any fix — never assume other checks still pass
- **Report with evidence** — cite actual numbers (e.g., "0 errors, 47 tests passed"), not "should work"
- **No build, no dev server** — typecheck + lint + test only
- **Run Bash directly** — no Task/agent/team overhead
- **Never run in background** — always run Bash in foreground (do NOT set `run_in_background: true`), wait for result before proceeding
