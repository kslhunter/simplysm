# Publish Process Improvement Design

## Problem

1. `npm publish` was used instead of `pnpm publish`, so `workspace:*` was not converted to actual versions
2. Template files in `packages/sd-cli/templates/` had hardcoded `~13.0.0` dependency versions, which excludes prerelease versions like `13.0.0-beta.x`
3. `templates/` directory was missing from sd-cli's `files` field, so templates were not included in the published package
4. Dangerous auto-rollback commands (`git checkout .`, `git clean -fd`) could destroy unrelated in-progress work
5. Git add/commit was commented out; `--no-git-checks` was used to bypass dirty-tree checks

## Changes

### Already Completed

- **`npm publish` → `pnpm publish`** in `publishPackage()`: enables automatic `workspace:*` → version conversion
- **`files` field**: added `"templates"` to `packages/sd-cli/package.json`

### To Implement

#### 1. Extend `upgradeVersion`

Update template dependency versions alongside package.json versions.

- Target: `packages/sd-cli/templates/**/*.hbs` files containing `@simplysm/*` dependencies
- Transform: `~13.0.0` → `~{newVersion}` (e.g., `~13.0.0-beta.13`)
- Return list of all changed file paths for explicit git staging

#### 2. Restructure Git Commit Flow

New publish flow:

1. `upgradeVersion` — bump package.json versions + template versions
2. `git add` (explicit file list only) → `git commit -m "v{version}"`
3. Build (if fails → error message + recovery guidance, NO auto-rollback)
4. `git tag` → `git push` → `git push --tags`
5. `pnpm publish` (no `--no-git-checks`)

#### 3. Remove `--no-git-checks`

Since all version changes are committed before publish, `--no-git-checks` is no longer needed.

#### 4. Remove Dangerous Auto-Rollback

Remove all `git checkout .` and `git clean -fd` execution/guidance from the codebase.

On failure, only:
- Print error message describing what failed
- Suggest manual recovery commands (e.g., `git revert HEAD`)

## Files to Modify

- `packages/sd-cli/src/commands/publish.ts`
  - `upgradeVersion()`: add template version sync logic
  - `publishPackage()`: remove `--no-git-checks`
  - Phase 3 (git): uncomment and use explicit file list for `git add`
  - Remove all `git checkout .` / `git clean -fd` auto-rollback code
