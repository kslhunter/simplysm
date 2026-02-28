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
| `src/rules/no-hard-private.ts` | `default` (ESLint rule) | Enforces TypeScript `private _` style instead of hard private `#field` syntax | `tests/no-hard-private.spec.ts` |
| `src/rules/no-subpath-imports-from-simplysm.ts` | `default` (ESLint rule) | Prevents direct `src/` subpath imports from `@simplysm/*` packages | `tests/no-subpath-imports-from-simplysm.spec.ts` |
| `src/rules/ts-no-throw-not-implemented-error.ts` | `default` (ESLint rule) | Warns when `NotImplementedError` from `@simplysm/core-common` is instantiated | `tests/ts-no-throw-not-implemented-error.spec.ts` |
| `src/utils/create-rule.ts` | `createRule` | Factory wrapper around `RuleCreator` for authoring typed ESLint rules | - |

## License

Apache-2.0
