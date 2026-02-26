# @simplysm/lint

Lint configuration for the Simplysm framework. Provides an ESLint plugin with custom rules and recommended flat configs for ESLint and Stylelint.

## Installation

```
pnpm add @simplysm/lint
```

## Source Index

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/eslint-plugin.ts` | default: `{ rules: { "no-hard-private", "no-subpath-imports-from-simplysm", "ts-no-throw-not-implemented-error" } }` | ESLint plugin that bundles all custom Simplysm rules under `@simplysm/*` | `tests/no-hard-private.spec.ts`, `tests/no-subpath-imports-from-simplysm.spec.ts`, `tests/ts-no-throw-not-implemented-error.spec.ts` |
| `src/eslint-recommended.ts` | default: ESLint flat config array (TS, SolidJS, Tailwind CSS rules) | Recommended ESLint flat config for TS, SolidJS, and Tailwind CSS projects | `tests/recommended.spec.ts` |
| `src/stylelint-recommended.ts` | default: Stylelint config (Chrome 84+, Tailwind CSS, file resolution) | Recommended Stylelint config targeting Chrome 84+ with Tailwind CSS support | - |
| `src/rules/no-hard-private.ts` | ESLint rule: prohibit ECMAScript `#field` private syntax | Enforces TypeScript `private _` style instead of hard private `#field` syntax | - |
| `src/rules/no-subpath-imports-from-simplysm.ts` | ESLint rule: prohibit `@simplysm/*/src/` import paths | Prevents direct `src/` subpath imports from `@simplysm/*` packages | - |
| `src/rules/ts-no-throw-not-implemented-error.ts` | ESLint rule: warn on `new NotImplementedError()` usage | Warns when `NotImplementedError` from `@simplysm/core-common` is instantiated | - |
| `src/utils/create-rule.ts` | `createRule` utility for defining typed ESLint rules | Factory wrapper around `RuleCreator` for authoring typed ESLint rules | - |

## License

Apache-2.0
