# CSS Lint Support via Stylelint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add CSS linting (Chrome 84 compat + import resolution) via Stylelint, renaming `@simplysm/eslint-plugin` to `@simplysm/lint` with subpath exports.

**Architecture:** Rename `packages/eslint-plugin` → `packages/lint`. Provide `eslint-plugin`, `eslint-recommended`, `stylelint-recommended` as subpath exports. Integrate Stylelint into `sd-cli lint` alongside ESLint.

**Tech Stack:** Stylelint, stylelint-config-standard, stylelint-config-tailwindcss, stylelint-no-unsupported-browser-features, stylelint-no-unresolved-module

---

### Task 1: Rename `eslint-plugin` folder and update package.json

**Files:**
- Rename: `packages/eslint-plugin/` → `packages/lint/`
- Modify: `packages/lint/package.json`

**Step 1: Rename directory**

```bash
git mv packages/eslint-plugin packages/lint
```

**Step 2: Update package.json**

Edit `packages/lint/package.json`:
- `name`: `"@simplysm/eslint-plugin"` → `"@simplysm/lint"`
- `description`: `"심플리즘 패키지 - ESLINT 플러그인"` → `"심플리즘 패키지 - Lint 설정 (ESLint + Stylelint)"`
- `repository.directory`: `"packages/eslint-plugin"` → `"packages/lint"`
- Remove `main` and `types` fields (replaced by `exports`)
- Add `exports`:

```json
{
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

- Add Stylelint dependencies:

```json
{
  "dependencies": {
    "stylelint": "^16.x",
    "stylelint-config-standard": "^37.x",
    "stylelint-config-tailwindcss": "^1.x",
    "stylelint-no-unsupported-browser-features": "^8.x",
    "stylelint-no-unresolved-module": "^2.x"
  }
}
```

(Use latest compatible versions when installing.)

**Step 3: Run pnpm install**

```bash
pnpm install
```

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: rename eslint-plugin to lint, add stylelint deps"
```

---

### Task 2: Reorganize source files and update internal imports

**Files:**
- Rename: `packages/lint/src/plugin.ts` → `packages/lint/src/eslint-plugin.ts`
- Rename: `packages/lint/src/configs/recommended.ts` → `packages/lint/src/eslint-recommended.ts`
- Delete: `packages/lint/src/index.ts`
- Delete: `packages/lint/src/configs/` (empty directory after move)

**Step 1: Rename plugin.ts → eslint-plugin.ts**

```bash
git mv packages/lint/src/plugin.ts packages/lint/src/eslint-plugin.ts
```

**Step 2: Rename recommended.ts → eslint-recommended.ts (move up one level)**

```bash
git mv packages/lint/src/configs/recommended.ts packages/lint/src/eslint-recommended.ts
rmdir packages/lint/src/configs
```

**Step 3: Update import in eslint-recommended.ts**

The file currently imports `from "../plugin"`. Change to:

```ts
import plugin from "./eslint-plugin";
```

(Line 3 of the current `recommended.ts`)

**Step 4: Delete index.ts**

```bash
git rm packages/lint/src/index.ts
```

The old `index.ts` re-exported `plugin` and `configs.recommended`. This is replaced by subpath exports in `package.json`.

**Step 5: Update test imports**

In `packages/lint/tests/recommended.spec.ts`:
- `from "../src/configs/recommended"` → `from "../src/eslint-recommended"`
- `from "../src/plugin"` → `from "../src/eslint-plugin"`

In all rule test files (`packages/lint/tests/no-hard-private.spec.ts`, `no-subpath-imports-from-simplysm.spec.ts`, `ts-no-throw-not-implemented-error.spec.ts`):
- Check if they import from `../src/plugin` or `../src/rules/*` and update if needed.

**Step 6: Verify tests pass**

```bash
pnpm vitest packages/lint --run --project=node
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor: reorganize lint package source files"
```

---

### Task 3: Create stylelint-recommended.ts

**Files:**
- Create: `packages/lint/src/stylelint-recommended.ts`

**Step 1: Write the config file**

```ts
// packages/lint/src/stylelint-recommended.ts
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
    // Chrome 84+ 호환성 체크
    "plugin/no-unsupported-browser-features": [true, {
      severity: "error",
      browsers: ["chrome >= 84"],
    }],
    // @import, url() 파일 존재 체크
    "plugin/no-unresolved-module": true,
  },
};
```

**Step 2: Verify build**

```bash
pnpm typecheck packages/lint
```

**Step 3: Commit**

```bash
git add packages/lint/src/stylelint-recommended.ts && git commit -m "feat(lint): add stylelint-recommended config"
```

---

### Task 4: Update all external references (eslint-plugin → lint)

**Files:**
- Modify: `sd.config.ts` (root, line 13)
- Modify: `eslint.config.ts` (root)
- Modify: `tsconfig.json` (root) — path alias `@simplysm/*`
- Modify: `packages/sd-cli/templates/init/eslint.config.ts.hbs`
- Modify: `packages/sd-cli/templates/init/package.json.hbs`
- Modify: `packages/sd-cli/tests/config-editor.spec.ts`
- Modify: `CLAUDE.md`

**Step 1: sd.config.ts — rename package key**

Line 13: `"eslint-plugin"` → `"lint"`

```ts
"lint": { target: "node", publish: "npm" },
```

**Step 2: eslint.config.ts (root) — update import**

Line 1:
```ts
// Before:
import simplysmRootConfigs from "./packages/eslint-plugin/src/configs/recommended";
// After:
import simplysmRootConfigs from "./packages/lint/src/eslint-recommended";
```

**Step 3: tsconfig.json — verify path alias**

The `@simplysm/*` path alias maps to `packages/*/src/index.ts`. Since we deleted `index.ts`, the subpath exports pattern doesn't use the path alias — consumers import `@simplysm/lint/eslint-recommended` directly. The TypeScript path alias `@simplysm/lint` → `packages/lint/src/index.ts` will no longer resolve (no index.ts), but that's OK because **no code imports `@simplysm/lint` directly** — they always use subpaths.

No change needed in tsconfig.json.

**Step 4: sd-cli template — eslint.config.ts.hbs**

```ts
// Before:
import simplysmPlugin from "@simplysm/eslint-plugin";

export default [
  ...simplysmPlugin.configs.recommended,
];

// After:
import simplysmEslintRecommended from "@simplysm/lint/eslint-recommended";

export default [
  ...simplysmEslintRecommended,
];
```

**Step 5: sd-cli template — package.json.hbs**

Replace `@simplysm/eslint-plugin` with `@simplysm/lint` in devDependencies. Also add `stylelint`:

```json
"@simplysm/lint": "~13.0.1",
"stylelint": "^16.x",
```

Remove: `"@simplysm/eslint-plugin": "~13.0.1",`

**Step 6: sd-cli tests — config-editor.spec.ts**

Lines 118, 136: `@simplysm/eslint-plugin` → `@simplysm/lint/eslint-recommended`
Also update the spread pattern: `...simplysmPlugin.configs.recommended` → `...simplysmEslintRecommended`

The test fixture writes eslint config files. Update those string literals:
```ts
// Before:
'import simplysmPlugin from "@simplysm/eslint-plugin";',
// After:
'import simplysmEslintRecommended from "@simplysm/lint/eslint-recommended";',
```

And update the spread:
```ts
// Before:
"  ...simplysmPlugin.configs.recommended,",
// After:
"  ...simplysmEslintRecommended,",
```

**Step 7: sd-cli config-editor.ts — update addTailwindToEslintConfig**

In `packages/sd-cli/src/utils/config-editor.ts`, the `addTailwindToEslintConfig` function checks for `tailwindcss` in the text — it doesn't reference the package name, so no change needed there.

**Step 8: CLAUDE.md — update references**

Line 66: `| \`eslint-plugin\` | node | ESLint custom rules |` → `| \`lint\` | node | Lint config (ESLint + Stylelint) |`
Line 174: `### ESLint Rules (\`@simplysm/eslint-plugin\`)` → `### ESLint Rules (\`@simplysm/lint\`)`

**Step 9: Run pnpm install to update workspace resolution**

```bash
pnpm install
```

**Step 10: Verify**

```bash
pnpm typecheck packages/lint packages/sd-cli
pnpm vitest packages/lint --run --project=node
pnpm vitest packages/sd-cli --run --project=node
```

**Step 11: Commit**

```bash
git add -A && git commit -m "refactor: update all references from eslint-plugin to lint"
```

---

### Task 5: Add Stylelint to sd-cli lint command

**Files:**
- Modify: `packages/sd-cli/src/commands/lint.ts`
- Modify: `packages/sd-cli/package.json` (add `stylelint` dependency)

**Step 1: Add stylelint dependency to sd-cli**

```bash
cd /home/kslhunter/projects/simplysm
pnpm --filter @simplysm/sd-cli add stylelint
```

**Step 2: Update lint.ts — add Stylelint integration**

Add Stylelint import at top:
```ts
import stylelint from "stylelint";
```

Add Stylelint config file constants:
```ts
const STYLELINT_CONFIG_FILES = ["stylelint.config.ts", "stylelint.config.mts", "stylelint.config.js", "stylelint.config.mjs", ".stylelintrc.json", ".stylelintrc.yml"] as const;
```

Add context fields for Stylelint:
```ts
interface LintContext {
  ignorePatterns: string[];
  files?: string[];
  eslint?: ESLint;
  results?: ESLint.LintResult[];
  // Stylelint
  hasStylelintConfig?: boolean;
  cssFiles?: string[];
  stylelintResults?: stylelint.LintResult[];
}
```

Add helper to detect Stylelint config:
```ts
async function hasStylelintConfig(cwd: string): Promise<boolean> {
  for (const f of STYLELINT_CONFIG_FILES) {
    if (await fsExists(path.join(cwd, f))) return true;
  }
  return false;
}
```

Add Listr tasks after the ESLint autofix task (inside the `new Listr([...])` array):

```ts
{
  title: "Stylelint 설정 확인",
  task: async (ctx, task) => {
    ctx.hasStylelintConfig = await hasStylelintConfig(cwd);
    if (!ctx.hasStylelintConfig) {
      task.skip("stylelint.config 파일 없음");
    }
  },
},
{
  title: "CSS 파일 수집",
  enabled: (ctx) => ctx.hasStylelintConfig === true,
  task: async (ctx, task) => {
    let cssFiles = await fsGlob("**/*.css", {
      cwd,
      ignore: ctx.ignorePatterns,
      nodir: true,
      absolute: true,
    });
    cssFiles = pathFilterByTargets(cssFiles, targets, cwd);
    ctx.cssFiles = cssFiles;
    task.title = `CSS 파일 수집 (${cssFiles.length}개)`;
    if (cssFiles.length === 0) {
      task.skip("린트할 CSS 파일이 없습니다.");
    }
  },
},
{
  title: "Stylelint 실행",
  enabled: (ctx) => (ctx.cssFiles?.length ?? 0) > 0,
  task: async (ctx, task) => {
    const cssFiles = ctx.cssFiles!;
    task.title = `Stylelint 실행 중... (${cssFiles.length}개 파일)`;
    const result = await stylelint.lint({
      files: cssFiles,
      fix,
      cache: true,
      cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
    });
    ctx.stylelintResults = result.results;
  },
},
```

After the ESLint result output section, add Stylelint result output:

```ts
// Stylelint 결과 출력
if (ctx.stylelintResults != null && ctx.stylelintResults.length > 0) {
  const stylelintErrorCount = ctx.stylelintResults.sum((r) => r.warnings.filter((w) => w.severity === "error").length);
  const stylelintWarningCount = ctx.stylelintResults.sum((r) => r.warnings.filter((w) => w.severity === "warning").length);

  if (stylelintErrorCount > 0) {
    logger.error("Stylelint 에러 발생", { errorCount: stylelintErrorCount, warningCount: stylelintWarningCount });
  } else if (stylelintWarningCount > 0) {
    logger.info("Stylelint 완료 (경고 있음)", { errorCount: stylelintErrorCount, warningCount: stylelintWarningCount });
  } else {
    logger.info("Stylelint 완료", { errorCount: stylelintErrorCount, warningCount: stylelintWarningCount });
  }

  // Stylelint formatter 출력
  const stylelintOutput = stylelint.formatters.string(ctx.stylelintResults);
  if (stylelintOutput) {
    process.stdout.write(stylelintOutput);
  }

  if (stylelintErrorCount > 0) {
    process.exitCode = 1;
  }
}
```

Also update the CLI command description in `sd-cli.ts` line 43:
```ts
"ESLint를 실행한다." → "ESLint + Stylelint를 실행한다."
```

**Step 3: Verify build**

```bash
pnpm typecheck packages/sd-cli
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(sd-cli): add Stylelint integration to lint command"
```

---

### Task 6: Add stylelint.config.ts template and root config

**Files:**
- Create: `packages/sd-cli/templates/init/stylelint.config.ts.hbs`
- Create: `stylelint.config.ts` (root)

**Step 1: Create init template**

```ts
// packages/sd-cli/templates/init/stylelint.config.ts.hbs
export { default } from "@simplysm/lint/stylelint-recommended";
```

**Step 2: Create root stylelint.config.ts for the monorepo**

```ts
// stylelint.config.ts
export { default } from "./packages/lint/src/stylelint-recommended";
```

(Same pattern as the root `eslint.config.ts` which imports from local source.)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add stylelint config template and root config"
```

---

### Task 7: Smoke test — run lint on CSS files

**Step 1: Run lint on the whole project**

```bash
pnpm lint
```

Verify:
- ESLint runs as before (no regressions)
- Stylelint detects the root `stylelint.config.ts` and runs on `*.css` files
- No false positives on existing CSS files (Tailwind directives `@tailwind`, `@apply`, `@layer` should be allowed by `stylelint-config-tailwindcss`)

**Step 2: If Stylelint reports issues on existing CSS files**

Evaluate whether they are real issues or false positives:
- Real issues → fix the CSS
- False positives from Tailwind directives → adjust config rules or add `ignoreAtRules`
- Chrome 84 compat warnings on features actually used → evaluate and decide

**Step 3: Run lint on specific CSS package**

```bash
pnpm lint packages/solid
```

**Step 4: Test --fix**

```bash
pnpm lint packages/solid --fix
```

Verify auto-fixable issues are fixed.

**Step 5: Commit any CSS fixes if needed**

```bash
git add -A && git commit -m "fix: resolve Stylelint issues in existing CSS files"
```
