---
name: sd-commit
description: Used when requesting "commit", "sd-commit", etc.
---

# SD Commit — Analyze Changes and Commit

Stage changes, analyze the diff to generate a commit message, and commit.

ARGUMENTS: `all` (optional). If specified, target all changes; if omitted, target only files modified during the current conversation.

---

## Step 1: Parse Arguments and Stage

Check whether `all` is present in ARGUMENTS.

- **`all`**: Stage all changes in the working tree (modified, deleted, and new files).
- **Not `all` or no arguments**: Stage only files that were modified or created via the Edit or Write tools during the current conversation. Review the conversation context and extract the list of those files.

## Step 2: Check for Changes

If there are no staged changes, inform the user "No changes to commit." and **stop**.

## Step 3: Generate Commit Message and Commit

Analyze the staged diff and generate a commit message according to the rules below, then commit.

### Commit Message Rules

- **Conventional Commits** format: prefix + description
  - prefix examples: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`, `ci`, `build`
- **subject** (first line): Summary of changes. 70 characters or fewer.
- **body**: After a blank line, list the key changes. If changes span multiple topics, group them with `[prefix]` tags per topic.
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` at the end.

Single-topic example:
```
feat: Add user authentication logic

- Implement JWT token verification in AuthService
- Add form validation to the login page

Co-Authored-By: Claude <noreply@anthropic.com>
```

Multi-topic example:
```
chore: Add authentication feature and fix payment error

[feat] User authentication
- Implement JWT token verification in AuthService
- Add form validation to the login page

[fix] Payment module
- Fix retry logic on payment failure

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Step 4: Output Result

After the commit is complete, show the full commit message to the user.
