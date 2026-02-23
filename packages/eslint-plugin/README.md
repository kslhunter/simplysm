# @simplysm/eslint-plugin

Custom ESLint plugin for the Simplysm framework. Provides 9 custom rules and a pre-configured ESLint 9 flat config for JavaScript, TypeScript, and Angular HTML template files.

## Installation

```bash
yarn add @simplysm/eslint-plugin
```

## Usage

### Recommended Config (Quick Setup)

Use the pre-configured `root` config that includes all recommended rules:

```javascript
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [...simplysm.configs.root];
```

### Manual Rule Configuration

```javascript
// eslint.config.js
import plugin from "@simplysm/eslint-plugin/plugin";

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

## Exports

### Default Export

```typescript
import simplysm from "@simplysm/eslint-plugin";
```

```typescript
{
  configs: {
    root;
  }
}
```

- `configs.root` — ESLint 9 flat config array with all recommended settings for JS/TS/HTML

### Plugin Export

```typescript
import plugin from "@simplysm/eslint-plugin/plugin";
```

```typescript
{ rules: { ... } }  // All 9 custom rules
```

## Custom Rules

### `@simplysm/no-hard-private`

- **Type:** problem
- **Fixable:** yes (auto-fix)
- **Default:** `error`

Disallows ECMAScript private fields (`#field`) and methods (`#method`). Auto-fixes by renaming `#name` to `_name` and inserting the `private` access modifier.

**Example (invalid):**

```typescript
class Foo {
  #count = 0;
  #inc() {
    this.#count++;
  }
}
```

**Auto-fixed to:**

```typescript
class Foo {
  private _count = 0;
  private _inc() {
    this._count++;
  }
}
```

### `@simplysm/no-subpath-imports-from-simplysm`

- **Type:** problem
- **Fixable:** no
- **Default:** `error`

Disallows imports from `@simplysm/*` packages that include a `src` path segment (e.g., `@simplysm/sd-core-common/src/utils/Foo`). Only top-level package imports are allowed.

**Example (invalid):**

```typescript
import { Foo } from "@simplysm/sd-core-common/src/utils/Foo";
```

**Example (valid):**

```typescript
import { Foo } from "@simplysm/sd-core-common";
```

### `@simplysm/ts-no-throw-not-implement-error`

- **Type:** suggestion
- **Fixable:** no
- **Default:** `warn`

Warns when a `ThrowStatement` throws an instance whose TypeScript type is named `NotImplementError`. Requires TypeScript type information (type-aware linting).

**Example (invalid):**

```typescript
throw new NotImplementError();
throw new NotImplementError("custom message");
```

### `@simplysm/ts-no-exported-types`

- **Type:** problem
- **Fixable:** no
- **Default:** not enabled (manual use)

Disallows configured types from appearing in public API surfaces: exported functions (parameters and return type), public class members (methods and properties), and exported variable declarations. Useful for enforcing that certain types (e.g., `Buffer`, typed arrays) are not leaked through public APIs.

Requires TypeScript type information (type-aware linting).

**Options:**

```typescript
{
  types: Array<{
    ban: string; // Type name to ban (e.g., "Buffer")
    safe?: string; // Suggested safe alternative (e.g., "Uint8Array")
    ignoreInGeneric?: boolean; // If true, ignore when the banned type appears as a generic argument
  }>;
}
```

**Example:**

```javascript
// eslint.config.js
{
  rules: {
    "@simplysm/ts-no-exported-types": ["error", {
      types: [
        { ban: "Buffer", safe: "Uint8Array" },
        { ban: "ArrayBuffer", safe: "Buffer", ignoreInGeneric: true },
      ],
    }],
  },
}
```

**Example (invalid with the above config):**

```typescript
// Exported function with banned type in signature
export function read(): Buffer { ... }
export function write(data: Buffer): void { ... }
```

### `@simplysm/ts-no-buffer-in-typedarray-context`

- **Type:** problem
- **Fixable:** no
- **Default:** not enabled (manual use)

Reports usage of Node.js `Buffer` where a `TypedArray` type (`Uint8Array`, `Int8Array`, `Uint16Array`, etc.) is expected. Covers variable declarations, assignments, return statements, call expression arguments, object property values, array elements, and conditional expressions.

Exception: arguments inside `Buffer.*()` static method calls are not reported.

Requires TypeScript type information (type-aware linting).

**Example (invalid):**

```typescript
const arr: Uint8Array = Buffer.from("hello"); // Buffer assigned where Uint8Array expected
```

**Example (valid):**

```typescript
const arr: Uint8Array = new Uint8Array(Buffer.from("hello")); // explicit conversion
```

### `@simplysm/ts-no-unused-injects`

- **Type:** problem
- **Fixable:** yes (auto-fix)
- **Default:** `error`

Detects Angular `inject()` calls assigned to class fields that are never referenced anywhere else in the class body. Auto-removes the entire field declaration.

**Example (invalid):**

```typescript
@Component({ ... })
class MyComponent {
  readonly router = inject(Router); // never used — will be removed
}
```

### `@simplysm/ts-no-unused-protected-readonly`

- **Type:** problem
- **Fixable:** yes (auto-fix)
- **Default:** `error`

Detects `protected readonly` (non-static) class fields in Angular `@Component` classes that are not referenced in the component's inline template string or in any other class member. Auto-removes the entire field declaration, including surrounding whitespace and semicolon.

Only applies to classes decorated with `@Component` that have an inline `template` property.

**Example (invalid):**

```typescript
@Component({
  template: `
    <div>Hello</div>
  `,
})
class MyComponent {
  protected readonly someService = inject(SomeService); // not used in template or class
}
```

### `@simplysm/ng-template-no-todo-comments`

- **Type:** problem
- **Fixable:** no
- **Default:** `warn`

Warns on `TODO:` comments found inside Angular HTML template comment blocks (`<!-- ... -->`). The reported message is the text following `TODO:`.

**Example (invalid):**

```html
<!-- TODO: remove this after refactor -->
```

### `@simplysm/ng-template-sd-require-binding-attrs`

- **Type:** problem
- **Fixable:** yes (auto-fix)
- **Default:** `error`

Disallows plain (non-binding) attributes on elements whose tag name starts with a configured selector prefix (default: `sd-`). All attributes must use Angular property binding syntax `[attr]="value"` unless they are in the allow-list.

Auto-fixes by converting plain attributes to property bindings:

- `attr="value"` → `[attr]="'value'"`
- `attr` (no value, boolean) → `[attr]="true"`

**Default options:**

```typescript
{
  selectorPrefixes: ["sd-"],
  allowAttributes: ["id", "class", "style", "title", "tabindex", "role"],
  allowAttributePrefixes: ["aria-", "data-", "sd-"],
}
```

**Options schema:**

```typescript
{
  selectorPrefixes?: string[];      // Tag name prefixes to apply the rule to
  allowAttributes?: string[];       // Exact attribute names allowed as plain attributes
  allowAttributePrefixes?: string[]; // Attribute name prefixes allowed as plain attributes
}
```

**Example (invalid):**

```html
<sd-textfield type="text" placeholder="Enter value"></sd-textfield>
```

**Auto-fixed to:**

```html
<sd-textfield [type]="'text'" [placeholder]="'Enter value'"></sd-textfield>
```

**Example (valid — uses property binding or allow-listed attrs):**

```html
<sd-textfield [type]="'text'" class="my-class" [placeholder]="placeholder"></sd-textfield>
```

## Pre-configured Config Details

The `configs.root` flat config array includes:

- **Ignores:** `node_modules/`, `dist/`, `tests/`, `.*`, `_*`
- **Globals:** Node.js + ES2021 + Browser
- **Plugins:** `import`, `unused-imports`, `@simplysm`, `@typescript-eslint`, `@angular-eslint`
- **File types:** `.js`, `.jsx`, `.ts`, `.tsx`, `.html` (Angular templates)

Key rules enabled per file type:

**JS/JSX files:**

- `eqeqeq` — error (always, except null)
- `no-console` — warn
- `no-warning-comments` — warn
- `no-shadow` — error
- `no-duplicate-imports` — error
- `no-unused-expressions` — error
- `no-undef` — error
- `require-await` — error
- `unused-imports/no-unused-imports` — error
- `unused-imports/no-unused-vars` — error (ignores `_`-prefixed names)
- `import/no-extraneous-dependencies` — error (allows dev deps in spec/config files)
- `@simplysm/no-subpath-imports-from-simplysm` — error
- `@simplysm/no-hard-private` — error

**TS/TSX files** (includes all JS rules plus):

- `@typescript-eslint/require-await` — error
- `@typescript-eslint/await-thenable` — error
- `@typescript-eslint/return-await` — error (always)
- `@typescript-eslint/no-floating-promises` — error
- `@typescript-eslint/no-shadow` — error
- `@typescript-eslint/no-unnecessary-condition` — error (allows constant loop conditions)
- `@typescript-eslint/no-unnecessary-type-assertion` — error
- `@typescript-eslint/non-nullable-type-assertion-style` — error
- `@typescript-eslint/prefer-reduce-type-parameter` — error
- `@typescript-eslint/prefer-return-this-type` — error
- `@typescript-eslint/typedef` — error
- `@typescript-eslint/no-unused-expressions` — error
- `@typescript-eslint/strict-boolean-expressions` — error (allows nullable boolean/object)
- `@typescript-eslint/prefer-ts-expect-error` — error
- `@typescript-eslint/prefer-readonly` — error
- `@simplysm/ts-no-throw-not-implement-error` — warn
- `@simplysm/ts-no-unused-injects` — error
- `@simplysm/ts-no-unused-protected-readonly` — error
- Angular template processor: `angular-eslint/processInlineTemplates`

**HTML files** (Angular templates):

- `@simplysm/ng-template-no-todo-comments` — warn
- `@simplysm/ng-template-sd-require-binding-attrs` — error
