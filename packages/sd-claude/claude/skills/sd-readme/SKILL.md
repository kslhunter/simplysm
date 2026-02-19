---
name: sd-readme
description: Use when updating a package README.md to reflect recent code changes, or when asked to sync README with current implementation
argument-hint: "<package-name or path> (optional - omit to update all)"
model: sonnet
---

# sd-readme

Update README.md files based on git commits since their last modification.

## Step 0: Check for Batch Mode

If `$ARGUMENTS` is **empty or blank**:

1. Use `Glob` with pattern `packages/*/package.json` to discover all packages.
2. Launch **parallel subagents** via the `Task` tool (`subagent_type: "general-purpose"`, `model: "haiku"`):
   - One subagent for **project root README.md** with prompt:
     ```
     Update the project root README.md at /home/kslhunter/projects/simplysm/README.md based on recent git changes.
     - Run: git log -1 --format="%H %ai %s" -- README.md
     - If no output, treat all commits as relevant: git log --oneline -30
     - Otherwise: git log <hash>..HEAD --oneline
     - If no commits since last update, report "already up to date" and stop.
     - Read the current README.md, read CLAUDE.md for project context, then edit only affected sections.
     - README content must be in English.
     - Preserve existing structure. Match existing style. Do not add changelog sections.
     ```
   - One subagent **per package** with prompt:
     ```
     Update the README.md for package <pkg-name> at <pkg-path>/README.md based on recent git changes.
     Follow these steps:
     1. Run: git log -1 --format="%H %ai %s" -- <pkg-path>/README.md
     2. If no output, all commits are relevant: git log --oneline -- <pkg-path>/
        Otherwise: git log <hash>..HEAD --oneline -- <pkg-path>/
     3. If no commits since last update, report "already up to date" and stop.
     4. Read <pkg-path>/src/index.ts to verify all public exports are documented.
     5. Read the current README.md, then edit only affected sections.
     6. README content must be in English.
     7. Preserve existing structure. Match existing style. Do not add changelog sections.
     8. If README.md does not exist, create it following the style of other package READMEs in this repo.
     ```
3. Collect all subagent results and **report a summary** to the user: which READMEs were updated, which were already up to date.
4. **Stop here** — do not proceed to the single-package steps below.

---

## Step 1: Resolve Package Path (Single Package Mode)

`$ARGUMENTS` is the package name or path (e.g., `sd-cli`, `packages/sd-cli`, `packages/core-common`).

- If it doesn't start with `packages/`, prepend `packages/`.
- Verify `<pkg-path>/README.md` exists. If not, stop and report.

## Step 2: Gather Change Context

Run these git commands **in sequence** (second depends on first):

```bash
# 1. Last commit that modified the README
git log -1 --format="%H %ai %s" -- <pkg-path>/README.md
```

If git log returns **no output** (README was never committed), treat all package commits as relevant:

```bash
git log --oneline -- <pkg-path>/
```

Otherwise, take the commit hash from above, then:

```bash
# 2. All commits to the package since that hash
git log <hash>..HEAD --oneline -- <pkg-path>/
```

If **no commits** exist since the last README update → report "README is already up to date" and **stop**.

## Step 3: Categorize Changes

For each commit, assess README impact:

| Category | Impact | README Action |
|----------|--------|---------------|
| New public export (function, class, type) | **High** | Add documentation |
| Changed API signature (params, return type) | **High** | Update existing docs |
| Removed/renamed public API | **High** | Remove or update |
| New feature (user-visible behavior) | **Medium** | Add description/example |
| Bug fix | **Low** | Skip unless it changes documented behavior |
| Refactoring (internal) | **None** | Skip |
| Build/config/dependency change | **None** | Skip |
| Version bump | **None** | Skip |

For commits with **unclear impact**, inspect the actual diff:

```bash
git show <hash> -- <pkg-path>/src/
```

## Step 4: Cross-Check Exports

Read `<pkg-path>/src/index.ts` to verify:

- All **current public exports** are documented in the README
- No **removed exports** are still documented
- Any **new exports** not yet in README are identified

This catches changes that might have been missed in commit analysis.

## Step 5: Present Findings

Before editing, report to the user:

1. **Commits analyzed**: total count and date range
2. **Changes requiring README updates**: list each with category and what to add/modify
3. **No-action commits**: briefly note what was skipped and why
4. **Export mismatches**: any undocumented or stale exports found

Wait for user confirmation before proceeding to edit.

## Step 6: Update README

Read the current README, then edit **only** the affected sections.

**Rules:**
- README content is written in **English**
- **Preserve existing structure** — do not reorganize or rewrite unchanged sections
- **Match style** — follow the same documentation depth, table format, and code example style as existing entries
- For new APIs: include description, usage example, and parameter/option table if the existing style uses them
- Remove documentation for APIs that no longer exist
- Do not add version history, changelog, or "recently updated" sections
