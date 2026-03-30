# @simplysm/lint

Shared ESLint plugin and recommended configuration for Simplysm projects.

## Installation

```bash
npm install @simplysm/lint
```

## Entrypoints

### `@simplysm/lint/eslint-plugin`

ESLint plugin providing 7 custom rules for Angular/TypeScript projects.

```typescript
import plugin from "@simplysm/lint/eslint-plugin";
```

Default export: `{ rules: { ... } }`

#### Rules

| Rule | Type | Fixable | Description |
|---|---|---|---|
| `ng-template-no-todo-comments` | problem | no | Warn on TODO comments inside Angular HTML templates |
| `ng-template-sd-require-binding-attrs` | problem | yes | Disallow non-whitelisted plain attributes on `sd-*` prefixed components; require Angular property bindings instead |
| `no-hard-private` | problem | yes | Disallow ES hard private fields (`#field`); require TypeScript `private _field` style instead |
| `no-subpath-imports-from-simplysm` | problem | yes | Disallow importing from `@simplysm/*/src/*` subpaths (use package entrypoints) |
| `ts-no-throw-not-implemented-error` | suggestion | no | Warn on `NotImplementedError` usage (indicates unfinished implementation) |
| `ts-no-unused-injects` | problem | yes | Disallow unused Angular `inject()` fields |
| `ts-no-unused-protected-readonly` | problem | yes | Disallow unused `protected readonly` fields in Angular components |

### `@simplysm/lint/eslint-recommended`

Pre-configured ESLint flat config for Simplysm projects.

```typescript
import recommended from "@simplysm/lint/eslint-recommended";
```

Default export: a complete ESLint flat config array (from `tseslint.config()`).

#### Included Configurations

- `angular-eslint` template recommended + accessibility
- `typescript-eslint` recommended rules
- `eslint-plugin-import` (extraneous dependency checking)
- `eslint-plugin-unused-imports` (auto-remove unused imports)
- All 7 `@simplysm/lint/eslint-plugin` rules

#### Key Rules Enabled

- `eqeqeq` (always, null-ignore)
- `no-console` (error in .ts files)
- `@typescript-eslint/require-await`, `await-thenable`, `no-floating-promises`
- `@typescript-eslint/strict-boolean-expressions` (nullable boolean/object allowed)
- `@typescript-eslint/prefer-readonly`
- `@typescript-eslint/no-unnecessary-condition`
- Bans `Buffer`, `events`, `eventemitter3` imports
- Test files (`**/tests/**/*.ts`): relaxes `no-console`, `import/no-extraneous-dependencies`, `ts-no-throw-not-implemented-error`

#### File Patterns

| Pattern | Applied Rules |
|---|---|
| `**/*.js`, `**/*.mjs`, `**/*.cjs` | Common rules + import checks + unused imports + no-hard-private + no-subpath-imports |
| `**/*.ts` | Full TypeScript rules + Angular rules + all custom rules |
| `**/*.html` | Angular template rules (no-todo-comments, sd-require-binding-attrs) |
| `**/tests/**/*.ts` | Relaxed rules (no-console off, extraneous deps off) |

#### Ignored Patterns

- `**/node_modules/**`
- `**/dist/**`
- `**/.*/**`
- `**/_*/**`

## Usage

### eslint.config.js

```javascript
import recommended from "@simplysm/lint/eslint-recommended";

export default [
  ...recommended,
  // add project-specific overrides here
];
```

### Use plugin rules individually

```javascript
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

## Internal Utility

### `createRule`

Factory function for creating ESLint rules. Wraps `@typescript-eslint/utils` `RuleCreator` with auto-generated documentation URLs. This utility is used internally by all rule implementations but is **not publicly exported** via package entrypoints.
