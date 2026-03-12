# @simplysm/lint

Shared ESLint configuration and custom ESLint plugin for the Simplysm monorepo. Provides a recommended flat config with rules for TypeScript, SolidJS, Tailwind CSS, and import hygiene, plus three custom rules.

## Installation

```bash
npm install @simplysm/lint
# or
pnpm add @simplysm/lint
```

### Peer Dependencies

This package depends on the following (installed as direct dependencies):

- `eslint` >= 9
- `typescript` >= 5
- `typescript-eslint` >= 8

## Exports

| Export path | Description |
|---|---|
| `@simplysm/lint/eslint-plugin` | Custom ESLint plugin object (`rules` map) |
| `@simplysm/lint/eslint-recommended` | Ready-to-use ESLint flat config array |

---

## Recommended Config

**`@simplysm/lint/eslint-recommended`**

A complete ESLint flat config (compatible with ESLint v9 flat config format) that you can spread directly into your `eslint.config.ts`.

```typescript
// eslint.config.ts
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
  // your project-specific overrides
];
```

### What it includes

#### Global ignores

Ignores `node_modules/`, `dist/`, dotfile directories (`.*`), and underscore-prefixed directories (`_*`).

#### JS / JSX files (`**/*.js`, `**/*.jsx`)

- **Common rules**: `no-console`, `eqeqeq` (strict equality, `== null` allowed), `no-self-compare`, `array-callback-return`, `no-warning-comments` (warn on TODO/FIXME).
- **Unused imports**: Auto-removes unused imports; allows `_`-prefixed unused variables.
- **Import hygiene**: `import/no-extraneous-dependencies` with dev-dependency exceptions for config files.
- **Custom rules**: `@simplysm/no-hard-private` (error), `@simplysm/no-subpath-imports-from-simplysm` (error).
- **Node built-in restrictions**: Prohibits `Buffer` (use `Uint8Array`), `events`/`eventemitter3` (use `@simplysm/core-common` EventEmitter).

#### TS / TSX files (`**/*.ts`, `**/*.tsx`)

Includes all JS rules above, plus:

- **TypeScript-specific rules** (via `typescript-eslint`):
  - `require-await`, `await-thenable`, `return-await` (in try-catch), `no-floating-promises`
  - `no-shadow`, `no-unnecessary-condition`, `no-unnecessary-type-assertion`
  - `prefer-reduce-type-parameter`, `prefer-return-this-type`, `prefer-readonly`
  - `strict-boolean-expressions` (nullable boolean/object allowed)
  - `no-misused-promises` (void return arguments and attributes allowed)
  - `only-throw-error`, `no-array-delete`, `no-unused-expressions`
  - `ban-ts-comment` (`ts-expect-error` allowed with description >= 3 chars)
- **Custom rules**: All JS custom rules plus `@simplysm/ts-no-throw-not-implemented-error` (warn).

#### Test files (`**/tests/**`, `**/tests-e2e/**`)

Relaxes some rules for test code:

- `no-console`: off
- `import/no-extraneous-dependencies`: off
- `@simplysm/ts-no-throw-not-implemented-error`: off

#### SolidJS (`**/*.ts`, `**/*.tsx`)

- **eslint-plugin-solid** rules: `no-destructure`, `components-return-once`, `jsx-no-duplicate-props`, `jsx-no-undef`, `no-react-deps`, `no-react-specific-props`, `no-innerhtml`, `jsx-no-script-url`, `jsx-uses-vars`, `prefer-for`, `event-handlers`, `imports`, `style-prop`, `self-closing-comp`.
- **eslint-plugin-tailwindcss** rules: `classnames-order` (warn), `enforces-negative-arbitrary-values`, `enforces-shorthand`, `no-contradicting-classname`, `no-custom-classname`, `no-unnecessary-arbitrary-value`.

---

## Custom Plugin

**`@simplysm/lint/eslint-plugin`**

An ESLint plugin object that exposes three custom rules under the `@simplysm` namespace.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";

// plugin.rules contains:
// - "no-hard-private"
// - "no-subpath-imports-from-simplysm"
// - "ts-no-throw-not-implemented-error"
```

### Rules

#### `@simplysm/no-hard-private`

Enforces TypeScript `private _` style instead of ECMAScript hard private fields (`#`).

- **Type**: problem
- **Fixable**: yes (auto-fix replaces `#field` with `private _field`)
- **Recommended severity**: error

Hard private fields (`#field`) are disallowed. The auto-fixer renames the field and adds the `private` keyword. Reports a conflict error if `_field` already exists on the class.

```typescript
// Bad
class Foo {
  #value = 1;
  #compute() { return this.#value; }
}

// Good
class Foo {
  private _value = 1;
  private _compute() { return this._value; }
}
```

#### `@simplysm/no-subpath-imports-from-simplysm`

Prohibits `src` subpath imports from `@simplysm/*` packages.

- **Type**: problem
- **Fixable**: yes (auto-fix strips the `/src/...` segment)
- **Recommended severity**: error

Prevents importing internal source paths such as `@simplysm/pkg/src/foo`. Only the package root import (`@simplysm/pkg`) is allowed.

```typescript
// Bad
import { Foo } from "@simplysm/core-common/src/utils/foo";

// Good
import { Foo } from "@simplysm/core-common";
```

#### `@simplysm/ts-no-throw-not-implemented-error`

Warns about usage of `NotImplementedError` from `@simplysm/core-common` to catch unfinished code before production.

- **Type**: suggestion
- **Fixable**: no
- **Recommended severity**: warn (off in test files)

Detects `new NotImplementedError()` calls regardless of import form (named, aliased, or namespace import). The warning message displays the error's string argument if provided.

```typescript
// Triggers warning: "Not implemented"
throw new NotImplementedError();

// Triggers warning: "parseXml is not ready"
throw new NotImplementedError("parseXml is not ready");
```
