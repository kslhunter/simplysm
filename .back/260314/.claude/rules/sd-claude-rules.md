## Request Handling Rules

- Never modify code unless the user explicitly requests changes. (No autonomous decisions in response to questions, etc.)

## Code Writing Rules

- Follow the YAGNI principle.
- No workarounds: Do not propose solutions that mask symptoms, such as `as` type assertions, `any`, `// @ts-ignore`, hardcoding, or swallowing exceptions (ignoring after `catch`).

## Git Rules

- Never use `git stash`.
- Never use `git worktree`.

## Playwright Rules

- All Playwright output (screenshots, PDFs, downloads, etc.) must be saved to the `.tmp/playwright/` directory.
- When using Playwright MCP tools with a `filename` parameter, always prefix the filename with `.tmp/playwright/` (e.g., `filename: ".tmp/playwright/my-screenshot.png"`).
- Never pass a bare filename without the `.tmp/playwright/` path prefix.

## Documentation Rules for LLMs

- Write in English. (including code comments)

