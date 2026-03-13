# @simplysm/eslint-plugin

ESLint plugin providing custom rules and a shared flat config for Simplysm monorepo projects.

## Installation

```bash
npm install @simplysm/eslint-plugin
# or
yarn add @simplysm/eslint-plugin
```

### Peer Dependencies

- `eslint` >= 9
- `typescript` ~5.8
- `typescript-eslint` >= 8
- `angular-eslint` >= 20 (for Angular template rules)

## Usage

### Using the Shared Config

The plugin exports a `root` flat config that includes all recommended rules along with
third-party plugin configurations (typescript-eslint, angular-eslint, eslint-plugin-import,
eslint-plugin-unused-imports).

```js
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  ...simplysm.configs.root,
];
```

The `root` config applies rules to three file groups:

| Files | Plugins Enabled |
|---|---|
| `**/*.js`, `**/*.jsx` | `@simplysm`, `import`, `unused-imports` |
| `**/*.ts`, `**/*.tsx` | `@simplysm`, `@typescript-eslint`, `@angular-eslint`, `import`, `unused-imports` |
| `**/*.html` | `@simplysm` (Angular template rules) |

### Using Individual Rules

You can also use the plugin directly and enable specific rules:

```js
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": simplysm,
    },
    rules: {
      "@simplysm/no-hard-private": "error",
      "@simplysm/no-subpath-imports-from-simplysm": "error",
    },
  },
];
```

## Rules

### General Rules

#### `no-hard-private`

Enforce TypeScript `private` keyword over ECMAScript `#` private fields.

- **Type:** problem
- **Fixable:** code
- **Recommended severity:** `error`

Disallows `#field` syntax and auto-fixes to `private _field`.

```ts
// Bad
class Foo {
  #count = 0;
  #getValue() { return this.#count; }
}

// Good
class Foo {
  private _count = 0;
  private _getValue() { return this._count; }
}
```

#### `no-subpath-imports-from-simplysm`

Disallow `src` subpath imports from `@simplysm/*` packages.

- **Type:** problem
- **Recommended severity:** `error`

```ts
// Bad
import { something } from "@simplysm/sd-core-common/src/utils";

// Good
import { something } from "@simplysm/sd-core-common";
```

---

### TypeScript Rules

These rules require type information (`parserOptions.project: true`).

#### `ts-no-throw-not-implement-error`

Warn when `NotImplementError` is thrown, serving as a reminder for unfinished implementations.

- **Type:** suggestion
- **Recommended severity:** `warn`

```ts
// Triggers warning
throw new NotImplementError("feature X");
```

#### `ts-no-exported-types`

Disallow specified types from being exposed in exported APIs or public class members, suggesting safer alternatives.

- **Type:** problem
- **Recommended severity:** `error`
- **Schema:** accepts a `types` array with `ban`, `safe`, and `ignoreInGeneric` options

Checks exported functions, public methods, public properties, and exported variables.

```js
// eslint.config.js rule example
"@simplysm/ts-no-exported-types": ["error", {
  types: [
    { ban: "ArrayBuffer", safe: "Buffer", ignoreInGeneric: true },
    { ban: "Uint8Array", safe: "Buffer" },
  ],
}]
```

#### `ts-no-buffer-in-typedarray-context`

Disallow `Buffer` being used directly where a TypedArray is expected. Covers assignments, return statements, function call arguments, object properties, array elements, and conditional expressions.

- **Type:** problem
- **Recommended severity:** `error`

```ts
// Bad
const arr: Uint8Array = Buffer.from([1, 2, 3]);

// Good
const arr: Uint8Array = new Uint8Array(Buffer.from([1, 2, 3]));
```

#### `ts-no-unused-injects`

Disallow unused Angular `inject()` fields. Auto-removes the unused field declaration.

- **Type:** problem
- **Fixable:** code
- **Recommended severity:** `error`

```ts
// Bad - myService is never referenced
class MyComponent {
  private readonly myService = inject(MyService);
}

// Good
class MyComponent {
  private readonly myService = inject(MyService);

  doWork() {
    this.myService.execute();
  }
}
```

#### `ts-no-unused-protected-readonly`

Disallow unused `protected readonly` fields in Angular `@Component` classes. Checks both class body usage and inline template references.

- **Type:** problem
- **Fixable:** code
- **Recommended severity:** `error`

```ts
// Bad - cdr is not used in class or template
@Component({ template: `<div>hello</div>` })
class MyComponent {
  protected readonly cdr = inject(ChangeDetectorRef);
}
```

---

### Angular Template Rules

These rules apply to `.html` files parsed with `angular-eslint/template-parser`.

#### `ng-template-no-todo-comments`

Warn on `TODO:` comments inside HTML templates.

- **Type:** problem
- **Recommended severity:** `warn`

```html
<!-- Bad -->
<!-- TODO: replace with real content -->

<!-- Good (no TODO comments) -->
<!-- This section displays user info -->
```

#### `ng-template-sd-require-binding-attrs`

Disallow non-whitelisted plain attributes on components with specified selector prefixes (default: `sd-*`). Requires using Angular property bindings instead.

- **Type:** problem
- **Fixable:** code
- **Recommended severity:** `error`
- **Schema:** accepts `selectorPrefixes`, `allowAttributes`, and `allowAttributePrefixes` options

Default allowed plain attributes: `id`, `class`, `style`, `title`, `tabindex`, `role`.
Default allowed attribute prefixes: `aria-`, `data-`, `sd-`.

```html
<!-- Bad -->
<sd-button color="primary">Click</sd-button>

<!-- Good -->
<sd-button [color]="'primary'">Click</sd-button>
```

```js
// Custom options
"@simplysm/ng-template-sd-require-binding-attrs": ["error", {
  selectorPrefixes: ["sd-", "app-"],
  allowAttributes: ["id", "class", "style"],
  allowAttributePrefixes: ["aria-", "data-"],
}]
```

## Configs

| Config | Description |
|---|---|
| `root` | Full flat config with all recommended rules, typescript-eslint, angular-eslint, import, and unused-imports plugins configured |

## License

MIT
