# @simplysm/lint

Simplysm package - Lint configuration (ESLint + Stylelint)

Provides a shared ESLint flat config, a custom ESLint plugin with Simplysm-specific rules, and a shared Stylelint config for use across Simplysm projects.

## Installation

```bash
pnpm add -D @simplysm/lint
```

## Entry Points

This package exposes three separate entry points:

| Entry point | Description |
|---|---|
| `@simplysm/lint/eslint-plugin` | Custom ESLint plugin (Simplysm rules only) |
| `@simplysm/lint/eslint-recommended` | Full recommended ESLint flat config |
| `@simplysm/lint/stylelint-recommended` | Recommended Stylelint config |

---

## `@simplysm/lint/eslint-recommended`

A pre-built ESLint [flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new) array that covers JS, TS, SolidJS (TSX), and Tailwind CSS files.

**Included plugins:**
- `typescript-eslint`
- `eslint-plugin-import`
- `eslint-plugin-unused-imports`
- `eslint-plugin-solid`
- `eslint-plugin-tailwindcss`
- `@simplysm` (custom plugin, see below)

### Usage

```typescript
// eslint.config.ts
import sdRecommended from "@simplysm/lint/eslint-recommended";

export default sdRecommended;
```

### Covered file globs

| Glob | Applied rule groups |
|---|---|
| `**/*.js`, `**/*.jsx` | Common rules, import, unused-imports, `@simplysm` rules |
| `**/*.ts`, `**/*.tsx` | All of the above + typescript-eslint rules |
| `**/*.ts`, `**/*.tsx` | SolidJS reactivity + Tailwind CSS rules |
| `**/tests/**/*.ts`, `**/tests/**/*.tsx` | Relaxed rules (no-console off, import/no-extraneous-dependencies off, solid/reactivity off) |

### Global ignores

The following paths are ignored by default:

```
**/node_modules/**
**/dist/**
**/.*/**
**/_*/**
```

### Key rules enabled

**Common (JS + TS)**

| Rule | Severity | Notes |
|---|---|---|
| `no-console` | error | Prohibit console usage |
| `no-warning-comments` | warn | Flag TODO/FIXME comments |
| `eqeqeq` | error | Enforce `===`; allow `== null` |
| `no-self-compare` | error | Catch `x === x` typos |
| `array-callback-return` | error | Require return in map/filter callbacks |
| `no-restricted-globals` | error | Prohibit `Buffer` (use `Uint8Array`) |
| `no-restricted-imports` | error | Prohibit `buffer`, `events`, `eventemitter3` |
| `unused-imports/no-unused-imports` | error | Auto-remove unused imports |
| `unused-imports/no-unused-vars` | error | Unused vars allowed with `_` prefix |
| `import/no-extraneous-dependencies` | error | Prohibit undeclared dependencies |
| `@simplysm/no-hard-private` | error | See custom rules below |
| `@simplysm/no-subpath-imports-from-simplysm` | error | See custom rules below |

**TypeScript-only additions**

| Rule | Severity | Notes |
|---|---|---|
| `@typescript-eslint/require-await` | error | |
| `@typescript-eslint/await-thenable` | error | |
| `@typescript-eslint/return-await` | error | `in-try-catch` mode |
| `@typescript-eslint/no-floating-promises` | error | |
| `@typescript-eslint/no-shadow` | error | |
| `@typescript-eslint/no-unnecessary-condition` | error | `allowConstantLoopConditions: true` |
| `@typescript-eslint/no-unnecessary-type-assertion` | error | |
| `@typescript-eslint/prefer-reduce-type-parameter` | error | |
| `@typescript-eslint/prefer-return-this-type` | error | |
| `@typescript-eslint/strict-boolean-expressions` | error | Allow nullable boolean/object |
| `@typescript-eslint/ban-ts-comment` | error | `ts-expect-error` allowed with description |
| `@typescript-eslint/prefer-readonly` | error | |
| `@typescript-eslint/no-misused-promises` | error | `checksVoidReturn.arguments/attributes: false` |
| `@typescript-eslint/only-throw-error` | error | |
| `@typescript-eslint/no-array-delete` | error | |
| `@simplysm/ts-no-throw-not-implemented-error` | warn | See custom rules below |

**SolidJS + Tailwind CSS (TS/TSX)**

| Rule | Severity | Notes |
|---|---|---|
| `solid/reactivity` | error | Reactivity loss detection |
| `solid/no-destructure` | error | Props destructuring guard |
| `solid/components-return-once` | error | Early return guard |
| `solid/jsx-no-duplicate-props` | error | |
| `solid/jsx-no-undef` | error | TypeScript-enabled |
| `solid/no-react-deps` | error | |
| `solid/no-react-specific-props` | error | |
| `solid/no-innerhtml` | error | XSS prevention |
| `solid/jsx-no-script-url` | error | |
| `solid/jsx-uses-vars` | error | |
| `solid/prefer-for` | error | Recommend `<For>` component |
| `solid/event-handlers` | error | |
| `solid/imports` | error | |
| `solid/style-prop` | error | |
| `solid/self-closing-comp` | error | |
| `tailwindcss/classnames-order` | warn | Auto-sort class order; supports `clsx` tag |
| `tailwindcss/enforces-negative-arbitrary-values` | error | |
| `tailwindcss/enforces-shorthand` | error | |
| `tailwindcss/no-contradicting-classname` | error | |
| `tailwindcss/no-custom-classname` | error | |
| `tailwindcss/no-unnecessary-arbitrary-value` | error | |

---

## `@simplysm/lint/eslint-plugin`

A custom ESLint plugin that exposes three Simplysm-specific rules under the `@simplysm` namespace.

### Usage

```typescript
// eslint.config.ts
import plugin from "@simplysm/lint/eslint-plugin";
import type { ESLint } from "eslint";

export default [
  {
    plugins: {
      "@simplysm": plugin as unknown as ESLint.Plugin,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
    },
  },
];
```

### Custom Rules

#### `@simplysm/no-hard-private`

**Type:** `problem` | **Fixable:** yes

Prohibits ECMAScript hard-private fields (`#field`) and enforces the TypeScript `private _field` style instead.

Checks:
- Class field declarations: `#field`
- Class method declarations: `#method()`
- Class accessor declarations: `accessor #field`
- Member access expressions: `this.#field`

Auto-fix renames `#name` to `_name` and inserts the `private` access modifier when missing. The fix is skipped if a member named `_name` already exists in the same class.

```typescript
// Error
class Foo {
  #count = 0;
  #increment() { this.#count++; }
}

// OK (after auto-fix)
class Foo {
  private _count = 0;
  private _increment() { this._count++; }
}
```

---

#### `@simplysm/no-subpath-imports-from-simplysm`

**Type:** `problem` | **Fixable:** yes

Prohibits imports into the `src/` subpath of `@simplysm/*` packages. Only the package root (or other declared export subpaths) may be imported.

Checks:
- Static import declarations: `import ... from '...'`
- Dynamic imports: `import('...')`
- Named re-exports: `export { ... } from '...'`
- Namespace re-exports: `export * from '...'`

Auto-fix rewrites the import to the package root (`@simplysm/pkg`).

```typescript
// Error
import { foo } from "@simplysm/core-common/src/foo";

// OK (after auto-fix)
import { foo } from "@simplysm/core-common";
```

---

#### `@simplysm/ts-no-throw-not-implemented-error`

**Type:** `suggestion` | **Fixable:** no | **Severity in recommended config:** warn

Warns when `NotImplementedError` from `@simplysm/core-common` is instantiated with `new`. This prevents unfinished placeholder code from reaching production.

Detects all import forms:
- Named import: `import { NotImplementedError } from "@simplysm/core-common"`
- Aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"`
- Namespace import: `import * as CC from "@simplysm/core-common"` used as `new CC.NotImplementedError()`

Dynamic imports (`await import(...)`) are not detected.

The warning message is the string passed as the first argument to the constructor, or `"Not implemented"` if no argument is provided.

```typescript
import { NotImplementedError } from "@simplysm/core-common";

// Warning: "Not implemented"
throw new NotImplementedError();

// Warning: "TODO: finish this"
throw new NotImplementedError("TODO: finish this");
```

---

## `@simplysm/lint/stylelint-recommended`

A Stylelint config object extending `stylelint-config-standard` and `stylelint-config-tailwindcss` with additional browser compatibility and module resolution rules.

### Usage

```javascript
// stylelint.config.js
import sdStylelint from "@simplysm/lint/stylelint-recommended";

export default sdStylelint;
```

### Extended configs

- `stylelint-config-standard`
- `stylelint-config-tailwindcss`

### Plugins

- `stylelint-no-unsupported-browser-features`
- `stylelint-no-unresolved-module`

### Rules

| Rule | Setting | Notes |
|---|---|---|
| `plugin/no-unsupported-browser-features` | error | Chrome >= 84; ignores `css-cascade-layers`, `css-nesting`, `css-overflow` |
| `declaration-block-no-redundant-longhand-properties` | true | Ignores `inset` shorthand (requires Chrome 87+) |
| `plugin/no-unresolved-module` | true | Checks file existence in `@import` and `url()` |
