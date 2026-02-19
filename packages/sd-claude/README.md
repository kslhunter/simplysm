# @simplysm/sd-claude

Simplysm Claude Code CLI — asset installer and cross-platform npx wrapper. Automatically installs Claude Code assets (skills, agents, rules) via `postinstall` when added as a dev dependency. Provides opinionated development workflows including TDD, systematic debugging, code review, planning, brainstorming, and git worktree management.

## Installation

```bash
pnpm add -D @simplysm/sd-claude
# or
npm install --save-dev @simplysm/sd-claude
```

Skills, agents, and rules are automatically installed to `.claude/` on `pnpm install` / `npm install`.

## How It Works

When installed as a dependency, the `postinstall` script (`scripts/postinstall.mjs`) invokes the `sd-claude install` CLI command, which:

1. Copies all `sd-*` assets (skills, agents, rules, statusline) to the project's `.claude/` directory
2. Configures `statusLine` in `.claude/settings.json` to use `sd-statusline.js`
3. Configures MCP servers in `.mcp.json` (context7 and playwright) using the cross-platform npx wrapper
4. Existing `sd-*` entries are replaced with the latest version on each install

The `prepack` script (`scripts/sync-claude-assets.mjs`) runs before `npm pack` / `npm publish` to sync assets from the project root `.claude/` directory into the package's `claude/` directory.

Updates also trigger reinstallation (`pnpm up @simplysm/sd-claude`).

### Directory Structure (Published Package)

```
@simplysm/sd-claude/
  dist/
    sd-claude.js               # CLI entry point (bin)
    commands/
      install.js               # Asset installation logic
      npx.js                   # Cross-platform npx wrapper
  scripts/
    postinstall.mjs            # Thin wrapper — calls `sd-claude install`
    sync-claude-assets.mjs     # Syncs assets from .claude/ before publish
  claude/
    sd-statusline.js          # Status line script
    rules/
      sd-simplysm-docs.md     # Local README documentation rule
      sd-language.md          # Language response rule
      sd-naming-conventions.md # Function naming rule
      sd-workflow-rules.md    # Workflow behavior rule
    agents/
      sd-code-reviewer.md     # Code review agent
      sd-code-simplifier.md   # Code simplification agent
      sd-api-reviewer.md      # API/DX review agent
      sd-security-reviewer.md # ORM SQL injection and input validation agent
    skills/
      sd-brainstorm/           # Brainstorming skill
      sd-plan/                 # Plan writing skill
      sd-plan-dev/             # Plan execution skill
      sd-tdd/                  # Test-driven development skill
      sd-debug/                # Systematic debugging skill
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

## CLI Commands

The package provides an `sd-claude` binary with two subcommands:

```bash
# Install Claude Code assets to the project's .claude/ directory
sd-claude install

# Cross-platform npx wrapper (uses npx.cmd on Windows, npx elsewhere)
sd-claude npx -y @upstash/context7-mcp
```

`sd-claude install` is called automatically by the `postinstall` script. `sd-claude npx` is used in `.mcp.json` to launch MCP servers cross-platform.

## Programmatic API

```typescript
import { runInstall, runNpx } from "@simplysm/sd-claude";
```

### runInstall

```typescript
function runInstall(): void
```

Installs Claude Code assets to the project's `.claude/` directory. Performs:
- Finds project root via `INIT_CWD` or `node_modules` path traversal
- Skips if running inside the simplysm monorepo itself
- Cleans existing `sd-*` entries, then copies fresh versions from the package's `claude/` directory
- Configures `statusLine` in `.claude/settings.json`
- Configures MCP servers (context7, playwright) in `.mcp.json`

### runNpx

```typescript
function runNpx(args: string[]): void
```

Cross-platform npx wrapper. Spawns `npx.cmd` on Windows, `npx` on other platforms. Passes all arguments through and forwards the exit code.

## Skills

Skills are invoked via `/sd-<name>` slash commands in Claude Code.

### sd-brainstorm

Collaborative design exploration before implementation. Helps turn ideas into fully formed designs through natural dialogue. Should be used before any creative work — creating features, building components, or modifying behavior.

```
/sd-brainstorm add a modal component to the UI library
```

**Process:**
- Checks project context (files, docs, recent commits)
- Asks questions one at a time (multiple choice preferred)
- Proposes 2-3 approaches with trade-offs
- Presents design in 200-300 word sections with validation
- Saves validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Commits the design document to git

**Next Steps Guide:**

After design is complete, presents two workflow paths and recommends one based on scope:

```
--- Path A: With branch isolation (recommended for features/large changes) ---
1. /sd-worktree add <name>
2. /sd-plan
3. /sd-plan-dev
4. /sd-check
5. /sd-commit
6. /sd-worktree merge
7. /sd-worktree clean

--- Path B: Direct on current branch (quick fixes/small changes) ---
1. /sd-plan
2. /sd-plan-dev
3. /sd-check
4. /sd-commit
```

**Yolo mode**: Respond with "Path A: yolo" or "Path B: yolo" to auto-execute all steps sequentially.

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

**Plan document header format:**
```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]
```

**Task structure:**
1. Write the failing test
2. Run it to verify it fails
3. Implement minimal code
4. Run test to verify it passes
5. Commit

### sd-plan-dev

Executes implementation plans with right-sized process: direct execution for small plans, parallel agents for large plans.

```
/sd-plan-dev
```

**Mode selection:**
- **Direct Mode** — tasks ≤ 3 AND source files ≤ 5: implement directly in main context, no agents
- **Agent Mode** — otherwise: parallel Task agents with dependency-aware scheduling

**Direct Mode process:**
1. Read plan, implement tasks in dependency order
2. For each task: implement, write tests, self-review
3. After all tasks: `pnpm typecheck` + `pnpm lint` + `pnpm vitest` on affected packages

**Agent Mode process:**
- Reads plan, extracts full task text, creates TaskCreate
- Analyzes file dependencies to build a task graph
- Groups independent tasks into parallel batches
- Each task agent: implements, launches parallel spec + quality review sub-Tasks, fixes issues
- Repeats review cycle until both reviewers approve (max 3 cycles)
- Final review Task across entire implementation

**Agents used per task (Agent Mode):**
- **Task agent** (implementer) — implements the task, runs sub-Tasks for review
- **Spec reviewer** sub-Task (`model: opus`) — verifies spec compliance
- **Quality reviewer** sub-Task (`model: opus`) — reviews code quality
- **Final reviewer** sub-Task (`model: opus`) — cross-task integration check

**If task agent returns questions:** orchestrator answers and re-launches that agent; other parallel agents continue unaffected.

**After all batches complete:** if working inside a `.worktrees/` directory, guides user to run `/sd-worktree merge`.

### sd-tdd

Test-driven development workflow. Enforces the Red-Green-Refactor cycle. Internally used by other skills; typically not invoked directly by the user.

**Iron Law:** No production code without a failing test first.

**Cycle:**
1. **RED** - Write one minimal failing test
2. **Verify RED** - Run test, confirm it fails for the right reason
3. **GREEN** - Write simplest code to pass
4. **Verify GREEN** - Run test, confirm all pass
5. **REFACTOR** - Clean up while keeping tests green

### sd-debug

Systematic debugging workflow. Enforces root-cause investigation before any fix attempt.

```
/sd-debug
```

**Iron Law:** No fixes without root-cause investigation first.

**When to use:** Any technical issue — test failures, bugs, unexpected behavior, performance problems, build failures, integration issues. Use especially under time pressure or after multiple failed fix attempts.

**Four Phases:**

1. **Root Cause Investigation** — Read error messages carefully, reproduce consistently, check recent changes, gather evidence by adding diagnostic instrumentation at each component boundary, trace data flow backward through the call stack
2. **Pattern Analysis** — Find working examples in the codebase, compare against references, identify differences, understand dependencies
3. **Hypothesis and Testing** — Form a single specific hypothesis, make the smallest possible change to test it, verify before continuing
4. **Implementation** — Create a failing test case (use `sd-tdd`), implement single fix addressing the root cause, verify fix

**3+ fixes failed:** Stop and question the architecture — discuss with the user before attempting more fixes.

**Supporting techniques** (in the skill directory):
- `root-cause-tracing.md` — Trace bugs backward through call stack
- `defense-in-depth.md` — Add validation at multiple layers
- `condition-based-waiting.md` — Replace arbitrary timeouts with condition polling

### sd-check

Verifies code via typecheck, lint, and tests using 3 parallel haiku agents. Fixes errors automatically and re-runs until all checks pass.

```
/sd-check
/sd-check packages/core-common
```

**Process (4 steps, fix-and-retry):**
1. **Environment pre-check** (parallel): verify pnpm workspace, package.json scripts, vitest config, and root package version
2. **Launch 3 haiku agents in parallel** (single message): typecheck (`pnpm typecheck [path]`), lint (`pnpm lint --fix [path]`), test (`pnpm vitest [path] --run`)
3. **Collect results, fix errors** in priority order: typecheck → lint → test. After 2-3 failed fix attempts on tests → recommend `/sd-debug`
4. **Re-verify** — go back to step 2 and run all 3 agents again until all pass

**No path argument:** defaults to verifying the entire project.

### sd-review

Multi-perspective code review of a package or path. Analysis only, no code modifications.

```
/sd-review packages/solid
```

**Process:**
1. Runs `sd-explore` skill for deep code analysis (separate context, does not consume main context window)
2. Dispatches up to 4 parallel reviewer agents via Task tool (including `sd-explore` analysis in each prompt):
   - `sd-code-reviewer` — bugs, security, logic errors, conventions (always)
   - `sd-code-simplifier` — complexity, duplication, readability (always)
   - `sd-api-reviewer` — DX/usability, naming, type hints (always)
   - `sd-security-reviewer` — ORM SQL injection, input validation (conditional: only when target contains ORM queries or service endpoints)
3. Verifies each finding against actual code (filters invalid, handled, or misread findings)
4. Produces comprehensive report grouped by severity

**Report sections:**

| Section | Priority |
|---------|----------|
| Architecture Summary | — |
| Critical Issues | P0 |
| Security Issues | P0 (when sd-security-reviewer ran) |
| Quality Issues | P1 |
| DX/Usability Issues | P2 |
| Simplification Opportunities | P3 |
| Convention Issues | P4 |

### sd-commit

Creates a git commit following Conventional Commits style.

```
/sd-commit
/sd-commit all
```

- Without `all`: stages only context-relevant files individually (single commit)
- With `all`: may split into multiple commits grouped by intent/purpose — files across packages with the same intent go in one commit
- Commit message format: `type(scope): short description`

### sd-readme

Syncs package README.md with current source code by comparing exports against documentation.

```
/sd-readme                     # Update all package READMEs in parallel
/sd-readme packages/solid      # Update a single package README
```

**Batch mode** (no argument): discovers all packages via Glob, launches parallel sonnet subagents — one for the project root README and one per package. Reports which READMEs were updated vs. already up to date.

**Single package process:**
1. Reads `src/index.ts` to build the export map (source of truth)
2. Reads existing README.md to build the documentation map
3. Diffs: ADDED (exported but not documented), REMOVED (documented but not exported), CHANGED (API signature differs), OK (matches)
4. Reports findings and waits for user confirmation
5. Applies updates — only touches ADDED/REMOVED/CHANGED items

### sd-worktree

Git worktree management for branch isolation during feature work. All operations use `sd-worktree.mjs` script.

```
/sd-worktree add modal-migration     # Create worktree
/sd-worktree rebase                  # Rebase onto main
/sd-worktree merge                   # Merge into main (--no-ff)
/sd-worktree clean modal-migration   # Remove worktree and branch
```

**Target resolution:** if no name is provided in args, auto-detects from current directory if inside `.worktrees/<name>/`; otherwise asks the user.

**Commands:**

| Command | Description |
|---------|-------------|
| `add <name>` | Derive kebab-case name from description, create worktree under `.worktrees/<name>`, cd into it |
| `rebase [name]` | Rebase worktree branch onto main branch; errors if uncommitted changes exist |
| `merge [name]` | Merge worktree branch into main with `--no-ff`; errors if uncommitted changes exist |
| `clean <name>` | Remove worktree directory and delete branch; must cd to project root first |

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

Deep codebase analysis. Traces execution paths, maps architecture layers, and documents dependencies. Analysis only, no code modifications. Not user-invocable — called programmatically by `sd-review` and other agents.

**Covers:**
- Feature discovery (entry points, core files, boundaries)
- Code flow tracing (call chains, data transformations, side effects)
- Architecture analysis (abstraction layers, design patterns, interfaces)
- Implementation details (algorithms, error handling, performance)

### sd-use

Auto skill/agent router. Analyzes the user request and selects the best matching `sd-*` skill or agent, explains the selection, then executes immediately.

```
/sd-use review the solid package for bugs
# Selects sd-review and executes it
```

**Catalog includes:** `sd-brainstorm`, `sd-debug`, `sd-tdd`, `sd-plan`, `sd-plan-dev`, `sd-explore`, `sd-review`, `sd-check`, `sd-commit`, `sd-readme`, `sd-api-name-review`, `sd-worktree`, `sd-skill` (skills), and `sd-code-reviewer`, `sd-code-simplifier`, `sd-api-reviewer`, `sd-security-reviewer` (agents).

### sd-skill

Skill authoring tool. Creates new skills using TDD methodology applied to documentation.

```
/sd-skill
```

**Process (Red-Green-Refactor for documentation):**
1. **RED** - Run pressure scenarios without skill, document baseline failures (exact rationalizations)
2. **GREEN** - Write minimal skill addressing those specific failures
3. **REFACTOR** - Close loopholes, add rationalization table and red flags list, re-test

**SKILL.md frontmatter:** only `name` and `description` fields (max 1024 characters). Description starts with "Use when..." and describes triggering conditions only — never summarizes the skill's workflow.

### sd-api-name-review

Reviews a library's public API naming for consistency and industry standard alignment. Analysis only, no code modifications.

```
/sd-api-name-review packages/solid
```

**Phases:**
1. Use an Explore agent to extract the public API surface (exported identifiers, parameter names, naming patterns)
2. Research industry standard naming via parallel web-search agents for comparable libraries
3. Comparative analysis report

| Priority | Criteria |
|----------|----------|
| **P0** | Misaligned with majority of surveyed libraries |
| **P1** | Internal inconsistency (same concept, different names) |
| **P2** | Better industry term exists (optional) |
| **Keep** | Already aligned with standards |

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

### sd-security-reviewer

Reviews ORM queries and service endpoints for SQL injection and input validation vulnerabilities specific to simplysm's string-escaping ORM. Dispatched conditionally by `sd-review` when the target contains ORM queries or service endpoints.

**Context:** simplysm ORM uses string escaping (not parameter binding), so application-level input validation is the primary defense.

**Review checklist:**
- Input source classification (user input vs. internal data)
- Validation before ORM query: allowlist/regex for strings, `Number()` + `isNaN()` for numerics, enum allowlisting
- Service endpoint validation: RPC handler arguments, WebSocket message payloads

**Confidence threshold:** Only reports issues with confidence >= 75.

**Severity:** CRITICAL (confidence >= 90), WARNING (confidence >= 75)

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

Defines workflow behavior including the rule to not auto-proceed after skill completion — report results and stop, waiting for explicit user instructions before the next step.

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

Thin wrapper that runs automatically on `pnpm install` / `npm install`. If `dist/` exists (i.e., the package is built), it invokes `sd-claude install` CLI command. Skips silently in monorepo development environments where `dist/` has not been built yet.

### sync-claude-assets.mjs

Runs before `npm pack` / `npm publish` (via `prepack` script). Syncs `sd-*` assets from the project root's `.claude/` directory into the package's `claude/` directory for distribution.

## Caveats

- If using `pnpm install --ignore-scripts`, the postinstall won't run
- If using `onlyBuiltDependencies` in `pnpm-workspace.yaml`, add `@simplysm/sd-claude` to the list
- Skills and agents use the `sd-` prefix to distinguish them from user-defined assets
- Existing `sd-*` entries are always replaced with the latest version on install

## Dependencies

- `yargs` — CLI argument parsing

## License

Apache-2.0
