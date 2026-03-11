# @simplysm Package Documentation

When you need API details, usage examples, or component props for `@simplysm/*` packages,
read the corresponding package's README.md from node_modules.

## How to Use

Read the package README directly:

```
node_modules/@simplysm/{package-name}/README.md
```

If not found (pnpm hoisting), try:

```
packages/*/node_modules/@simplysm/{package-name}/README.md
```

## When to Use

**Required**: You must read the relevant README **before** performing any of the following:

- Writing new code that uses `@simplysm/*` APIs
- Fixing type errors or bugs in code that uses `@simplysm/*` APIs
- Refactoring or migrating code that depends on `@simplysm/*` packages
- Making assumptions about type mappings (e.g., DB column types → TypeScript types)

Do not guess API behavior or type mappings — always check the README first.

## Reporting Library Issues

Source code for `@simplysm/*` packages can be found in `node_modules/@simplysm/`. If debugging reveals that the root cause lies within the simplysm library itself, generate a GitHub issue-formatted text (title, reproduction steps, expected behavior, actual behavior) and display it to the user.

**Report only facts — do not suggest fixes or include code location hints. Do not automatically submit the issue — only display the text.**

The issue body must never include internal analysis of library code (class names, variable names, style properties, inheritance chains, etc.). Describe only user-observable symptoms.
