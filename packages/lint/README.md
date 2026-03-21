# @simplysm/lint

Lint configuration (ESLint) -- ESLint plugin with custom rules and a recommended flat config for Simplysm projects.

## Installation

```bash
npm install @simplysm/lint
```

This package has two entrypoints:

- `@simplysm/lint/eslint-plugin` -- ESLint plugin exporting custom rules.
- `@simplysm/lint/eslint-recommended` -- Ready-to-use flat config with all recommended rules.

## API Overview

### ESLint Plugin (`@simplysm/lint/eslint-plugin`)

| API | Type | Description |
|-----|------|-------------|
| `default` | ESLint plugin | Plugin object with `rules` property |

### Rules

| Rule | Type | Description |
|------|------|-------------|
| `no-hard-private` | problem (fixable) | Enforces TypeScript `private _` style instead of hard private fields (`#`) |
| `no-subpath-imports-from-simplysm` | problem (fixable) | Prohibits `src` subpath imports from `@simplysm/*` packages |
| `ts-no-throw-not-implemented-error` | suggestion | Warns about `NotImplementedError` usage from `@simplysm/core-common` |

### ESLint Recommended Config (`@simplysm/lint/eslint-recommended`)

| API | Type | Description |
|-----|------|-------------|
| `default` | flat config array | Complete ESLint flat config with JS/TS, SolidJS, and Tailwind CSS rules |

### Utils

| API | Type | Description |
|-----|------|-------------|
| `createRule` | function | Factory function to create ESLint rules (wraps `@typescript-eslint/utils` `RuleCreator`) |

## `createRule`

```typescript
const createRule: ReturnType<typeof ESLintUtils.RuleCreator>;
```

Factory function wrapping `RuleCreator` from `@typescript-eslint/utils`. Automatically generates rule documentation URLs.

## Rule Details

### `no-hard-private`

Restricts ECMAScript private fields (`#field`) and enforces TypeScript `private` keyword usage. Auto-fixable: renames `#field` to `private _field` and `this.#field` to `this._field`.

### `no-subpath-imports-from-simplysm`

Prohibits `src` subpath imports from `@simplysm/*` packages (e.g., `@simplysm/pkg/src/x` is prohibited). Auto-fixable: rewrites to `@simplysm/pkg`.

### `ts-no-throw-not-implemented-error`

Detects and warns about `new NotImplementedError()` usage from `@simplysm/core-common`. Supports named imports, aliased imports, and namespace imports. Helps prevent unimplemented code from reaching production.

## Recommended Config Details

The recommended config (`@simplysm/lint/eslint-recommended`) includes:

- **JS/TS common rules**: `no-console`, `eqeqeq`, `no-self-compare`, `array-callback-return`
- **TypeScript rules**: `require-await`, `no-floating-promises`, `strict-boolean-expressions`, `no-unnecessary-condition`, `prefer-readonly`, and more
- **Import rules**: `no-extraneous-dependencies`, unused import auto-removal
- **Node built-in restrictions**: Prohibits `Buffer` (use `Uint8Array`) and `events` (use `@simplysm/core-common` `EventEmitter`)
- **SolidJS rules**: `no-destructure`, `components-return-once`, `prefer-for`, `no-react-specific-props`
- **Tailwind CSS rules**: `classnames-order`, `no-contradicting-classname`, `enforces-shorthand`

## Usage Examples

### Use recommended config

```typescript
// eslint.config.ts
import recommended from "@simplysm/lint/eslint-recommended";

export default recommended;
```

### Use plugin rules individually

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

### Create a custom rule with `createRule`

```typescript
import { createRule } from "@simplysm/lint/eslint-plugin";

export default createRule({
  name: "my-custom-rule",
  meta: {
    type: "problem",
    docs: { description: "My custom rule" },
    schema: [],
    messages: { myMessage: "Something is wrong" },
  },
  defaultOptions: [],
  create(context) {
    return {};
  },
});
```
