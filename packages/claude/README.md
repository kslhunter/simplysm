# @simplysm/claude

A Claude Code skills, agents, and rules package for the Simplysm framework. Automatically installs Claude Code assets via `postinstall` when added as a dev dependency. Provides opinionated development workflows including TDD, code review, planning, brainstorming, and git worktree management.

## Installation

```bash
pnpm add -D @simplysm/claude
# or
npm install --save-dev @simplysm/claude
```

Skills, agents, and rules are automatically installed to `.claude/` on `pnpm install` / `npm install`.

## How It Works

When installed as a dependency, the `postinstall` script (`scripts/postinstall.mjs`):

1. Copies all `sd-*` assets (skills, agents, rules, statusline) to the project's `.claude/` directory
2. Configures `statusLine` in `.claude/settings.json` to use `sd-statusline.js`
3. Existing `sd-*` entries are replaced with the latest version on each install

The `prepack` script (`scripts/sync-claude-assets.mjs`) runs before `npm pack` / `npm publish` to sync assets from the project root `.claude/` directory into the package's `claude/` directory.

Updates also trigger reinstallation (`pnpm up @simplysm/claude`).

### Directory Structure (Published Package)

```
@simplysm/claude/
  scripts/
    postinstall.mjs          # Copies sd-* assets to .claude/ on install
    sync-claude-assets.mjs   # Syncs assets from .claude/ before publish
  claude/
    sd-statusline.js          # Status line script
    rules/
      sd-simplysm-docs.md     # Local README documentation rule
    agents/
      sd-code-reviewer.md     # Code review agent
      sd-code-simplifier.md   # Code simplification agent
      sd-api-reviewer.md      # API/DX review agent
    skills/
      sd-brainstorm/           # Brainstorming skill
      sd-plan/                 # Plan writing skill
      sd-plan-dev/             # Plan execution skill
      sd-tdd/                  # Test-driven development skill
      sd-review/               # Comprehensive code review skill
      sd-check/                # Typecheck + lint + test skill
      sd-commit/               # Git commit skill
      sd-readme/               # README update skill
      sd-worktree/             # Git worktree management skill
      sd-explore/              # Codebase analysis skill
      sd-use/                  # Auto skill/agent router
      sd-skill/                # Skill authoring skill
      sd-api-name-review/      # API naming review skill
```

## Skills

Skills are invoked via `/sd-<name>` slash commands in Claude Code.

### sd-brainstorm

Collaborative design exploration before implementation. Helps turn ideas into fully formed designs through natural dialogue.

```
/sd-brainstorm add a modal component to the UI library
```

**Process:**
- Checks project context (files, docs, recent commits)
- Asks questions one at a time (multiple choice preferred)
- Proposes 2-3 approaches with trade-offs
- Presents design in 200-300 word sections with validation
- Saves validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Recommends implementation path (A: worktree isolation, B: direct on current branch)
- Supports yolo mode for auto-execution of all implementation steps

### sd-plan

Creates comprehensive implementation plans with TDD, assuming the implementer has zero codebase context.

```
/sd-plan
```

**Process:**
- Reads requirements/spec
- Creates bite-sized tasks (2-5 minutes each)
- Each task includes: exact file paths, complete code, test commands with expected output
- Saves plan to `docs/plans/YYYY-MM-DD-<feature-name>.md`
- Auto-executes `sd-plan-dev` in yolo mode; otherwise waits for confirmation

**Task structure:**
1. Write the failing test
2. Run it to verify it fails
3. Implement minimal code
4. Run test to verify it passes
5. Commit

### sd-plan-dev

Executes implementation plans via parallel Task agents with dependency-aware scheduling.

```
/sd-plan-dev
```

**Process:**
- Reads plan, extracts tasks
- Analyzes file dependencies to build a task graph
- Groups independent tasks into parallel batches
- Each task agent: implements, launches parallel spec + quality review sub-Tasks, fixes issues
- Repeats review cycle until both reviewers approve
- Final review across entire implementation

### sd-tdd

Test-driven development workflow. Enforces the Red-Green-Refactor cycle.

```
# Invoked internally by other skills, not typically called directly
```

**Iron Law:** No production code without a failing test first.

**Cycle:**
1. **RED** - Write one minimal failing test
2. **Verify RED** - Run test, confirm it fails for the right reason
3. **GREEN** - Write simplest code to pass
4. **Verify GREEN** - Run test, confirm all pass
5. **REFACTOR** - Clean up while keeping tests green

### sd-check

Verifies code via typecheck, lint, and tests. Fixes errors automatically.

```
/sd-check
/sd-check all
/sd-check packages/core-common
```

**Process (sequential, fix-and-retry):**
1. Environment pre-check (pnpm workspace, package.json scripts, vitest config)
2. `pnpm typecheck [path]` - fix errors, re-run until clean
3. `pnpm lint --fix [path]` - fix errors, re-run until clean
4. `pnpm vitest [path] --run` - fix failures, re-run until clean

### sd-review

Multi-perspective code review of a package or path. Analysis only, no code modifications.

```
/sd-review packages/solid
```

**Process:**
1. Runs `sd-explore` skill for deep code analysis (separate context)
2. Dispatches 3 parallel reviewer agents: `sd-code-reviewer`, `sd-code-simplifier`, `sd-api-reviewer`
3. Verifies each finding against actual code
4. Produces comprehensive report grouped by severity (P0-P4)

### sd-commit

Creates a git commit following Conventional Commits style.

```
/sd-commit
/sd-commit all
```

- Without `all`: stages only relevant files individually
- With `all`: runs `git add .` then commits everything
- Commit message format: `type(scope): short description`

### sd-readme

Updates README.md files based on git commits since their last modification.

```
/sd-readme                     # Update all package READMEs in parallel
/sd-readme packages/solid      # Update a single package README
```

**Process:**
1. Finds last commit that modified the README
2. Gathers all commits since then
3. Cross-checks exports in `src/index.ts`
4. Presents findings and waits for confirmation
5. Edits only affected sections

### sd-worktree

Git worktree management for branch isolation during feature work.

```
/sd-worktree add modal-migration     # Create worktree
/sd-worktree rebase                  # Rebase onto main
/sd-worktree merge                   # Merge into main (--no-ff)
/sd-worktree clean modal-migration   # Remove worktree and branch
```

**Commands:**

| Command | Description |
|---------|-------------|
| `add <name>` | Create worktree under `.worktrees/<name>`, cd into it |
| `rebase [name]` | Rebase worktree branch onto main branch |
| `merge [name]` | Merge worktree branch into main with `--no-ff` |
| `clean <name>` | Remove worktree directory and delete branch |

**Full workflow:**
```
/sd-worktree add modal-migration
# ... work in .worktrees/modal-migration ...
/sd-worktree rebase
/sd-worktree merge
cd <project-root>
/sd-worktree clean modal-migration
```

### sd-explore

Deep codebase analysis. Traces execution paths, maps architecture layers, and documents dependencies. Analysis only, no code modifications.

```
# Typically invoked by sd-review, not directly
```

**Covers:**
- Feature discovery (entry points, core files, boundaries)
- Code flow tracing (call chains, data transformations, side effects)
- Architecture analysis (abstraction layers, design patterns, interfaces)
- Implementation details (algorithms, error handling, performance)

### sd-use

Auto skill/agent router. Analyzes the user request and selects the best matching `sd-*` skill or agent.

```
/sd-use review the solid package for bugs
# Selects sd-review and executes it
```

### sd-skill

Skill authoring tool. Creates new skills using TDD methodology applied to documentation.

```
/sd-skill
```

**Process (Red-Green-Refactor for documentation):**
1. **RED** - Run pressure scenarios without skill, document baseline failures
2. **GREEN** - Write minimal skill addressing those specific failures
3. **REFACTOR** - Close loopholes, add rationalization counters, re-test

### sd-api-name-review

Reviews a library's public API naming for consistency and industry standard alignment. Analysis only, no code modifications.

```
/sd-api-name-review packages/solid
```

**Phases:**
1. Extract public API surface (exports, parameters, patterns)
2. Research industry standard naming via web search
3. Comparative analysis with priority levels (P0-P2 + Keep)

## Agents

Agents are used by skills as subagents via the Task tool, or can be invoked directly.

### sd-code-reviewer

Reviews code for bugs, logic errors, security vulnerabilities, and convention adherence. Uses confidence-based filtering (only reports issues with confidence >= 80).

**Severity levels:** Critical, Important

**Scope:** By default reviews unstaged changes from `git diff`. Can be directed to specific files.

### sd-code-simplifier

Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. Focuses on recently modified code.

**Focus areas:**
- Reduce unnecessary complexity and nesting
- Eliminate redundant code and abstractions
- Improve readability through clear naming
- Avoid nested ternaries (prefer switch/if-else)

### sd-api-reviewer

Reviews a library's public API for developer experience (DX) quality. Uses confidence-based filtering (only reports issues with confidence >= 70).

**Review categories:**
- Naming consistency and industry standard alignment
- API intuitiveness and learning curve
- Type hints and error message quality
- Configuration complexity and boilerplate
- Usage pattern coherence

**Priority levels:** P0 (API misuse likely), P1 (significant friction), P2 (minor improvement), Keep (already aligned)

## Rules

### sd-simplysm-docs

Instructs Claude to read `@simplysm/*` package documentation from local `node_modules/` README.md files. Includes an embedded package list so Claude can immediately identify which package to look up.

```
# Claude automatically reads when needing @simplysm/* docs:
node_modules/@simplysm/{package-name}/README.md
```

### sd-language

Instructs Claude to respond in the system's configured language setting, while keeping technical terms, code identifiers, and library names unchanged. English error messages and logs are preserved in their original form.

### sd-naming-conventions

Enforces function naming conventions including prohibition of `Async` suffix (async is the default) and use of `Sync` suffix for synchronous versions when both exist.

### sd-workflow-rules

Defines workflow behavior including the rule to not auto-proceed after skill completion—report results and stop, waiting for explicit user instructions before the next step.

## Status Line

`sd-statusline.js` displays a Claude Code status bar with:

- Model name
- Context window usage (progress bar + percentage)
- Daily rate limit usage with reset time (via OAuth API)
- Weekly rate limit usage with reset time (via OAuth API or stdin fallback)
- Extra usage credits (if enabled)
- Current folder name

The script reads Claude Code's stdin JSON for context window and model info, and optionally fetches usage data from `https://api.anthropic.com/api/oauth/usage` using the OAuth token from `~/.claude/.credentials.json`.

## Scripts

### postinstall.mjs

Runs automatically on `pnpm install` / `npm install`. Copies `sd-*` assets from the package to the project's `.claude/` directory.

```javascript
// Uses INIT_CWD to find the project root
// Deletes existing sd-* entries, then copies fresh versions
// Configures statusLine in .claude/settings.json
```

**Environment variables:**
- `INIT_CWD` - Set by pnpm/npm, points to the project root where the install command was run

### sync-claude-assets.mjs

Runs before `npm pack` / `npm publish` (via `prepack` script). Syncs `sd-*` assets from the project root's `.claude/` directory into the package's `claude/` directory for distribution.

## Notes

- If using `pnpm install --ignore-scripts`, the postinstall won't run
- If using `onlyBuiltDependencies` in `pnpm-workspace.yaml`, add `@simplysm/claude` to the list
- Skills and agents use the `sd-` prefix to distinguish them from user-defined assets
- Existing `sd-*` entries are always replaced with the latest version on install

## License

Apache-2.0
