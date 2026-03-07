# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Important: `.claude/` Folder Scope

The `.claude/` folder contains **cross-project shared rules** used across multiple repositories. Do NOT add project-specific content to `.claude/rules/`. Project-specific guidelines belong in this `CLAUDE.md` file.

## Project Overview

Simplysm is a TypeScript-based full-stack framework monorepo. Managed with pnpm workspaces, it provides packages for SolidJS UI, ORM, service communication, Excel processing, and more.

### Design Philosophy

- **Standard patterns first**: Prefer familiar patterns over custom ones.
- **Explicit and predictable code**: Prefer explicit code over implicit behavior.
- **Incremental learning**: Each package is independently usable.

## Reference Docs (`docs/refs/`)

| When | Read this file |
| --- | --- |
| Writing, modifying, or reviewing code | `docs/refs/code-rules.md` |
| Running build, lint, typecheck, test commands | `docs/refs/commands.md` |
| Understanding package layout or dependencies | `docs/refs/project-structure.md` |
| Working on SolidJS / `@simplysm/solid` | `docs/refs/solid-guide.md` |
| Writing or modifying tests | `docs/refs/testing.md` |

## Code Language

All source code must be written in **English**. This includes variable names, function names, class names, comments, error messages, and string literals intended for developers (e.g., log messages). Only user-facing strings (UI labels, i18n resources) may use other languages.
