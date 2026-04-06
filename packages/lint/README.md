# @simplysm/lint

Shared ESLint plugin and recommended configuration for Simplysm projects.

## Installation

```bash
npm install @simplysm/lint
```

## API Overview

### `@simplysm/lint/eslint-plugin`

| API | Type | Description |
|-----|------|-------------|
| `default` | object | ESLint plugin object (`{ rules: { ... } }`) containing 7 custom rules for Angular/TypeScript projects |

```typescript
import plugin from "@simplysm/lint/eslint-plugin";
```

#### Rules

| Rule | Type | Fixable | Description |
|---|---|---|---|
| `ng-template-no-todo-comments` | problem | no | Warn on `<!-- TODO: ... -->` comments inside Angular HTML templates |
| `ng-template-sd-require-binding-attrs` | problem | yes | Disallow non-whitelisted plain attributes on `sd-*` prefixed components; require Angular property bindings (`[attr]="..."`) instead |
| `no-hard-private` | problem | yes | Disallow ES hard private fields (`#field`); autofix to TypeScript `private _field` style. Reports name conflicts when `_field` already exists |
| `no-subpath-imports-from-simplysm` | problem | yes | Disallow importing from `@simplysm/*/src/*` subpaths; autofix to package entrypoint (`@simplysm/pkg`). Covers static imports, dynamic imports, and re-exports |
| `ts-no-throw-not-implemented-error` | suggestion | no | Warn on `new NotImplementedError()` from `@simplysm/core-common` (named, aliased, and namespace imports). Displays the error message argument or "unimplemented" |
| `ts-no-unused-injects` | problem | yes | Disallow unused Angular `inject()` fields; autofix removes the entire field declaration |
| `ts-no-unused-protected-readonly` | problem | yes | Disallow unused `protected readonly` fields in `@Component` classes; checks both class body and inline template references |

#### `ng-template-sd-require-binding-attrs` Options

```typescript
interface RuleOptions {
  selectorPrefixes?: string[];      // default: ["sd-"]
  allowAttributes?: string[];       // default: ["id", "class", "style", "title", "tabindex", "role"]
  allowAttributePrefixes?: string[]; // default: ["aria-", "data-", "sd-"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectorPrefixes` | `string[]` | Tag name prefixes that trigger the rule (case-insensitive matching) |
| `allowAttributes` | `string[]` | Exact attribute names allowed as plain attributes (case-insensitive) |
| `allowAttributePrefixes` | `string[]` | Attribute name prefixes allowed as plain attributes (case-insensitive) |

### `@simplysm/lint/eslint-recommended`

| API | Type | Description |
|-----|------|-------------|
| `default` | `FlatConfig.ConfigArray` | Complete ESLint flat config array from `tseslint.config()` |

```typescript
import recommended from "@simplysm/lint/eslint-recommended";
```

#### Included Configurations

- `angular-eslint` template recommended + accessibility
- `typescript-eslint` parser and recommended rules
- `eslint-plugin-import` (extraneous dependency checking with `eslint-import-resolver-typescript`)
- `eslint-plugin-unused-imports` (auto-remove unused imports, unused vars with `_` prefix ignored)
- All 7 `@simplysm/lint/eslint-plugin` rules

#### Key Rules Enabled

- `eqeqeq` (always, null-ignore)
- `no-console` (error in `.ts` files)
- `no-warning-comments` (warn)
- `@typescript-eslint/require-await`, `await-thenable`, `no-floating-promises`
- `@typescript-eslint/strict-boolean-expressions` (nullable boolean/object allowed)
- `@typescript-eslint/prefer-readonly`
- `@typescript-eslint/no-unnecessary-condition` (constant loop conditions allowed)
- `@typescript-eslint/no-unnecessary-type-assertion`
- `@typescript-eslint/only-throw-error`
- `@typescript-eslint/no-array-delete`
- `@typescript-eslint/no-misused-promises` (void return arguments allowed)
- `@typescript-eslint/ban-ts-comment` (ts-expect-error with description >= 3 chars)
- `@typescript-eslint/return-await` (in-try-catch)
- Bans `Buffer`, `events`, `eventemitter3` imports
- Test files (`**/tests/**/*.ts`): relaxes `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error`

#### File Patterns

| Pattern | Applied Rules |
|---|---|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | Common rules + `require-await` + import checks + unused imports + `no-hard-private` + `no-subpath-imports` + Node builtins ban |
| `**/*.ts` | Full TypeScript rules + Angular inline template processing + all custom rules |
| `**/*.html` | Angular template recommended + accessibility + `ng-template-no-todo-comments` + `ng-template-sd-require-binding-attrs` |
| `**/tests/**/*.ts` | Relaxed rules (`no-console` off, extraneous deps off, `ts-no-throw-not-implemented-error` off) |

#### Ignored Patterns

- `**/node_modules/**`
- `**/dist/**`
- `**/.*/**`
- `**/_*/**`

### Internal Utility: `createRule`

Factory function wrapping `@typescript-eslint/utils` `RuleCreator` with auto-generated documentation URLs. Used internally by all rule implementations; **not publicly exported** via package entrypoints.

```typescript
export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/kslhunter/simplysm/blob/master/packages/eslint-plugin/README.md#${name}`,
);
```

## Usage Examples

### Use the recommended config

```javascript
// eslint.config.js
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
  // add project-specific overrides here
];
```

### Use plugin rules individually

```javascript
// eslint.config.js
import plugin from "@simplysm/lint/eslint-plugin";

export default [
  {
    plugins: { "@simplysm": plugin },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/ts-no-unused-injects": "error",
    },
  },
];
```

### Customize `ng-template-sd-require-binding-attrs` options

```javascript
{
  rules: {
    "@simplysm/ng-template-sd-require-binding-attrs": ["error", {
      selectorPrefixes: ["sd-", "app-"],       // default: ["sd-"]
      allowAttributes: ["id", "class", "style"], // default: ["id", "class", "style", "title", "tabindex", "role"]
      allowAttributePrefixes: ["aria-", "data-"], // default: ["aria-", "data-", "sd-"]
    }],
  },
}
```
