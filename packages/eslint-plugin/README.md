# @simplysm/eslint-plugin

ESLint plugin with custom rules and a shared flat config for Simplysm monorepo projects. Provides a ready-to-use `root` config and 9 custom rules covering TypeScript best practices, Angular template conventions, and Simplysm-specific import restrictions.

## Installation

```bash
npm install @simplysm/eslint-plugin
```

## API Overview

### Plugin Export

| API | Type | Description |
|-----|------|-------------|
| `default` | Plugin object | Default export with `configs.root` and 9 custom rules |

### Custom Rules

| Rule | Type | Description |
|------|------|-------------|
| `ts-no-throw-not-implement-error` | suggestion | Warns on `NotImplementError` usage |
| `ts-no-exported-types` | problem | Forbids specified types from being exposed in export APIs or public class members |
| `ts-no-buffer-in-typedarray-context` | problem | Forbids using `Buffer` where a TypedArray is expected |
| `ng-template-no-todo-comments` | problem | Warns on TODO comments in Angular HTML templates |
| `no-subpath-imports-from-simplysm` | problem | Forbids subpath imports from `@simplysm` packages (e.g., `@simplysm/pkg/src/x`) |
| `ng-template-sd-require-binding-attrs` | problem | Requires binding syntax for attributes on `sd-` prefixed components |
| `no-hard-private` | problem | Enforces TypeScript `private _` style over ECMAScript `#` private fields (auto-fixable) |
| `ts-no-unused-injects` | problem | Disallows unused Angular `inject()` fields (auto-fixable) |
| `ts-no-unused-protected-readonly` | problem | Disallows unused `protected readonly` fields in Angular components (auto-fixable) |

## API Reference

### Default Export

```typescript
export default {
  configs: {
    root: FlatConfig[]
  }
}
```

The plugin object contains:
- `configs.root` -- A flat ESLint config array that sets up all recommended rules for Simplysm projects

### `configs.root`

A complete flat ESLint configuration array that includes:

- **Global ignores**: `node_modules/`, `dist/`, `tests/`, `.*`, `_*`
- **Language globals**: Node.js, ES2021, and browser globals
- **JS/JSX rules**: `eqeqeq`, `no-console` (warn), `no-shadow`, `require-await`, unused imports enforcement, import dependency checks, and Simplysm rules (`no-subpath-imports-from-simplysm`, `no-hard-private`)
- **TS/TSX rules**: All JS rules plus TypeScript-specific rules (`strict-boolean-expressions`, `no-floating-promises`, `return-await`, `prefer-readonly`, `typedef`, `no-unnecessary-condition`, etc.), Angular ESLint inline template processing, and additional Simplysm rules (`ts-no-throw-not-implement-error`, `ts-no-unused-injects`, `ts-no-unused-protected-readonly`)
- **HTML rules**: Angular template parser with `ng-template-no-todo-comments` and `ng-template-sd-require-binding-attrs`

### `ts-no-throw-not-implement-error`

Warns when `NotImplementError` is thrown, flagging unfinished implementations.

```javascript
"@simplysm/ts-no-throw-not-implement-error": ["warn"]
```

### `ts-no-exported-types`

Forbids specified types from appearing in exported APIs or public class members, suggesting safer alternatives.

```javascript
"@simplysm/ts-no-exported-types": ["error", {
  types: [
    { ban: "ArrayBuffer", safe: "Buffer", ignoreInGeneric: true },
    { ban: "Uint8Array", safe: "Buffer" },
  ]
}]
```

### `ts-no-buffer-in-typedarray-context`

Prevents using `Buffer` in contexts where a standard TypedArray (e.g., `Uint8Array`) is expected.

```javascript
"@simplysm/ts-no-buffer-in-typedarray-context": ["error"]
```

### `ng-template-no-todo-comments`

Warns on TODO/FIXME comments found in Angular HTML templates.

```javascript
"@simplysm/ng-template-no-todo-comments": ["warn"]
```

### `no-subpath-imports-from-simplysm`

Forbids deep subpath imports from `@simplysm` packages. Only the package entry point is allowed.

```javascript
"@simplysm/no-subpath-imports-from-simplysm": ["error"]
```

### `ng-template-sd-require-binding-attrs`

Requires binding syntax (`[attr]`, `(event)`, etc.) for attributes on components with `sd-` prefix selectors. Plain HTML attributes like `id`, `class`, `style`, `title`, `tabindex`, `role`, and attributes with `aria-`, `data-`, `sd-` prefixes are allowed.

```javascript
"@simplysm/ng-template-sd-require-binding-attrs": ["error"]
```

### `no-hard-private`

Enforces TypeScript `private _` convention over ECMAScript `#` private fields. Auto-fixable.

```javascript
"@simplysm/no-hard-private": ["error"]
```

### `ts-no-unused-injects`

Disallows unused Angular `inject()` fields. Auto-fixable -- removes the unused field.

```javascript
"@simplysm/ts-no-unused-injects": ["error"]
```

### `ts-no-unused-protected-readonly`

Disallows unused `protected readonly` fields in Angular components. A field is considered "used" if it appears in the class body or the component's template. Auto-fixable.

```javascript
"@simplysm/ts-no-unused-protected-readonly": ["error"]
```

## Usage Examples

### Using the root config (recommended)

```javascript
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  ...simplysm.configs.root,
];
```

### Using individual rules

```javascript
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": simplysm,
    },
    rules: {
      "@simplysm/no-hard-private": ["error"],
      "@simplysm/no-subpath-imports-from-simplysm": ["error"],
      "@simplysm/ts-no-unused-injects": ["error"],
    },
  },
];
```
