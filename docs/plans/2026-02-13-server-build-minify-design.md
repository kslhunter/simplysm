# Server Build: Enable Minify & Disable Sourcemap

## Context

Production builds deployed to external environments (customer servers) should protect source code and minimize bundle size.

## Current State

| Target | Minify | Sourcemap |
|--------|--------|-----------|
| Client (Vite) | ON (Vite default) | OFF (Vite default) |
| Server (esbuild) | OFF | ON |
| Library (esbuild) | OFF | ON |

Client is already configured correctly. Library packages are published to npm and follow npm conventions (no minification).

## Changes

**Target: Server only**

File: `packages/sd-cli/src/utils/esbuild-config.ts`

| Setting | Before | After |
|---------|--------|-------|
| `minify` | not set (default: false) | `true` |
| `sourcemap` | `true` | remove (default: false) |
| `sourcesContent` | `false` | remove (irrelevant without sourcemap) |

## Rationale

- **Minify ON**: Code protection for external/customer deployments
- **Sourcemap OFF**: No need to ship sourcemaps; debugging via logs is sufficient
- **Library unchanged**: npm packages should not be minified (consumers handle minification)

## Risks

- esbuild minification mangles variable/function names. If server code uses `constructor.name` or `function.name` in business logic, it may break. Verify with post-build testing.
