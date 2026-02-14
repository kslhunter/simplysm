# CSS Lint Support via Stylelint

## Summary

Add CSS file linting to the project using Stylelint, integrated alongside existing ESLint setup. Primary goals:
1. **Chrome 84+ compatibility checking** — detect unsupported CSS features early
2. **CSS import/url file existence checking** — catch broken `@import` and `url()` paths at lint time

## Package Rename: eslint-plugin → lint

Rename `@simplysm/eslint-plugin` to `@simplysm/lint` with subpath exports.

### Structure

```
packages/lint/
├── src/
│   ├── eslint-plugin.ts              # ESLint custom rules (renamed from plugin.ts)
│   ├── eslint-recommended.ts         # ESLint recommended config (moved from configs/)
│   ├── stylelint-recommended.ts      # Stylelint shared config (new)
│   ├── rules/                        # ESLint custom rules (unchanged)
│   └── utils/                        # ESLint rule utilities (unchanged)
├── package.json
```

### package.json exports

```json
{
  "name": "@simplysm/lint",
  "exports": {
    "./eslint-plugin": {
      "types": "./dist/eslint-plugin.d.ts",
      "default": "./dist/eslint-plugin.js"
    },
    "./eslint-recommended": {
      "types": "./dist/eslint-recommended.d.ts",
      "default": "./dist/eslint-recommended.js"
    },
    "./stylelint-recommended": {
      "types": "./dist/stylelint-recommended.d.ts",
      "default": "./dist/stylelint-recommended.js"
    }
  }
}
```

### Consumer Usage

```ts
// eslint.config.ts
import simplysmEslintRecommended from "@simplysm/lint/eslint-recommended";
export default [...simplysmEslintRecommended];

// stylelint.config.ts
export { default } from "@simplysm/lint/stylelint-recommended";
```

## Stylelint Recommended Config

```ts
// stylelint-recommended.ts
export default {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-tailwindcss",
  ],
  plugins: [
    "stylelint-no-unsupported-browser-features",
    "stylelint-no-unresolved-module",
  ],
  rules: {
    "plugin/no-unsupported-browser-features": [true, {
      severity: "error",
      browsers: ["chrome >= 84"],
    }],
    "plugin/no-unresolved-module": true,
  },
};
```

### Dependencies (packages/lint)

New dependencies:
- `stylelint`
- `stylelint-config-standard`
- `stylelint-config-tailwindcss`
- `stylelint-no-unsupported-browser-features`
- `stylelint-no-unresolved-module`

## sd-cli Lint Integration

`packages/sd-cli/src/commands/lint.ts` adds Stylelint step:

```
ESLint 설정 로드 → TS/JS 파일 수집 → ESLint 실행 → 결과 출력
Stylelint 설정 로드 → CSS 파일 수집(*.css) → Stylelint 실행 → 결과 출력
```

- Sequential execution (Listr tasks)
- Skip Stylelint step if `stylelint.config.ts` not found
- `--fix` applies to both ESLint and Stylelint
- Either tool's errors set `process.exitCode = 1`
- Add `stylelint` dependency to `sd-cli/package.json`

## Migration (eslint-plugin → lint)

### File Changes
- `packages/eslint-plugin/` → `packages/lint/` (rename folder)
- `src/configs/recommended.ts` → `src/eslint-recommended.ts`
- `src/plugin.ts` → `src/eslint-plugin.ts`
- `src/index.ts` removed (replaced by subpath exports)
- `src/stylelint-recommended.ts` created (new)

### Reference Updates
- `eslint.config.ts` (root): update import path
- `sd-cli/templates/init/eslint.config.ts.hbs`: `@simplysm/eslint-plugin` → `@simplysm/lint/eslint-recommended`
- `sd-cli/tests/config-editor.spec.ts`: update import paths in test fixtures
- `CLAUDE.md`: update package name references

### New Template
- `sd-cli/templates/init/stylelint.config.ts.hbs`

### Ignored
- `.legacy-packages/` — legacy, no update needed

## CSS Files in Scope

Source CSS files that will be linted:
- `packages/solid/tailwind.css`
- `packages/solid/src/components/**/*.css` (5 files)
- `packages/solid-demo/src/main.css`
