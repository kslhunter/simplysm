# @simplysm/lint

Lint configurations for the Simplysm framework. Provides ESLint plugin with custom rules and Stylelint configuration for comprehensive code quality enforcement.

- **ESLint**: Custom rules, TypeScript, SolidJS, and Tailwind CSS support (Flat Config format)
- **Stylelint**: CSS linting with Chrome 84+ compatibility checks, Tailwind CSS support, and file resolution validation

## Installation

```bash
npm install @simplysm/lint
# or
pnpm add @simplysm/lint
```

All required linting libraries (eslint, typescript-eslint, stylelint, etc.) are included as dependencies and do not need to be installed separately.

## Configuration

### ESLint Flat Config (eslint.config.js or eslint.config.ts)

#### Using recommended config (recommended)

The `eslint-recommended` entry point exports a comprehensive flat config array that includes custom rules, TypeScript rules, SolidJS rules, and Tailwind CSS rules. This is sufficient for most cases.

```javascript
import simplysmConfigs from "@simplysm/lint/eslint-recommended";

export default [
  ...simplysmConfigs,
];
```

To extend with additional settings (e.g., specifying a Tailwind config path):

```javascript
import simplysmConfigs from "@simplysm/lint/eslint-recommended";

export default [
  ...simplysmConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "tailwind.config.ts",
      },
    },
  },
];
```

#### Using only the ESLint plugin with specific rules

To selectively apply only certain custom rules, import the plugin from `eslint-plugin`:

```javascript
import simplysm from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": simplysm,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/ts-no-throw-not-implemented-error": "warn",
    },
  },
];
```

### Stylelint Config (.stylelintrc.json)

#### Using recommended config (recommended)

Create a `.stylelintrc.json` file at the project root:

```json
{
  "extends": ["@simplysm/lint/stylelint-recommended"]
}
```

Or use the full configuration directly:

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  "plugins": ["stylelint-no-unsupported-browser-features", "stylelint-no-unresolved-module"],
  "rules": {
    "plugin/no-unsupported-browser-features": [
      true,
      {
        "severity": "error",
        "browsers": ["chrome >= 84"],
        "ignore": ["css-cascade-layers", "css-nesting", "css-overflow"]
      }
    ],
    "plugin/no-unresolved-module": true
  }
}
```

#### Overrides for specific files

Add overrides to disable rules for specific files:

```json
{
  "extends": ["@simplysm/lint/stylelint-recommended"],
  "overrides": [
    {
      "files": ["**/tailwind.css"],
      "rules": {
        "plugin/no-unsupported-browser-features": null
      }
    }
  ]
}
```

## Stylelint Rules

The `stylelint-recommended` config includes:

| Rule | Severity | Description |
|------|----------|-------------|
| `plugin/no-unsupported-browser-features` | error | Checks CSS features compatibility with Chrome 84+ |
| `plugin/no-unresolved-module` | error | Validates that `@import` and `url()` references exist |
| All rules from `stylelint-config-standard` | varies | Standard CSS linting rules |
| All rules from `stylelint-config-tailwindcss` | varies | Tailwind CSS-specific rules (`@apply`, `@layer`, etc.) |

### Browser Compatibility

The config enforces Chrome 84+ compatibility by default. This aligns with Simplysm's target browser support.

The following features are intentionally ignored (allowed despite Chrome 84 not supporting them, because they are used by Tailwind CSS internals):

- `css-cascade-layers` (`@layer` directive)
- `css-nesting` (CSS nesting syntax)
- `css-overflow` (overflow shorthand)

Features not in the ignore list will trigger errors if they are unsupported in Chrome 84. Examples:

- `aspect-ratio` property (Chrome 88+)
- `:is()`, `:where()` selectors (Chrome 88+)

Use overrides to disable checks for additional files that intentionally use unsupported features.

## Custom Rules

This plugin provides 3 custom rules.

| Rule | Type | Auto-fix | Default Severity | Description |
|------|------|----------|------------------|-------------|
| [`no-hard-private`](#no-hard-private) | problem | Supported | error | Enforces TypeScript `private` instead of ECMAScript `#field` |
| [`no-subpath-imports-from-simplysm`](#no-subpath-imports-from-simplysm) | problem | Supported | error | Prohibits importing from `@simplysm/*/src/` paths |
| [`ts-no-throw-not-implemented-error`](#ts-no-throw-not-implemented-error) | suggestion | Not supported | warn | Warns about usage of `NotImplementedError` |

### no-hard-private

Restricts the use of ECMAScript private fields (`#field`). Use TypeScript's `private` keyword and `_` prefix naming instead.

Supports auto-fix with the `--fix` option.

**Detection targets:**

- Class field declarations: `#field`
- Class method declarations: `#method()`
- Class accessor declarations: `accessor #field`
- Member access expressions: `this.#field`

**Valid code:**

```typescript
class Foo {
  private _value = 1;
  private _count: number;

  private _doSomething() {
    return this._value;
  }
}
```

**Invalid code:**

```typescript
class Foo {
  #value = 1;
  #count: number;

  #doSomething() {
    return this.#value;
  }
}
```

**Auto-fix with decorators:**

Members with decorators are also correctly converted. The `private` keyword is inserted after decorators and before other keywords like `static`.

```typescript
// Before fix
class Foo {
  @Deco
  static #value = 1;
}

// After fix
class Foo {
  @Deco
  private static _value = 1;
}
```

**Limitations:**

- If a member with the same name prefixed with `_` already exists, a name conflict occurs. In this case, auto-fix is not applied, and a `nameConflict` message requests manual adjustment.

```typescript
class Foo {
  private _value = 1;
  #value = 2; // Error: Cannot convert "#value" to "_value" (name conflict)
}
```

### no-subpath-imports-from-simplysm

Prohibits importing from `@simplysm/*` packages through `/src/` paths. Only import through the official entry point (package root).

Supports auto-fix with the `--fix` option to convert to package root paths.

**Detection targets:**

- Static import statements: `import ... from '...'`
- Dynamic imports: `import('...')`
- Re-export statements: `export { ... } from '...'`
- Re-export all statements: `export * from '...'`

**Valid code:**

```typescript
import { Foo } from "@simplysm/core-common";
import { Bar } from "@simplysm/core-node";

const mod = await import("@simplysm/core-common");

export { Baz } from "@simplysm/orm-common";
export * from "@simplysm/service-common";
```

**Invalid code:**

```typescript
import { Foo } from "@simplysm/core-common/src/types/DateOnly";
import { Bar } from "@simplysm/core-node/src/utils";

const mod = await import("@simplysm/core-common/src/index");

export { Baz } from "@simplysm/orm-common/src/query-builder";
export * from "@simplysm/service-common/src/protocols";
```

**Allowed subpaths:**

Subpaths other than `/src/` are allowed.

```typescript
// Allowed: not a /src/ path
import { Foo } from "@simplysm/core-common/utils";
```

### ts-no-throw-not-implemented-error

Warns about code that creates `NotImplementedError` from `@simplysm/core-common` with the `new` keyword. This rule prevents unimplemented code from being included in production.

It warns even if only creating without throwing. Auto-fix is not supported.

**Supported import forms:**

| Import Form | Detected |
|-------------|----------|
| named import: `import { NotImplementedError } from "@simplysm/core-common"` | Yes |
| aliased import: `import { NotImplementedError as NIE } from "@simplysm/core-common"` | Yes |
| namespace import: `import * as CC from "@simplysm/core-common"` | Yes |
| dynamic import: `await import("@simplysm/core-common")` | No |
| Re-exported from another module | No |

**Invalid code (warnings):**

```typescript
import { NotImplementedError } from "@simplysm/core-common";

throw new NotImplementedError();                // Warning: "미구현" (default message)
throw new NotImplementedError("Feature X");     // Warning: "Feature X"
const err = new NotImplementedError();           // Warning: "미구현" (default message)
```

**Aliased imports are also detected:**

```typescript
import { NotImplementedError as NIE } from "@simplysm/core-common";

throw new NIE(); // Warning
```

**Namespace imports are also detected:**

```typescript
import * as CC from "@simplysm/core-common";

throw new CC.NotImplementedError(); // Warning
```

**Message display rules:**

- Calling `new NotImplementedError()` without arguments outputs a warning with the Korean default message "미구현".
- If a string argument is passed, that string is used as the warning message.

## recommended Config Details

Full list of rules included in the `eslint-recommended` config.

### Global Ignore Patterns

The following directories are excluded from linting:

- `**/node_modules/**`
- `**/dist/**`
- `**/.*/**`
- `**/_*/**`

### Common Rules (JS/TS)

Rules applied to all JS and TS files.

| Rule | Severity | Description |
|------|----------|-------------|
| `no-console` | error | Prohibit console usage (prevent production performance degradation) |
| `no-warning-comments` | warn | Warn about TODO/FIXME comments (to identify incomplete code) |
| `eqeqeq` | error | Enforce `===`, allow `== null` check |
| `no-self-compare` | error | Prohibit self-comparison like `x === x` (prevent typos) |
| `array-callback-return` | error | Prevent missing `return` in array callbacks like `map`/`filter` |

### Node.js Built-in Module Restrictions

Restrict Node.js-specific API usage for code consistency across all packages.

| Restricted Target | Rule | Alternative |
|-------------------|------|-------------|
| `Buffer` (global) | `no-restricted-globals` | `Uint8Array`, `BytesUtils` from `@simplysm/core-common` |
| `buffer` (import) | `no-restricted-imports` | `Uint8Array`, `BytesUtils` from `@simplysm/core-common` |
| `events` (import) | `no-restricted-imports` | `SdEventEmitter` from `@simplysm/core-common` |
| `eventemitter3` (import) | `no-restricted-imports` | `SdEventEmitter` from `@simplysm/core-common` |

### Unused Imports Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `unused-imports/no-unused-imports` | error | Auto-remove unused imports |
| `unused-imports/no-unused-vars` | error | Detect unused variables (allow `_` prefix variables/arguments) |

### Import Dependency Check

| Rule | Severity | Description |
|------|----------|-------------|
| `import/no-extraneous-dependencies` | error | Prohibit importing external dependencies not declared in `package.json` |

`devDependencies` are only allowed in the following paths:

- JS files: `**/lib/**`, `**/eslint.config.js`, `**/simplysm.js`, `**/vitest.config.js`
- TS files: `**/lib/**`, `**/eslint.config.ts`, `**/simplysm.ts`, `**/vitest.config.ts`, `**/vitest.setup.ts`

### JS-only Rules (.js, .jsx)

Rules applied only to JS files. Not applied to TS files as the TypeScript compiler performs the same checks.

| Rule | Severity | Description |
|------|----------|-------------|
| `require-await` | error | Require `await` in `async` functions |
| `no-shadow` | error | Prohibit variable shadowing |
| `no-duplicate-imports` | error | Prohibit duplicate imports |
| `no-unused-expressions` | error | Prohibit unused expressions |
| `no-undef` | error | Prohibit using undefined variables |

### TypeScript Rules (.ts, .tsx)

Rules applied based on `@typescript-eslint`. Performs precise checks using type information.

#### Async-related

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/require-await` | error | Require `await` in `async` functions |
| `@typescript-eslint/await-thenable` | error | Only allow `await` on thenable objects |
| `@typescript-eslint/return-await` | error | Allow `return await` only inside `try-catch` |
| `@typescript-eslint/no-floating-promises` | error | Prohibit unhandled Promises |
| `@typescript-eslint/no-misused-promises` | error | Prevent error loss when passing async functions to void callbacks (excludes `arguments`, `attributes`) |

#### Type Safety

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/strict-boolean-expressions` | error | Enforce strict boolean expressions (allow nullable boolean/object) |
| `@typescript-eslint/no-unnecessary-condition` | error | Prohibit unnecessary condition checks (allow constant loop conditions) |
| `@typescript-eslint/no-unnecessary-type-assertion` | error | Prohibit unnecessary type assertions |
| `@typescript-eslint/only-throw-error` | error | Prohibit throwing non-Error objects (preserve stack trace) |

#### Code Style

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/no-shadow` | error | Prohibit variable shadowing |
| `@typescript-eslint/prefer-reduce-type-parameter` | error | Recommend using `reduce` type parameter |
| `@typescript-eslint/prefer-return-this-type` | error | Recommend using `this` return type |
| `@typescript-eslint/no-unused-expressions` | error | Prohibit unused expressions |
| `@typescript-eslint/prefer-readonly` | error | Recommend `readonly` for members that don't change |
| `@typescript-eslint/no-array-delete` | error | Prohibit using `delete` on arrays (prevent sparse array bugs) |

#### ts-comment Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/ban-ts-comment` | error | Require 3+ character description for `@ts-expect-error` |

### SolidJS Rules (.ts, .tsx)

Rules applied based on `eslint-plugin-solid`. Applied to both `.ts` and `.tsx` files.

#### Mistake Prevention

| Rule | Severity | Description |
|------|----------|-------------|
| `solid/reactivity` | error | Detect reactivity loss (registers custom reactive functions like `makePersisted`) |
| `solid/no-destructure` | error | Prohibit destructuring props (prevent reactivity loss) |
| `solid/components-return-once` | error | Prohibit early returns in components |
| `solid/jsx-no-duplicate-props` | error | Prohibit duplicate props |
| `solid/jsx-no-undef` | error | Prohibit using undefined JSX variables (TypeScript support enabled) |
| `solid/no-react-deps` | error | Prohibit React-style dependency arrays |
| `solid/no-react-specific-props` | error | Prohibit React-specific props (`className`, etc.) |

#### Security

| Rule | Severity | Description |
|------|----------|-------------|
| `solid/no-innerhtml` | error | Prohibit `innerHTML` usage (prevent XSS) |
| `solid/jsx-no-script-url` | error | Prohibit `javascript:` URLs |

#### Tooling Support

| Rule | Severity | Description |
|------|----------|-------------|
| `solid/jsx-uses-vars` | error | Prevent variables used in JSX from being flagged as unused imports |

#### Conventions

| Rule | Severity | Description |
|------|----------|-------------|
| `solid/prefer-for` | error | Recommend using `For` component |
| `solid/event-handlers` | error | Enforce event handler naming rules |
| `solid/imports` | error | Enforce import consistency |
| `solid/style-prop` | error | Enforce `style` prop format |
| `solid/self-closing-comp` | error | Enforce self-closing tags |

### Tailwind CSS Rules (.ts, .tsx)

Rules applied based on `eslint-plugin-tailwindcss`. Recognizes `clsx` template literal tags.

| Rule | Severity | Description |
|------|----------|-------------|
| `tailwindcss/classnames-order` | warn | Auto-sort class order |
| `tailwindcss/enforces-negative-arbitrary-values` | error | Unify negative arbitrary value format |
| `tailwindcss/enforces-shorthand` | error | Recommend using shorthand |
| `tailwindcss/no-contradicting-classname` | error | Prohibit conflicting classes (`p-2 p-4`, etc.) |
| `tailwindcss/no-custom-classname` | error | Prohibit custom classes not defined in Tailwind |
| `tailwindcss/no-unnecessary-arbitrary-value` | error | Prohibit unnecessary arbitrary values |

### Test File Exception Rules

The following rules are relaxed for test files in `**/tests/**/*.ts`, `**/tests/**/*.tsx` paths:

| Rule | Change | Reason |
|------|--------|--------|
| `no-console` | off | Allow debug output in tests |
| `import/no-extraneous-dependencies` | off | Allow using root `devDependencies` (vitest, etc.) |
| `@simplysm/ts-no-throw-not-implemented-error` | off | Allow using not-implemented errors in test code |
| `solid/reactivity` | off | Accessing signals inside async callbacks like `waitFor` in tests is intentional |

## Configuration Summary by File Type

| File Pattern | Applied Rules |
|--------------|---------------|
| `.js`, `.jsx` | Common rules + JS-only rules + `@simplysm` custom rules + import/unused-imports rules |
| `.ts`, `.tsx` | Common rules + `@typescript-eslint` rules + `@simplysm` custom rules + SolidJS rules + Tailwind CSS rules + import/unused-imports rules |
| `**/tests/**` | Above rules with some relaxed |

## License

Apache-2.0
