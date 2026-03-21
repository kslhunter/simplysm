# @simplysm/lint

Simplysm package - Lint configuration (ESLint). Provides an ESLint plugin with custom rules and a recommended flat config for TypeScript, SolidJS, and Tailwind CSS projects.

## Installation

```bash
npm install @simplysm/lint
```

## Entrypoints

This package has two entrypoints:

| Entrypoint | Import Path | Description |
|------------|-------------|-------------|
| ESLint Plugin | `@simplysm/lint/eslint-plugin` | Custom ESLint rules |
| Recommended Config | `@simplysm/lint/eslint-recommended` | Full recommended flat config |

## API Overview

### ESLint Plugin (`@simplysm/lint/eslint-plugin`)

Default export is an ESLint plugin object with `rules`:

| Rule | Type | Fixable | Description |
|------|------|---------|-------------|
| `no-hard-private` | problem | Yes | Enforces TypeScript `private _` style instead of hard private fields (`#`). Auto-fixes `#field` to `private _field` and `this.#field` to `this._field`. |
| `no-subpath-imports-from-simplysm` | problem | Yes | Prohibits `src` subpath imports from `@simplysm/*` packages (e.g., `@simplysm/pkg/src/x` is prohibited). Auto-fixes to package root import. |
| `ts-no-throw-not-implemented-error` | suggestion | No | Warns about `NotImplementedError` usage from `@simplysm/core-common`. Detects named, aliased, and namespace imports. |

### Recommended Config (`@simplysm/lint/eslint-recommended`)

Default export is a full ESLint flat config array that includes:

- **Global ignores**: `node_modules`, `dist`, dotfiles, underscore-prefixed directories
- **JS/JSX rules**: Common rules + unused imports + import dependency checks + custom `@simplysm` rules
- **TS/TSX rules**: TypeScript-specific rules (strict boolean expressions, no floating promises, prefer readonly, etc.) + all JS rules
- **Test overrides**: Relaxed rules for `tests/` and `tests-e2e/` directories (allows console, no extraneous deps check)
- **SolidJS rules**: No destructure, components-return-once, no-innerhtml, prefer-for, etc.
- **Tailwind CSS rules**: Classnames order, enforces shorthand, no contradicting classname, no custom classname

#### Included Plugins

| Plugin | Prefix | Purpose |
|--------|--------|---------|
| `@typescript-eslint` | `@typescript-eslint/` | TypeScript type-aware linting |
| `@simplysm` (this package) | `@simplysm/` | Custom Simplysm rules |
| `eslint-plugin-import` | `import/` | Import/export validation |
| `eslint-plugin-unused-imports` | `unused-imports/` | Auto-remove unused imports |
| `eslint-plugin-solid` | `solid/` | SolidJS best practices |
| `eslint-plugin-tailwindcss` | `tailwindcss/` | Tailwind CSS class validation |

## Usage Examples

### Use the recommended config

```typescript
// eslint.config.ts
import recommended from "@simplysm/lint/eslint-recommended";

export default recommended;
```

### Use the plugin with custom rules

```typescript
// eslint.config.ts
import plugin from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: { "@simplysm": plugin },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
    },
  },
];
```
